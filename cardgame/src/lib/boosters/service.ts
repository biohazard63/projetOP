import { createHash, randomInt, randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient, type Card, type CardSet, type SetRules, type BoosterCard, type Booster } from '@prisma/client'
import { BoosterError, hasExplicitRules, normalizeSetCode, normalizeRarity, resolveRules, type BoosterRules } from './rules'
import { generateBooster, validatePools, metadataVariant } from './generator'
import { getBoosterArtwork } from './artwork'
import type { BoosterCatalogItem, OpeningResult } from './types'
import { isBoosterProduct } from './products'
import { DISPLAY_SIZE, TIER_RATES_VERSION, godPackSlots, planDisplay, rollGodPack, tierPools, tieredRules, type DrawTier, type GodPack, type PackPlan } from './tiers'
import tierManifest from './booster-tiers.json'
import { currentEconomy } from '@/lib/economy/settings'
import { postMany as postBerries } from '@/lib/economy/ledger'

type DB = Prisma.TransactionClient
const boosterId = (code: string) => `simulation:${createHash('sha256').update(code).digest('hex')}`
export const getSimulationBoosterId = boosterId
const asJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
const isRare = (card: Card) => ['R', 'SR', 'L', 'SEC', 'SP CARD', 'TR'].includes(normalizeRarity(card.rarity)) || card.isAltArt || card.isParallel || card.isSpecial
function context(set: CardSet, cards: Card[], row: SetRules | null, booster: (Booster & { cards: BoosterCard[] }) | null) {
  if (!isBoosterProduct(set.code)) throw new BoosterError('NOT_A_BOOSTER', 'Ce produit est consultable dans Extensions, mais ne peut pas être ouvert comme un booster.', 403)
  if (booster && booster.price !== 0) throw new BoosterError('PAID_BOOSTER_UNSUPPORTED', 'Ce booster exige un droit d’ouverture non configuré. Aucun paiement n’est effectué.', 403)
  const links = booster?.cards || []
  // Tiered realistic packs replace the historical counts/default profiles; an explicit v1 configuration or
  // BoosterCard weights stay authoritative. Each card is drawn under its tier in this product.
  const tiers = tierPools(set.code)
  if (tiers && !links.length && !hasExplicitRules(row?.boosterRules)) {
    const byId = new Map(cards.map(card => [card.id, card]))
    const pool = Object.entries(tiers).flatMap(([tier, ids]) => ids.filter(id => byId.has(id)).map(id => ({ ...byId.get(id)!, setCode: set.code, rarity: tier, isAltArt: false, isParallel: false, isSpecial: false, drawTier: tier as DrawTier })))
    const rules = tieredRules(set.code, new Set(pool.map(card => card.drawTier)))
    validatePools(pool, set.code, rules)
    return { set, rules, warnings: [] as string[], pool, weights: undefined, boosterId: boosterId(set.code), originals: byId, tiered: true, available: new Set(pool.map(card => card.drawTier)) as ReadonlySet<DrawTier> | null }
  }
  const { rules, warnings } = resolveRules(row?.boosterRules)
  if (links.some(link => !cards.some(card => card.id === link.cardId))) throw new BoosterError('FOREIGN_CARD', 'La configuration BoosterCard référence une autre extension')
  const weights = links.length ? new Map(links.map(link => [link.cardId, link.probability])) : undefined
  const pool = weights ? cards.filter(card => weights.has(card.id)) : cards
  validatePools(pool, set.code, rules, weights)
  return { set, rules, warnings, pool: pool.map(card => ({ ...card, drawTier: undefined as DrawTier | undefined })), weights, boosterId: boosterId(set.code), originals: null as Map<string, Card> | null, tiered: false, available: null as ReadonlySet<DrawTier> | null }
}
const tierIds = (code: string) => Object.values(tierPools(code) ?? {}).flat()
export async function getBoosterDrawContext(db: DB, requested: string, proposedRules?: BoosterRules) {
  if (!isBoosterProduct(requested)) throw new BoosterError('NOT_A_BOOSTER', 'Ce produit ne peut pas être ouvert comme un booster.', 403)
  let set = await db.cardSet.findUnique({ where: { code: requested.trim().toUpperCase() } })
  if (!set) {
    const sets = await db.cardSet.findMany()
    const matches = sets.filter(s => normalizeSetCode(s.code) === normalizeSetCode(requested))
    if (matches.length > 1) throw new BoosterError('AMBIGUOUS_SET', 'Code d’extension ambigu', 409)
    set = matches[0] || null
  }
  if (!set) throw new BoosterError('SET_NOT_FOUND', 'Extension introuvable', 404)
  const [cards, exactRule, normalizedRule, booster] = await Promise.all([
    db.card.findMany({ where: { OR: [{ setCode: set.code }, { id: { in: tierIds(set.code) } }] }, orderBy: { id: 'asc' } }),
    db.setRules.findUnique({ where: { code: set.code } }),
    db.setRules.findUnique({ where: { code: normalizeSetCode(set.code) } }),
    db.booster.findUnique({ where: { id: boosterId(set.code) }, include: { cards: true } }),
  ])
  const existing = exactRule || normalizedRule
  const row = proposedRules ? { ...(existing ?? { id: 'preview', code: set.code, rarityCounts: {}, typeCounts: {}, createdAt: new Date(), updatedAt: new Date(), name: null, releaseDate: null }), boosterRules: asJson(proposedRules) as Prisma.JsonValue } : existing
  return context(set, cards, row, booster)
}
export async function getBoosterCatalog(db: DB): Promise<BoosterCatalogItem[]> {
  const [sets, cards, rules, boosters] = await Promise.all([
    db.cardSet.findMany({ orderBy: [{ releaseDate: 'desc' }, { code: 'asc' }] }), db.card.findMany(), db.setRules.findMany(), db.booster.findMany({ where: { id: { startsWith: 'simulation:' } }, include: { cards: true } }),
  ])
  return sets.map(set => {
    const ids = new Set(tierIds(set.code)), setCards = cards.filter(card => card.setCode === set.code || ids.has(card.id))
    const row = rules.find(rule => rule.code === set.code) || rules.find(rule => rule.code === normalizeSetCode(set.code)) || null
    const base = { code: set.code, name: set.name, imageUrl: getBoosterArtwork(set.code, set.imageUrl), description: set.description, cardCount: setCards.filter(card => card.setCode === set.code).length, mode: 'free-simulation' as const }
    try {
      const ctx = context(set, setCards, row, boosters.find(b => b.id === boosterId(set.code)) || null)
      return { ...base, available: true, error: null, packSize: ctx.rules.slots.length, rules: { label: ctx.rules.label, source: ctx.rules.source, slots: ctx.rules.slots, specialPacks: ctx.rules.specialPacks, packProfiles: ctx.rules.packProfiles, selection: ctx.rules.selection, variantPolicy: ctx.rules.variantPolicy }, warnings: ctx.warnings }
    } catch (error) {
      if (!(error instanceof BoosterError)) throw error
      return { ...base, available: false, error: error.message, packSize: null, rules: null, warnings: [] }
    }
  })
}
type DrawContext = Awaited<ReturnType<typeof getBoosterDrawContext>>
type DisplayPack = { id: string; index: number; plan: PackPlan }
const random = () => randomInt(0, 0x100000000) / 0x100000000
/** The next packs of the player's open box for this product (a new box is planned whenever one is used up). */
export async function nextDisplayPacks(tx: DB, userId: string, ctx: DrawContext, count: number): Promise<(DisplayPack | null)[]> {
  if (!ctx.available) return Array.from({ length: count }, () => null)
  const packs: DisplayPack[] = []
  let box = await tx.virtualDisplay.findFirst({ where: { userId, setCode: ctx.set.code, completedAt: null } })
  while (packs.length < count) {
    box ??= await tx.virtualDisplay.create({ data: { userId, setCode: ctx.set.code, size: DISPLAY_SIZE, plan: asJson(planDisplay(ctx.available, random)), rulesVersion: TIER_RATES_VERSION } })
    const plan = box.plan as unknown as PackPlan[], take = Math.min(count - packs.length, box.size - box.nextIndex)
    for (let i = 0; i < take; i++) packs.push({ id: box.id, index: box.nextIndex + i, plan: plan[box.nextIndex + i] })
    const next = box.nextIndex + take, full = next >= box.size
    // Closed before the next box is created (one open box per product and player).
    await tx.virtualDisplay.update({ where: { id: box.id }, data: { nextIndex: next, completedAt: full ? new Date() : null } })
    box = full ? null : { ...box, nextIndex: next }
  }
  return packs
}
async function replay(tx: DB, setCode: string, existing: { resultSnapshot: Prisma.JsonValue; creditedAt: Date | null }) {
  const result = existing.resultSnapshot as unknown as OpeningResult | null
  if (!result || !existing.creditedAt) throw new BoosterError('INVALID_RECEIPT', 'Reçu d’ouverture incomplet', 409)
  const exactSet = await tx.cardSet.findUnique({ where: { code: setCode.trim().toUpperCase() }, select: { code: true } })
  if ((exactSet && exactSet.code !== result.setCode) || normalizeSetCode(result.setCode) !== normalizeSetCode(setCode)) throw new BoosterError('IDEMPOTENCY_CONFLICT', 'Cette clé appartient à une autre extension', 409)
  return result
}
/**
 * Openings inside the caller's transaction (user lock already held), one per key, credited with bulk writes: a
 * display of 24 costs a few queries instead of hundreds. Keys already credited are replayed. A display purchase
 * passes its own packs and payment (`prepaid`), the packs being then free.
 */
