import { createHash, randomInt } from 'node:crypto'
import { Prisma, type PrismaClient, type Card, type CardSet, type SetRules, type BoosterCard, type Booster } from '@prisma/client'
import { BoosterError, normalizeSetCode, resolveRules } from './rules'
import { generateBooster, validatePools } from './generator'
import type { BoosterCatalogItem, OpeningResult } from './types'

type DB = Prisma.TransactionClient
const boosterId = (code: string) => `simulation:${createHash('sha256').update(code).digest('hex')}`
export const getSimulationBoosterId = boosterId
const asJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
const isRare = (card: Card) => ['R', 'SR', 'L', 'SEC', 'SP CARD', 'SR SP', 'TR'].includes(card.rarity.toUpperCase()) || card.isAltArt || card.isParallel || card.isSpecial
function context(set: CardSet, cards: Card[], row: SetRules | null, booster: (Booster & { cards: BoosterCard[] }) | null) {
  if (booster && booster.price !== 0) throw new BoosterError('PAID_BOOSTER_UNSUPPORTED', 'Ce booster exige un droit d’ouverture non configuré. Aucun paiement n’est effectué.', 403)
  const { rules, warnings } = resolveRules(row?.boosterRules)
  const links = booster?.cards || []
  if (links.some(link => !cards.some(card => card.id === link.cardId))) throw new BoosterError('FOREIGN_CARD', 'La configuration BoosterCard référence une autre extension')
  const weights = links.length ? new Map(links.map(link => [link.cardId, link.probability])) : undefined
  const pool = weights ? cards.filter(card => weights.has(card.id)) : cards
  validatePools(pool, set.code, rules, weights)
  return { set, rules, warnings, pool, weights, boosterId: boosterId(set.code) }
}
export async function getBoosterDrawContext(db: DB, requested: string) {
  let set = await db.cardSet.findUnique({ where: { code: requested.trim().toUpperCase() } })
  if (!set) {
    const sets = await db.cardSet.findMany()
    const matches = sets.filter(s => normalizeSetCode(s.code) === normalizeSetCode(requested))
    if (matches.length > 1) throw new BoosterError('AMBIGUOUS_SET', 'Code d’extension ambigu', 409)
    set = matches[0] || null
  }
  if (!set) throw new BoosterError('SET_NOT_FOUND', 'Extension introuvable', 404)
  const [cards, exactRule, normalizedRule, booster] = await Promise.all([
    db.card.findMany({ where: { setCode: set.code }, orderBy: { id: 'asc' } }),
    db.setRules.findUnique({ where: { code: set.code } }),
    db.setRules.findUnique({ where: { code: normalizeSetCode(set.code) } }),
    db.booster.findUnique({ where: { id: boosterId(set.code) }, include: { cards: true } }),
  ])
  return context(set, cards, exactRule || normalizedRule, booster)
}
export async function getBoosterCatalog(db: DB): Promise<BoosterCatalogItem[]> {
  const [sets, cards, rules, boosters] = await Promise.all([
    db.cardSet.findMany({ orderBy: [{ releaseDate: 'desc' }, { code: 'asc' }] }), db.card.findMany(), db.setRules.findMany(), db.booster.findMany({ where: { id: { startsWith: 'simulation:' } }, include: { cards: true } }),
  ])
  return sets.map(set => {
    const setCards = cards.filter(card => card.setCode === set.code)
    const row = rules.find(rule => rule.code === set.code) || rules.find(rule => rule.code === normalizeSetCode(set.code)) || null
    const base = { code: set.code, name: set.name, imageUrl: set.imageUrl, description: set.description, cardCount: setCards.length, mode: 'free-simulation' as const }
    try {
      const ctx = context(set, setCards, row, boosters.find(b => b.id === boosterId(set.code)) || null)
      return { ...base, available: true, error: null, packSize: ctx.rules.slots.length, rules: { label: ctx.rules.label, source: ctx.rules.source, slots: ctx.rules.slots, specialPacks: ctx.rules.specialPacks }, warnings: ctx.warnings }
    } catch (error) {
      if (!(error instanceof BoosterError)) throw error
      return { ...base, available: false, error: error.message, packSize: null, rules: null, warnings: [] }
    }
  })
}
export async function openBooster(db: PrismaClient, userId: string, setCode: string, idempotencyKey: string): Promise<{ opening: OpeningResult; replayed: boolean }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(async tx => {
        // Transaction-scoped PostgreSQL lock serializes all credits for this user across processes.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`booster:${userId}`}, 0))`
        const existing = await tx.boosterOpening.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey } } })
        if (existing) {
          const result = existing.resultSnapshot as unknown as OpeningResult | null
          if (!result || !existing.creditedAt) throw new BoosterError('INVALID_RECEIPT', 'Reçu d’ouverture incomplet', 409)
          const exactSet = await tx.cardSet.findUnique({ where: { code: setCode.trim().toUpperCase() }, select: { code: true } })
          if ((exactSet && exactSet.code !== result.setCode) || normalizeSetCode(result.setCode) !== normalizeSetCode(setCode)) throw new BoosterError('IDEMPOTENCY_CONFLICT', 'Cette clé appartient à une autre extension', 409)
          return { opening: result, replayed: true }
        }
        if (!await tx.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new BoosterError('USER_NOT_FOUND', 'Utilisateur introuvable', 401)
        const ctx = await getBoosterDrawContext(tx, setCode)
        // Existing product is a free simulation: no currency, payment or inventory debit.
        const booster = await tx.booster.upsert({ where: { id: ctx.boosterId }, update: {}, create: { id: ctx.boosterId, name: `Simulation · ${ctx.set.name}`, description: 'Ouverture gratuite du simulateur', price: 0, setCode: ctx.set.code, imageUrl: ctx.set.imageUrl } })
        if (booster.price !== 0) throw new BoosterError('PAID_BOOSTER_UNSUPPORTED', 'Droit d’ouverture non configuré', 403)
        const draw = generateBooster(ctx.pool, ctx.set.code, ctx.rules, () => randomInt(0, 0x100000000) / 0x100000000, ctx.weights)
        const counts = new Map<string, number>()
        const owned = await tx.userCard.findMany({ where: { userId, cardId: { in: draw.cards.map(card => card.id) } }, select: { cardId: true, quantity: true } })
        const quantities = new Map(owned.map(row => [row.cardId, row.quantity]))
        const resultCards = draw.cards.map((card, index) => {
          const quantityBefore = (quantities.get(card.id) || 0) + (counts.get(card.id) || 0)
          counts.set(card.id, (counts.get(card.id) || 0) + 1)
          return { ...card, position: index + 1, quantityBefore, isDuplicate: quantityBefore > 0, isNew: quantityBefore === 0 }
        })
        const created = await tx.boosterOpening.create({ data: { userId, boosterId: booster.id, idempotencyKey, creditedAt: new Date(), rulesSnapshot: asJson({ generatorVersion: 1, sampling: 'with-replacement', rules: ctx.rules, cardWeights: ctx.weights ? Object.fromEntries(ctx.weights) : null }), cards: { create: resultCards.map(card => ({ cardId: card.id, position: card.position })) } } })
        for (const [cardId, quantity] of [...counts].sort(([a], [b]) => a.localeCompare(b))) {
          await tx.userCard.upsert({ where: { userId_cardId: { userId, cardId } }, update: { quantity: { increment: quantity } }, create: { userId, cardId, quantity } })
        }
        const opening: OpeningResult = { id: created.id, boosterId: booster.id, setCode: ctx.set.code, setName: ctx.set.name, openedAt: created.openedAt.toISOString(), creditedAt: created.creditedAt!.toISOString(), cards: resultCards, specialPack: draw.specialPack, rules: { label: ctx.rules.label, source: ctx.rules.source, slotCount: ctx.rules.slots.length }, newCardsCount: resultCards.filter(card => card.isNew).length, hasRareCard: resultCards.some(isRare), legacy: false }
        await tx.boosterOpening.update({ where: { id: created.id }, data: { resultSnapshot: asJson(opening) } })
        return { opening, replayed: false }
      }, { maxWait: 10000, timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code) && attempt < 2) continue
      throw error
    }
  }
  throw new BoosterError('RETRY_EXHAUSTED', 'Réessayez la même ouverture', 503)
}
export async function getOpening(db: DB, userId: string, id: string): Promise<OpeningResult | null> {
  const row = await db.boosterOpening.findFirst({ where: { id, userId }, include: { booster: { include: { cardSet: true } }, cards: { orderBy: { position: 'asc' }, include: { card: true } } } })
  if (!row) return null
  if (row.resultSnapshot) return row.resultSnapshot as unknown as OpeningResult
  return { id: row.id, boosterId: row.boosterId, setCode: row.booster.setCode, setName: row.booster.cardSet.name, openedAt: row.openedAt.toISOString(), creditedAt: row.creditedAt?.toISOString() || null, cards: row.cards.map((entry, index) => ({ ...entry.card, position: index + 1, quantityBefore: null, isDuplicate: null, isNew: null })), rules: null, specialPack: null, newCardsCount: null, hasRareCard: row.cards.some(entry => isRare(entry.card)), legacy: true }
}
