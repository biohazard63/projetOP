import fs from 'node:fs/promises'
import path from 'node:path'
import { Prisma, PrismaClient } from '@prisma/client'
import { digest, isEnglish, type Catalog, stableJson, TEXT_FIELDS, validateCatalog, weakProvenance } from './core'
import { ROOT, writeJson } from './files'

export function assertLocalDatabase(url: string, testOnly = false) {
  const u = new URL(url)
  if (!['postgres:', 'postgresql:'].includes(u.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) throw new Error('Base distante refusée : fournir un export de cartes autorisé. Aucune connexion effectuée.')
  if (testOnly && (u.hostname !== '127.0.0.1' || u.port !== '55432' || u.pathname !== '/op_boosters_test')) throw new Error('Écriture autorisée uniquement sur 127.0.0.1:55432/op_boosters_test')
}
export async function snapshotLocalDatabase(db: PrismaClient) {
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
    const cards = await tx.card.findMany({ orderBy: { id: 'asc' } })
    const sets = await tx.cardSet.findMany({ orderBy: { code: 'asc' } })
    const references = {
      userCards: await tx.userCard.groupBy({ by: ['cardId'], _count: true, _sum: { quantity: true } }),
      deckCards: await tx.deckCard.groupBy({ by: ['cardId'], _count: true, _sum: { quantity: true } }),
      openingCards: await tx.boosterOpeningCard.groupBy({ by: ['cardId'], _count: true }),
    }
    return { cards, sets, references, readOnly: true }
  }, { timeout: 30000, isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  await writeJson(path.join(ROOT, 'sources/local-database.json'), { cards: result.cards, sets: result.sets, readOnly: true })
  await writeJson(path.join(ROOT, 'reports/database-references.json'), { readOnly: true, cards: result.cards.length, sets: result.sets.map(s => ({ code: s.code, name: s.name })), references: result.references, note: 'Aucun compte, email, identifiant utilisateur ou contenu de deck exporté.' })
  return { cards: result.cards.length, extensions: result.sets.length }
}
export async function prepareSchema(db: PrismaClient) {
  const statements = (await fs.readFile('scripts/catalog/schema.sql', 'utf8')).split(';').map(s => s.trim()).filter(Boolean)
  await db.$transaction(async tx => { for (const statement of statements) await tx.$executeRawUnsafe(statement) })
}
export async function previewImport(db: PrismaClient, catalog: Catalog) {
  const legacy = await db.card.findMany({ select: { id: true, code: true, setCode: true } })
  const cards = new Map(legacy.map(c => [c.id, c]))
  const available = await db.$queryRaw<{ table: string | null }[]>`SELECT to_regclass('"CatalogVariant"')::text AS "table"`
  const existing = available[0]?.table ? await db.$queryRawUnsafe<{ key: string; digest: string; payload: Catalog['variants'][number] }[]>('SELECT "key", "digest", "payload" FROM "CatalogVariant"') : []
  const old = new Map(existing.map(v => [v.key, v.digest]))
  const oldPayload = new Map(existing.map(v => [v.key, v.payload]))
  const existingEditions = available[0]?.table ? await db.$queryRawUnsafe<{ code: string }[]>('SELECT "code" FROM "CatalogEdition"') : []
  const existingLinks = available[0]?.table ? await db.$queryRawUnsafe<{ variantKey: string; editionCode: string }[]>('SELECT "variantKey", "editionCode" FROM "CatalogMembership"') : []
  const links = new Set(existingLinks.map(m => `${m.variantKey}\0${m.editionCode}`))
  const priorAliases = available[0]?.table ? await db.$queryRawUnsafe<{ cardId: string; variantKey: string }[]>('SELECT "cardId", "variantKey" FROM "CatalogLegacyLink"') : []
  const collisions: unknown[] = []; const mapped: unknown[] = []; const byAlias = new Map<string, Set<string>>()
  for (const v of catalog.variants) for (const id of v.legacyIds) { const keys = byAlias.get(id) || new Set<string>(); keys.add(v.key); byAlias.set(id, keys) }
  for (const [id, keys] of byAlias) {
    const card = cards.get(id); if (!card) continue
    if (keys.size !== 1 || catalog.variants.find(v => v.key === [...keys][0])?.number !== card.code || priorAliases.some(link => link.cardId === id && !keys.has(link.variantKey))) collisions.push({ legacyId: id, keys: [...keys], existingNumber: card.code })
    else mapped.push({ legacyId: id, variantKey: [...keys][0], preservedSetCode: card.setCode })
  }
  const schemaErrors = validateCatalog(catalog)
  return {
    target: 'Additive staging catalogue uniquement ; aucune modification du catalogue servi par l’application.',
    schemaPresent: !!available[0]?.table, schemaErrors,
    identitiesToCreate: catalog.cards.filter(c => !existing.some(v => v.key.startsWith(`${c.number}::`))).map(c => c.number),
    variantsToCreate: catalog.variants.filter(v => !old.has(v.key)).map(v => v.key),
    variantsToUpdate: catalog.variants.filter(v => old.has(v.key) && old.get(v.key) !== digest(stableJson(mergeVariant(oldPayload.get(v.key)!, v)))).map(v => v.key),
    extensionsToCreate: catalog.extensions.filter(e => !existingEditions.some(x => x.code === e.code)).map(e => e.code),
    associationsToAdd: catalog.variants.flatMap(v => v.extensions.filter(e => !links.has(`${v.key}\0${e}`)).map(e => ({ variantKey: v.key, extension: e }))),
    legacyMappings: mapped, conflicts: collisions,
    missingTranslations: catalog.variants.flatMap(v => TEXT_FIELDS.filter(f => v.text[f].original && !v.text[f].fr).map(field => ({ key: v.key, field }))),
    legacyCardRowsCreated: 0, legacyCardRowsUpdated: 0, playerRowsAffected: 0,
    unmappedDatabaseCards: legacy.filter(c => !byAlias.has(c.id)).map(c => c.id),
  }
}
export async function importCatalog(db: PrismaClient, catalog: Catalog, injectFailureAfter?: number) {
  const structural = validateCatalog(catalog).filter(e => !e.startsWith('unassigned_variant:'))
  if (structural.length) throw new Error(`Import refusé : ${structural.slice(0, 5).join(', ')}`)
  const hash = digest(stableJson(catalog))
  return db.$transaction(async tx => {
    // Serializes concurrent imports without locking or updating any player table.
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext('mugiwara-catalog-import'))")
    const completed = await tx.$queryRawUnsafe<{ digest: string }[]>('SELECT "digest" FROM "CatalogImportRun" WHERE "digest"=$1', hash)
    if (completed.length) return { replayed: true, digest: hash }
    const existingCards = new Map((await tx.card.findMany({ select: { id: true, code: true } })).map(c => [c.id, c.code]))
    const aliases = new Map<string, Set<string>>(); for (const v of catalog.variants) for (const id of v.legacyIds) { const keys = aliases.get(id) || new Set<string>(); keys.add(v.key); aliases.set(id, keys) }
    for (const c of catalog.cards) await tx.$executeRawUnsafe('INSERT INTO "CatalogIdentity" ("number") VALUES ($1) ON CONFLICT DO NOTHING', c.number)
    for (const e of catalog.extensions) await tx.$executeRawUnsafe('INSERT INTO "CatalogEdition" ("code","family","name") VALUES ($1,$2,$3::jsonb) ON CONFLICT ("code") DO UPDATE SET "name"=EXCLUDED."name", "family"=EXCLUDED."family"', e.code, e.family, JSON.stringify(e.name))
    let processed = 0
    for (const v of catalog.variants) {
      const prior = await tx.$queryRawUnsafe<{ payload: Catalog['variants'][number] }[]>('SELECT "payload" FROM "CatalogVariant" WHERE "key"=$1', v.key)
      // Importing a partial file cannot remove earlier memberships/images/originals.
      const merged = prior.length ? mergeVariant(prior[0].payload, v) : v
      await tx.$executeRawUnsafe('INSERT INTO "CatalogVariant" ("key","number","artToken","payload","digest") VALUES ($1,$2,$3,$4::jsonb,$5) ON CONFLICT ("key") DO UPDATE SET "payload"=EXCLUDED."payload", "digest"=EXCLUDED."digest"', v.key, v.number, v.artToken, JSON.stringify(merged), digest(stableJson(merged)))
      await tx.$executeRawUnsafe('INSERT INTO "CatalogMembership" ("variantKey","editionCode") SELECT $1, value FROM jsonb_array_elements_text($2::jsonb) ON CONFLICT DO NOTHING', v.key, JSON.stringify(v.extensions))
      await tx.$executeRawUnsafe('INSERT INTO "CatalogImage" ("variantKey","key","payload") SELECT $1, value->>\'key\', value FROM jsonb_array_elements($2::jsonb) ON CONFLICT ("variantKey","key") DO UPDATE SET "payload"=EXCLUDED."payload"', v.key, JSON.stringify(merged.images))
      await tx.$executeRawUnsafe('INSERT INTO "CatalogTranslation" ("variantKey","field","payload") SELECT $1, key, value FROM jsonb_each($2::jsonb) ON CONFLICT ("variantKey","field") DO UPDATE SET "payload"=EXCLUDED."payload"', v.key, JSON.stringify(merged.text))
      for (const id of v.legacyIds) if (existingCards.get(id) === v.number && aliases.get(id)?.size === 1) {
        const existing = await tx.$queryRawUnsafe<{ variantKey: string }[]>('SELECT "variantKey" FROM "CatalogLegacyLink" WHERE "cardId"=$1', id)
        if (existing.some(link => link.variantKey !== v.key)) continue
        await tx.$executeRawUnsafe('INSERT INTO "CatalogLegacyLink" ("cardId","variantKey") VALUES ($1,$2) ON CONFLICT DO NOTHING', id, v.key)
      }
      if (++processed === injectFailureAfter) throw new Error('Injected catalogue failure')
    }
    const counts = { identities: catalog.cards.length, variants: catalog.variants.length, extensions: catalog.extensions.length, legacyRowsModified: 0 }
    await tx.$executeRawUnsafe('INSERT INTO "CatalogImportRun" ("digest","counts") VALUES ($1,$2::jsonb)', hash, JSON.stringify(counts))
    return { replayed: false, digest: hash, counts }
  }, { timeout: 120000, maxWait: 120000 })
}
function mergeVariant(old: Catalog['variants'][number], next: Catalog['variants'][number]) {
  const merged = structuredClone(next)
  merged.extensions = [...new Set([...old.extensions, ...next.extensions])].sort()
  merged.legacyIds = [...new Set([...old.legacyIds, ...next.legacyIds])].sort()
  merged.sources = [...new Set([...old.sources, ...next.sources])].sort()
  merged.images = [...new Map([...old.images, ...next.images].map(i => [i.key, i])).values()]
  const editions = new Map((old.editions || []).map(e => [e.key, structuredClone(e)]))
  for (const e of next.editions || []) {
    const prior = editions.get(e.key)
    editions.set(e.key, prior ? { ...e, rarityCodes: [...new Set([...prior.rarityCodes, ...e.rarityCodes])], sources: [...new Set([...prior.sources, ...e.sources])], productNames: [...new Set([...(prior.productNames || []), ...(e.productNames || [])])] } : e)
  }
  merged.editions = [...editions.values()]
  const rank = { official: 4, validated: 3, machine: 2, review_required: 1 }
  for (const field of TEXT_FIELDS) {
    const a = structuredClone(old.text[field]); const b = next.text[field]
    if (a.translationStatus === 'official' && weakProvenance(a.source)) a.translationStatus = 'review_required'
    if (a.fr && isEnglish(a.fr)) a.fr = null
    if (a.fr && (!b.fr || rank[a.translationStatus] > rank[b.translationStatus])) merged.text[field] = structuredClone(a)
    merged.text[field].originals = [...new Map([...a.originals, ...b.originals].map(c => [`${c.original}\0${c.source}`, c])).values()]
  }
  for (const field of ['cost','power','counter','life'] as const) merged[field] ??= old[field]
  return merged
}
