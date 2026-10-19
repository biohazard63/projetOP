import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient, type Card } from '@prisma/client'

// Adds the official prints listed in src/lib/boosters/print-fixes.json as new cards. Insert only: an existing card is
// never modified or removed, so collections, decks and histories are untouched. Each new card copies the card text of
// the existing card with the same Bandai identifier, with the rarity, product and image of the official list.
// Dry run by default (reads only); `--apply` writes. Idempotent: a card already present is skipped.
//   npx tsx scripts/boosters/add-missing-prints.ts            # dry run
//   npx tsx scripts/boosters/add-missing-prints.ts --apply    # writes
type Fix = { id: string; from: string; setCode: string; rarity: string; imageUrl: string }
const apply = process.argv.includes('--apply')
const fixes = (JSON.parse(readFileSync(resolve('src/lib/boosters/print-fixes.json'), 'utf8')) as { cards: Fix[] }).cards
const prisma = new PrismaClient()

async function main() {
  const [sources, existing, sets, rarities] = await Promise.all([
    prisma.card.findMany({ where: { id: { in: fixes.map(f => f.from) } } }),
    prisma.card.findMany({ where: { id: { in: fixes.map(f => f.id) } }, select: { id: true } }),
    prisma.cardSet.findMany({ where: { code: { in: [...new Set(fixes.map(f => f.setCode))] } }, select: { code: true, name: true } }),
    prisma.cardRarity.findMany({ select: { name: true } }),
  ])
  const source = new Map(sources.map(c => [c.id, c])), present = new Set(existing.map(c => c.id))
  const setName = new Map(sets.map(s => [s.code, s.name])), rarityNames = new Set(rarities.map(r => r.name))
  const rows: Card[] = [], problems: string[] = []
  for (const fix of fixes) {
    if (present.has(fix.id)) continue
    const from = source.get(fix.from)
    if (!from) { problems.push(`${fix.id}: carte source ${fix.from} absente`); continue }
    if (!setName.has(fix.setCode)) { problems.push(`${fix.id}: produit ${fix.setCode} absent`); continue }
    rows.push({ ...from, id: fix.id, rarity: fix.rarity, rarityName: rarityNames.has(fix.rarity) ? fix.rarity : null, imageUrl: fix.imageUrl,
      setCode: fix.setCode, set: setName.get(fix.setCode) ?? from.set, isAltArt: /_p\d+$/.test(fix.from), isParallel: false, isSpecial: false })
  }
  console.log(`${fixes.length} impressions listées · ${present.size} déjà présentes · ${rows.length} à ajouter · ${problems.length} problème(s)`)
  for (const p of problems) console.log('  !', p)
  for (const r of rows.slice(0, 5)) console.log(`  + ${r.id} (${r.code}, ${r.rarity}, ${r.setCode}) ${r.imageUrl}`)
  if (!apply) { console.log('Essai à blanc : rien n’a été écrit. Relancer avec --apply pour écrire.'); return }
  if (problems.length) throw new Error('Problèmes à corriger avant d’écrire')
  const { count } = await prisma.card.createMany({ data: rows, skipDuplicates: true })
  console.log(`${count} carte(s) ajoutée(s).`)
}
main().finally(() => prisma.$disconnect())
