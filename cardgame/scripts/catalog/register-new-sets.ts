import { PrismaClient } from '@prisma/client'
import path from 'node:path'
import { digest, identity, type RawCard } from './core'
import { readJson, walk, writeJson } from './files'

async function main() {
  const url = process.env.DATABASE_URL || ''
  const target = new URL(url)
  const local = ['localhost', '127.0.0.1'].includes(target.hostname) && target.port === '5432' && target.pathname === '/cardgame'
  const test = target.hostname === '127.0.0.1' && target.port === '55432' && target.pathname === '/op_boosters_test'
  if ((!local && !test) || (target.searchParams.get('schema') || 'public') !== 'public') throw new Error('Base locale autorisée uniquement.')
  const db = new PrismaClient({ datasourceUrl: url })
  const groups = new Map<string, RawCard[]>()
  for (const file of (await walk('carteJson/nouvelle')).filter(f => f.endsWith('.json'))) groups.set(path.basename(path.dirname(file)), await readJson<RawCard[]>(file))
  try {
    const result = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(782135104)')
      const playerHash = async () => digest(JSON.stringify({
        collection: await tx.userCard.findMany({ orderBy: { id: 'asc' } }), decks: await tx.deck.findMany({ orderBy: { id: 'asc' } }),
        deckCards: await tx.deckCard.findMany({ orderBy: { id: 'asc' } }), versions: await tx.deckVersion.findMany({ orderBy: { id: 'asc' } }),
        openings: await tx.boosterOpening.findMany({ orderBy: { id: 'asc' } }), openingCards: await tx.boosterOpeningCard.findMany({ orderBy: { id: 'asc' } }),
      }))
      const before = await playerHash()
      const cards = await tx.card.findMany()
      const byKey = new Map<string, typeof cards[number]>()
      for (const card of cards) { try { byKey.set(identity(card).key, card) } catch { /* Unrelated legacy/synthetic rows are preserved. */ } }
      const sets = []
      for (const [code, rows] of groups) {
        const name = String(rows[0]?.extension || code).replace(/^Extension\s*-\s*/i, '').replace(/\s*\[[^\]]+\]\s*$/, '').replace(/-$/, '').trim() || code
        await tx.cardSet.upsert({ where: { code }, update: {}, create: { code, name, releaseDate: null, description: 'Catalogue français importé. Date de sortie non renseignée.' } })
        let linked = 0; let preservedReprints = 0
        for (const raw of rows) {
          const card = byKey.get(identity(raw).key)
          if (!card) continue
          if (card.setCode && card.setCode !== code) { preservedReprints++; continue }
          if (card.setCode === code) continue
          await tx.card.update({ where: { id: card.id }, data: { setCode: code } })
          linked++
        }
        sets.push({ code, linked, preservedReprints, total: await tx.card.count({ where: { setCode: code } }) })
      }
      const after = await playerHash()
      if (before !== after) throw new Error('Données joueurs modifiées : transaction annulée.')
      return { target: test ? 'isolated-test' : 'local-cardgame', sets, playerHashBefore: before, playerHashAfter: after, rulesChanged: 0 }
    }, { timeout: 60000 })
    await writeJson(`../docs/catalog/evidence/register-new-sets-${test ? 'test' : 'local'}.json`, result)
    console.log(JSON.stringify(result, null, 2))
  } finally { await db.$disconnect() }
}
void main().catch(e => { console.error(e instanceof Error ? e.message : 'Enregistrement interrompu'); process.exitCode = 1 })
