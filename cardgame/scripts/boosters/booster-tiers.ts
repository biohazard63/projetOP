import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeRarity } from '../../src/lib/boosters/rules'
import { isBoosterProduct } from '../../src/lib/boosters/products'

// Draw tiers of every booster product, from the catalogue editions (which product prints which illustration, at which
// rarity), not from Card.setCode: an illustration reprinted in another product belongs to each product it is printed in.
// - standard (C, UC, R, L, SR, SEC): the base illustration, or a reprint (`_r1`) — and, in a PRB, the product's own frame
//   (lowest `_pN` of a number in that PRB, since PRB reprints every card with a new frame);
// - ALT: any other `_pN` illustration of those rarities; SP CARD and TR: their printed rarity;
// - MANGA: only the illustrations listed in src/lib/boosters/manga-rares.json once reviewed (status "validated");
//   MANGA RED: a listed `_p3`, the red manga printed beside the regular `_p2` manga (owner's review, 2026-10-15).
// Writes src/lib/boosters/booster-tiers.json: npx tsx scripts/boosters/booster-tiers.ts
type Edition = { code: string; rarityCodes: string[] }
type Variant = { key: string; number: string; artToken: string; legacyId: string; editions: Edition[] }
type MangaList = { status: 'pending_review' | 'validated'; cards: { key: string; setCode: string }[] }

const STANDARD = ['C', 'UC', 'R', 'L', 'SR', 'SEC']
const catalogPath = resolve('data/onepiece/catalog/master-catalog.json'), mangaPath = resolve('src/lib/boosters/manga-rares.json')
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { variants: Variant[] }
const manga = JSON.parse(readFileSync(mangaPath, 'utf8')) as MangaList
const mangaKeys = new Set(manga.status === 'validated' ? manga.cards.map(c => `${c.key}@${c.setCode}`) : [])
const token = (t: string) => t === 'standard' ? 0 : Number(t.match(/^_p(\d+)$/)?.[1] ?? NaN)

const sets: Record<string, Record<string, string[]>> = {}
const printings = catalog.variants.flatMap(v => v.editions.filter(e => isBoosterProduct(e.code)).map(e => ({ v, code: e.code, rarity: normalizeRarity(e.rarityCodes[0] ?? '') })))
// In a PRB, the lowest `_pN` printed for a number is that product's standard frame.
const prbFrame = new Map<string, number>()
for (const p of printings) if (p.code.startsWith('PRB') && /^_p\d+$/.test(p.v.artToken)) {
  const id = `${p.code}|${p.v.number}`
  prbFrame.set(id, Math.min(prbFrame.get(id) ?? Infinity, token(p.v.artToken)))
}
const unclassified = new Set<string>()
for (const { v, code, rarity } of printings) {
  let tier: string | null
  if (mangaKeys.has(`${v.key}@${code}`)) tier = v.artToken === '_p3' ? 'MANGA RED' : 'MANGA'
  else if (rarity === 'TR' || rarity === 'SP CARD') tier = rarity
  else if (!STANDARD.includes(rarity)) tier = null
  else if (v.artToken === 'standard' || /^_r\d+$/.test(v.artToken)) tier = rarity
  else if (/^_p\d+$/.test(v.artToken)) tier = code.startsWith('PRB') && prbFrame.get(`${code}|${v.number}`) === token(v.artToken) ? rarity : 'ALT'
  else tier = null
  if (!tier) { unclassified.add(`${rarity || '?'}`); continue }
  ;((sets[code] ??= {})[tier] ??= []).push(v.legacyId)
}
for (const tiers of Object.values(sets)) for (const ids of Object.values(tiers)) ids.sort()
const sorted = Object.fromEntries(Object.entries(sets).sort(([a], [b]) => a.localeCompare(b)))
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16)
writeFileSync(resolve('src/lib/boosters/booster-tiers.json'), JSON.stringify({
  version: 1, source: { catalog: hash(catalogPath), manga: hash(mangaPath), mangaStatus: manga.status }, sets: sorted,
}) + '\n')
for (const [code, tiers] of Object.entries(sorted)) console.log(code.padEnd(10), Object.entries(tiers).map(([t, ids]) => `${t}:${ids.length}`).join(' '))
console.log('ignored rarities:', [...unclassified].join(', ') || 'none')
