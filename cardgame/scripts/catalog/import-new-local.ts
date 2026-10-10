import { PrismaClient, Prisma } from '@prisma/client'
import path from 'node:path'
import { digest, identity, parseNumber, type Catalog, type RawCard } from './core'
import { MASTER, ROOT, readJson, walk, writeJson } from './files'
import { readiness } from './readiness'

async function main() {
  const url = process.env.DATABASE_URL || ''
  const target = new URL(url)
  if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.port !== '5432' || target.pathname !== '/cardgame' || !['postgres:', 'postgresql:'].includes(target.protocol) || (target.searchParams.get('schema') || 'public') !== 'public') throw new Error('Import réservé à la base locale cardgame sur le port 5432, schéma public.')
  const apply = process.argv.includes('--apply')
  const source = new Map<string, { raw: RawCard; product: string }>()
  const files = (await walk('carteJson/nouvelle')).filter(f => f.endsWith('.json'))
  for (const file of files) for (const raw of await readJson<RawCard[]>(file)) {
    const key = identity(raw).key
    const old = source.get(key)
    if (old && JSON.stringify(old.raw) !== JSON.stringify(raw)) throw new Error(`Doublon source contradictoire : ${key}`)
    source.set(key, { raw, product: path.basename(path.dirname(file)) })
  }
  const { records, report } = await readiness()
  const catalog = await readJson<Catalog>(MASTER)
  const db = new PrismaClient({ datasourceUrl: url })
  try {
    const result = await db.$transaction(async tx => {
      if (apply) await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(782135104)')
      else await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      const existing = await tx.card.findMany({ orderBy: { id: 'asc' } })
      const sets = new Set((await tx.cardSet.findMany()).map(s => s.code))
      const keys = new Map<string, string>()
      for (const card of existing) { try { keys.set(identity(card).key, card.id) } catch { /* Unrelated legacy fixtures remain untouched. */ } }
      const ids = new Set(existing.map(c => c.id))
      const allSource = process.argv.includes('--all-source')
      const sourceRecords = [...source].map(([variantKey, { raw, product }]) => {
        const nullable = (field: string) => typeof raw[field] === 'string' && raw[field] !== '-' && raw[field] !== '' ? String(raw[field]) : null
        const types: Record<string, string> = { PERSONNAGE: 'CHARACTER', 'ÉVÉNEMENT': 'EVENT', 'ÉVÉNEMENTS': 'EVENT', LIEU: 'STAGE', LEADER: 'LEADER' }
        const colors: Record<string, string> = { Rouge: 'Red', Vert: 'Green', Bleu: 'Blue', Violet: 'Purple', Noir: 'Black', Jaune: 'Yellow' }
        const data: Prisma.CardUncheckedCreateInput = {
          id: String(raw.id), code: String(raw.code), name: String(raw.name),
          type: types[String(raw.type)] || String(raw.type), color: String(raw.color || '').split('/').map(c => colors[c] || c).join('/'),
          cost: parseNumber(raw.cost), power: parseNumber(raw.power), counter: nullable('counter'),
          rarity: String(raw.rarity), imageUrl: String(raw.image), set: nullable('extension'),
          attribute: nullable('attribute'), family: nullable('types'), effect: nullable('effect'), ability: nullable('ability'),
          trigger: nullable('trigger'), notes: nullable('notes'),
          isAltArt: catalog.variants.find(v => v.key === variantKey)?.isAltArt || Boolean(raw.isAltArt),
          isParallel: catalog.variants.find(v => v.key === variantKey)?.isParallel || Boolean(raw.isParallel),
          isSpecial: catalog.variants.find(v => v.key === variantKey)?.isSpecial || Boolean(raw.isSpecial),
        }
        if (!data.id || !data.code || !data.name || !/^https?:\/\//.test(data.imageUrl)) throw new Error(`Fiche source invalide : ${variantKey}`)
        return { variantKey, data, memberships: [product] }
      })
      const ready = allSource ? sourceRecords : records.filter(r => source.has(r.variantKey))
      const skipped: string[] = []; const inserts: Prisma.CardUncheckedCreateInput[] = []
      const missingSets = new Set<string>()
      for (const record of ready) {
        const item = source.get(record.variantKey)!
        if (keys.has(record.variantKey)) { skipped.push(record.variantKey); continue }
        const id = String(item.raw.id || record.data.id)
        if (ids.has(id)) throw new Error(`Identifiant déjà utilisé par une autre variante : ${id}`)
        const variant = catalog.variants.find(v => v.key === record.variantKey)!
        const image = variant.images.find(i => i.source.startsWith('carteJson/nouvelle/') && i.url)?.url || record.data.imageUrl
        if (!sets.has(item.product)) missingSets.add(item.product)
        inserts.push({ ...record.data, id, imageUrl: image, setCode: sets.has(item.product) ? item.product : null, set: String(item.raw.extension || item.product) })
        ids.add(id)
      }
      const playerDigest = async () => digest(JSON.stringify({
        userCards: await tx.userCard.findMany({ orderBy: { id: 'asc' } }), decks: await tx.deck.findMany({ orderBy: { id: 'asc' } }),
        versions: await tx.deckVersion.findMany({ orderBy: { id: 'asc' } }), deckCards: await tx.deckCard.findMany({ orderBy: { id: 'asc' } }),
        openings: await tx.boosterOpening.findMany({ orderBy: { id: 'asc' } }), openingCards: await tx.boosterOpeningCard.findMany({ orderBy: { id: 'asc' } }),
      }))
      const protectedBefore = await playerDigest()
      const plan = { mode: apply ? 'applied-local' : 'dry-run', files: files.length, sourceVariants: source.size,
        insertable: inserts.length, existingPreserved: skipped.length, blocked: allSource ? [] : report.blocked.filter(b => source.has(b.key)),
        missingCardSets: [...missingSets], cardSetsCreated: 0, existingCardsUpdated: 0, userRowsModified: 0,
        cardIdsToCreate: inserts.map(c => c.id), protectedBefore, protectedAfter: protectedBefore, inserted: 0, cardsBefore: existing.length, cardsAfter: existing.length }
      if (apply) {
        await writeJson(path.join(ROOT, `reports/local-backup-before-new-${digest(JSON.stringify(existing)).slice(0, 12)}.json`), { cards: existing })
        const created = await tx.card.createMany({ data: inserts })
        plan.inserted = created.count
        const after = await tx.card.findMany({ where: { id: { in: existing.map(c => c.id) } }, orderBy: { id: 'asc' } })
        if (digest(JSON.stringify(after)) !== digest(JSON.stringify(existing))) throw new Error('Une carte existante a changé : import annulé.')
        plan.cardsAfter = await tx.card.count()
        plan.protectedAfter = await playerDigest()
        if (plan.protectedAfter !== protectedBefore) throw new Error('Références des joueurs modifiées : import annulé.')
      }
      return plan
    }, { timeout: 60000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    await writeJson(path.join(ROOT, 'reports/new-local-import.json'), result)
    console.log(JSON.stringify({ ...result, cardIdsToCreate: undefined, blocked: result.blocked.length }, null, 2))
  } finally { await db.$disconnect() }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : 'Import local interrompu'); process.exitCode = 1 })