async function creditOpenings(tx: DB, userId: string, setCode: string, keys: string[], prepaid?: { ctx: DrawContext; packs: DisplayPack[]; paymentId: string }): Promise<{ openings: OpeningResult[]; replayed: boolean }> {
  const existing = new Map((await tx.boosterOpening.findMany({ where: { userId, idempotencyKey: { in: keys } }, select: { idempotencyKey: true, resultSnapshot: true, creditedAt: true } })).map(row => [row.idempotencyKey!, row]))
  const replays = new Map<string, OpeningResult>()
  for (const [key, row] of existing) replays.set(key, await replay(tx, setCode, row))
  const fresh = keys.filter(key => !existing.has(key))
  if (!fresh.length) return { openings: keys.map(key => replays.get(key)!), replayed: true }
  if (!await tx.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new BoosterError('USER_NOT_FOUND', 'Utilisateur introuvable', 401)
  const ctx = prepaid?.ctx ?? await getBoosterDrawContext(tx, setCode)
  // Paid in Berries (game currency, never real money), debited in the same transaction as the credit: the packs
  // and their payment exist together or not at all; a replay of the same key pays nothing more.
  const economy = await currentEconomy(tx)
  const payments = prepaid ? fresh.map(() => prepaid.paymentId) : await postBerries(tx, userId, fresh.map(key => ({ amount: -economy.prices.booster, reason: 'BOOSTER_PURCHASE' as const, key: `booster:${key}`, details: { setCode: ctx.set.code } })))
  // God Packs are rolled first, one roll per booster, and only granted when every card is in this product's pool.
  const poolIds = new Set(ctx.pool.map(card => card.id))
  const rolled = fresh.map(() => ctx.tiered ? rollGodPack(ctx.set.code, random) : null).map(god => god && god.cards.every(id => poolIds.has(id)) ? god : null)
  // Tiered products come from a virtual display: the rare and hit slots follow the box plan (when still drawable).
  // A God Pack bought singly uses no pack of the display; in a display purchase it replaces a pack without collector.
  let packs: (DisplayPack | null)[], gods: (GodPack | null)[]
  if (prepaid) {
    const slots = godPackSlots(prepaid.packs.map(p => p.plan), rolled.filter(Boolean).length, random), granted = rolled.filter(Boolean)
    packs = prepaid.packs; gods = packs.map((_, n) => slots.includes(n) ? granted[slots.indexOf(n)]! : null)
  } else {
    const reserved = await nextDisplayPacks(tx, userId, ctx, rolled.filter(god => !god).length)
    packs = rolled.map(god => god ? null : reserved.shift()!); gods = rolled
  }
  const booster = await tx.booster.upsert({ where: { id: ctx.boosterId }, update: {}, create: { id: ctx.boosterId, name: `Simulation · ${ctx.set.name}`, description: 'Ouverture gratuite du simulateur', price: 0, setCode: ctx.set.code, imageUrl: ctx.set.imageUrl } })
  if (booster.price !== 0) throw new BoosterError('PAID_BOOSTER_UNSUPPORTED', 'Droit d’ouverture non configuré', 403)
  const draws = packs.map((pack, n) => {
    const god = gods[n]
    // A God Pack holds its own cards only, in its exact composition.
    if (god) return { pack, planned: false, god: god.label, draw: { cards: god.cards.map(id => ({ ...ctx.pool.find(card => card.id === id)!, godPack: true as const })), specialPack: null, profile: null } }
    const planned = Boolean(pack && ctx.available?.has(pack.plan.rare) && ctx.available.has(pack.plan.hit))
    return { pack, planned, god: null, draw: generateBooster(ctx.pool, ctx.set.code, planned ? tieredRules(ctx.set.code, ctx.available!, pack!.plan) : ctx.rules, random, ctx.weights) }
  })
  const owned = await tx.userCard.findMany({ where: { userId, cardId: { in: [...new Set(draws.flatMap(d => d.draw.cards.map(card => ctx.originals?.get(card.id)?.id ?? card.id)))] } }, select: { cardId: true, quantity: true } })
  const quantities = new Map(owned.map(row => [row.cardId, row.quantity])), counts = new Map<string, number>()
  const start = Date.now(), creditedAt = new Date(start), rows: Prisma.BoosterOpeningCreateManyInput[] = [], links: Prisma.BoosterOpeningCardCreateManyInput[] = []
  const credited = draws.map(({ pack, planned, draw, god }, n) => {
    // Drawn under its tier, credited and shown as the real catalogue card; earlier packs of the batch count as owned.
    const resultCards = draw.cards.map(({ drawTier, ...drawn }, index) => {
      const card = ctx.originals?.get(drawn.id) ?? drawn
      const quantityBefore = (quantities.get(card.id) || 0) + (counts.get(card.id) || 0)
      counts.set(card.id, (counts.get(card.id) || 0) + 1)
      return { ...card, ...(ctx.rules.variantPolicy === 'metadata' ? { drawVariant: metadataVariant(card) } : {}), ...(drawTier ? { drawTier } : {}), ...('godPack' in drawn ? { godPack: true } : {}), position: index + 1, quantityBefore, isDuplicate: quantityBefore > 0, isNew: quantityBefore === 0 }
    })
    // One millisecond apart: the history keeps the order of the batch.
    const id = randomUUID(), openedAt = new Date(start + n)
    const opening: OpeningResult = { id, boosterId: booster.id, setCode: ctx.set.code, setName: ctx.set.name, openedAt: openedAt.toISOString(), creditedAt: creditedAt.toISOString(), cards: resultCards, specialPack: draw.specialPack, rules: { label: draw.profile ? `${ctx.rules.label} · ${draw.profile}` : ctx.rules.label, source: ctx.rules.source, slotCount: ctx.rules.slots.length }, newCardsCount: resultCards.filter(card => card.isNew).length, hasRareCard: resultCards.some(isRare), legacy: false, godPack: god }
    rows.push({ id, userId, boosterId: booster.id, idempotencyKey: fresh[n], berryTransactionId: payments[n], ...(pack ? { displayId: pack.id, displayIndex: pack.index } : {}), openedAt, creditedAt, resultSnapshot: asJson(opening), rulesSnapshot: asJson({ generatorVersion: ctx.tiered ? 4 : ctx.rules.selection === 'number' ? 3 : 2, ...(ctx.tiered ? { tierRates: TIER_RATES_VERSION, tierManifest: tierManifest.source } : {}), ...(pack ? { display: { id: pack.id, index: pack.index, plan: planned ? pack.plan : null } } : {}), ...(god ? { godPack: { label: god, cards: draw.cards.map(card => card.id) } } : {}), sampling: 'without-replacement-by-card-number', selection: ctx.rules.selection || 'card', selectedProfile: draw.profile || null, rules: ctx.rules, cardWeights: ctx.weights ? Object.fromEntries(ctx.weights) : null }) })
    links.push(...resultCards.map(card => ({ boosterOpeningId: id, cardId: card.id, position: card.position })))
    return [fresh[n], opening] as const
  })
  await tx.boosterOpening.createMany({ data: rows })
  await tx.boosterOpeningCard.createMany({ data: links })
  const added = [...counts].sort(([a], [b]) => a.localeCompare(b))
  await tx.$executeRaw`INSERT INTO "UserCard" ("id", "userId", "cardId", "quantity", "createdAt", "updatedAt")
    SELECT gen_random_uuid()::text, ${userId}, c.card, c.qty, now(), now() FROM unnest(${added.map(([id]) => id)}::text[], ${added.map(([, q]) => q)}::int[]) AS c(card, qty)
    ON CONFLICT ("userId", "cardId") DO UPDATE SET "quantity" = "UserCard"."quantity" + EXCLUDED."quantity", "updatedAt" = now()`
  const byKey = new Map([...replays, ...credited])
  return { openings: keys.map(key => byKey.get(key)!), replayed: false }
}
async function inUserTransaction<T>(db: PrismaClient, userId: string, timeout: number, run: (tx: DB) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(async tx => {
        // Transaction-scoped PostgreSQL lock serializes all credits for this user across processes.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`booster:${userId}`}, 0))`
        return run(tx)
      }, { maxWait: 10000, timeout, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code) && attempt < 2) continue
      throw error
    }
  }
  throw new BoosterError('RETRY_EXHAUSTED', 'Réessayez la même ouverture', 503)
}
export async function openBooster(db: PrismaClient, userId: string, setCode: string, idempotencyKey: string): Promise<{ opening: OpeningResult; replayed: boolean }> {
  const { openings: [opening], replayed } = await inUserTransaction(db, userId, 20000, tx => creditOpenings(tx, userId, setCode, [idempotencyKey]))
  return { opening, replayed }
}
export const BATCH_SIZES = [1, 5, 10, DISPLAY_SIZE] as const
/**
 * Several boosters at once, all credited or none: each one stays its own opening (key `<batch key>#n`), replayable.
 * 1, 5 or 10 packs are bought one by one from the open box; DISPLAY_SIZE buys a whole new display at its price.
 */
export async function openBoosters(db: PrismaClient, userId: string, setCode: string, batchKey: string, count: number): Promise<{ openings: OpeningResult[]; replayed: boolean }> {
  if (!(BATCH_SIZES as readonly number[]).includes(count)) throw new BoosterError('INVALID_REQUEST', 'Nombre de boosters invalide', 400)
  const keys = Array.from({ length: count }, (_, n) => `${batchKey}#${n + 1}`)
  return inUserTransaction(db, userId, 30000, async tx => {
    if (count !== DISPLAY_SIZE || await tx.boosterOpening.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: keys[0] } }, select: { id: true } })) return creditOpenings(tx, userId, setCode, keys)
    const ctx = await getBoosterDrawContext(tx, setCode)
    if (!ctx.available) throw new BoosterError('DISPLAY_UNAVAILABLE', 'Cette extension ne se vend pas en display', 422)
    const [paymentId] = await postBerries(tx, userId, [{ amount: -(await currentEconomy(tx)).prices.display, reason: 'DISPLAY_PURCHASE', key: `display:${batchKey}`, details: { setCode: ctx.set.code } }])
    const plan = planDisplay(ctx.available, random)
    // Opened entirely in this transaction: the box is closed at once and never blocks the box of single packs.
    const box = await tx.virtualDisplay.create({ data: { userId, setCode: ctx.set.code, size: DISPLAY_SIZE, plan: asJson(plan), nextIndex: DISPLAY_SIZE, completedAt: new Date(), rulesVersion: TIER_RATES_VERSION } })
    return creditOpenings(tx, userId, setCode, keys, { ctx, packs: plan.map((p, index) => ({ id: box.id, index, plan: p })), paymentId })
  })
}
export async function getOpening(db: DB, userId: string, id: string): Promise<OpeningResult | null> {
  const row = await db.boosterOpening.findFirst({ where: { id, userId }, include: { booster: { include: { cardSet: true } }, cards: { orderBy: { position: 'asc' }, include: { card: true } } } })
  if (!row) return null
  if (row.resultSnapshot) return row.resultSnapshot as unknown as OpeningResult
  return { id: row.id, boosterId: row.boosterId, setCode: row.booster.setCode, setName: row.booster.cardSet.name, openedAt: row.openedAt.toISOString(), creditedAt: row.creditedAt?.toISOString() || null, cards: row.cards.map((entry, index) => ({ ...entry.card, position: index + 1, quantityBefore: null, isDuplicate: null, isNew: null })), rules: null, specialPack: null, newCardsCount: null, hasRareCard: row.cards.some(entry => isRare(entry.card)), legacy: true }
}
