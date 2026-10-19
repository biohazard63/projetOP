import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeRarity } from '../../src/lib/boosters/rules'
import { isBoosterProduct } from '../../src/lib/boosters/products'

// Draw tiers of every booster product, from the catalogue editions (which product prints which illustration, at which
// rarity), not from Card.setCode: an illustration reprinted in another product belongs to each product it is printed in.
// - standard (C, UC, R, L, SR, SEC): the base illustration, or a reprint (`_r1`) — and, in a PRB, the product's own frame
//   (lowest `_pN` of a number in that PRB, since PRB reprints every card with a new frame);
// - ALT: any other `_pN` illustration of those rarities; SP CARD and TR: their printed rarity;
// - MANGA: only the illustrations listed in src/lib/boosters/manga-rares.json once reviewed (status "validated");
//   MANGA RED: a listed `_p3`, the red manga printed beside the regular `_p2` manga (owner's review, 2026-10-15);
// - LEADER ALT: an ALT illustration of a Leader;
// - WANTED, CREW ALT, SP SILVER, SP GOLD, SUPER LEADER, MANGA GOLD (and manga additions): the illustrations listed in
//   src/lib/boosters/alt-rarities.json once reviewed (status "validated"); this list wins over every other rule, and
//   its EXCLUDED entries are left out of that product (the stored image is another product's print);
// - a product with an official list in src/lib/boosters/product-lists/ (status "validated") takes its tiers from it
//   alone (STD = the product's standard print at its rarity); its illustrations belong to that product only, since the
//   database imported them with that product's images;
// - src/lib/boosters/print-fixes.json: official prints added as their own cards (`<illustration>.<product>`), drawn in
//   their product in place of the Bandai identifier whose stored image is another print's;
// - src/lib/boosters/image-mismatches.json: illustrations whose stored image is another print's, never drawn in that product.
// Writes src/lib/boosters/booster-tiers.json: npx tsx scripts/boosters/booster-tiers.ts
type Edition = { code: string; rarityCodes: string[] }
type Variant = { key: string; number: string; artToken: string; legacyId: string; editions: Edition[] }
type MangaList = { status: 'pending_review' | 'validated'; cards: { key: string; setCode: string }[] }
type ProductList = { product: string; status: 'pending_review' | 'validated'; cards: { id: string; rarity: string; tier: string }[] }
type AltList = { status: 'pending_review' | 'validated'; tiers: Record<string, { id: string; setCode: string }[]> }

const STANDARD = ['C', 'UC', 'R', 'L', 'SR', 'SEC']
const catalogPath = resolve('data/onepiece/catalog/master-catalog.json'), mangaPath = resolve('src/lib/boosters/manga-rares.json'), altPath = resolve('src/lib/boosters/alt-rarities.json')
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { variants: Variant[] }
const manga = JSON.parse(readFileSync(mangaPath, 'utf8')) as MangaList
const mangaKeys = new Set(manga.status === 'validated' ? manga.cards.map(c => `${c.key}@${c.setCode}`) : [])
const alt = JSON.parse(readFileSync(altPath, 'utf8')) as AltList
const altTier = new Map(alt.status === 'validated' ? Object.entries(alt.tiers).flatMap(([tier, cards]) => cards.map(c => [`${c.id}@${c.setCode}`, tier] as const)) : [])
const mismatchPath = resolve('src/lib/boosters/image-mismatches.json')
const mismatched = new Set((JSON.parse(readFileSync(mismatchPath, 'utf8')) as { cards: { id: string; setCode: string }[] }).cards.map(c => `${c.id}@${c.setCode}`))
const fixPath = resolve('src/lib/boosters/print-fixes.json')
const fixes = (JSON.parse(readFileSync(fixPath, 'utf8')) as { cards: { id: string; from: string; setCode: string; rarity: string }[] }).cards
const fixFor = new Map(fixes.map(f => [`${f.from}@${f.setCode}`, f.id]))
const listDir = resolve('src/lib/boosters/product-lists')
const listPaths = readdirSync(listDir).filter(f => f.endsWith('.json')).sort().map(f => resolve(listDir, f))
const productLists = listPaths.map(p => JSON.parse(readFileSync(p, 'utf8')) as ProductList).filter(l => l.status === 'validated')
const listed = new Map(productLists.map(l => [l.product, l]))
const claimed = new Set(productLists.flatMap(l => l.cards.map(c => c.id)))
const token = (t: string) => t === 'standard' ? 0 : Number(t.match(/^_p(\d+)$/)?.[1] ?? NaN)

const sets: Record<string, Record<string, string[]>> = {}
const printings = catalog.variants.flatMap(v => v.editions.filter(e => isBoosterProduct(e.code)).map(e => ({ v, code: e.code, rarity: normalizeRarity(e.rarityCodes[0] ?? '') })))
// In a PRB, the lowest `_pN` printed for a number is that product's standard frame.
const prbFrame = new Map<string, number>()
for (const p of printings) if (p.code.startsWith('PRB') && /^_p\d+$/.test(p.v.artToken)) {
  const id = `${p.code}|${p.v.number}`
  prbFrame.set(id, Math.min(prbFrame.get(id) ?? Infinity, token(p.v.artToken)))
}
const unclassified = new Set<string>(), excludedSeen = new Set<string>(), placedKeys = new Set<string>()
for (const { v, code, rarity } of printings) {
  if (listed.has(code) || (claimed.has(v.legacyId) && !fixFor.has(`${v.legacyId}@${code}`))) continue
  let tier: string | null
  if (altTier.has(`${v.legacyId}@${code}`)) tier = altTier.get(`${v.legacyId}@${code}`)!
  else if (mangaKeys.has(`${v.key}@${code}`)) tier = v.artToken === '_p3' ? 'MANGA RED' : 'MANGA'
  else if (rarity === 'TR' || rarity === 'SP CARD') tier = rarity
  else if (!STANDARD.includes(rarity)) tier = null
  else if (v.artToken === 'standard' || /^_r\d+$/.test(v.artToken)) tier = rarity
  else if (/^_p\d+$/.test(v.artToken)) tier = code.startsWith('PRB') && prbFrame.get(`${code}|${v.number}`) === token(v.artToken) ? rarity : rarity === 'L' ? 'LEADER ALT' : 'ALT'
  else tier = null
  if (tier === 'EXCLUDED') { excludedSeen.add(`${v.legacyId}@${code}`); continue }
  if (!tier) { unclassified.add(`${rarity || '?'}`); continue }
  placedKeys.add(`${v.legacyId}@${code}`)
  ;((sets[code] ??= {})[tier] ??= []).push(fixFor.get(`${v.legacyId}@${code}`) ?? v.legacyId)
}
for (const list of productLists) for (const card of list.cards) {
  const tier = card.tier === 'STD' ? normalizeRarity(card.rarity) : card.tier
  if (card.tier === 'STD' && !STANDARD.includes(tier)) { unclassified.add(tier); continue }
  placedKeys.add(`${card.id}@${list.product}`)
  ;((sets[list.product] ??= {})[tier] ??= []).push(fixFor.get(`${card.id}@${list.product}`) ?? card.id)
}
// An added print the catalogue does not place in its product: tier from its official rarity.
for (const fix of fixes) {
  const key = `${fix.from}@${fix.setCode}` as const
  if (placedKeys.has(key) || !isBoosterProduct(fix.setCode)) continue
  const rarity = normalizeRarity(fix.rarity), alternate = /_p\d+$/.test(fix.from)
  const tier = altTier.get(key) ?? (rarity === 'TR' || rarity === 'SP CARD' ? rarity : !STANDARD.includes(rarity) ? null : !alternate ? rarity : rarity === 'L' ? 'LEADER ALT' : 'ALT')
  if (!tier || tier === 'EXCLUDED') { unclassified.add(rarity || '?'); continue }
  placedKeys.add(key)
  ;((sets[fix.setCode] ??= {})[tier] ??= []).push(fix.id)
}
for (const [code, tiers] of Object.entries(sets)) for (const [tier, ids] of Object.entries(tiers)) {
  tiers[tier] = ids.filter(id => !mismatched.has(`${id}@${code}`))
  if (!tiers[tier].length) delete tiers[tier]
}
const placed = new Set([...placedKeys].filter(key => fixFor.has(key) || !mismatched.has(key)))
const missing = [...altTier.keys()].filter(key => !placed.has(key) && !excludedSeen.has(key) && !mismatched.has(key))
if (missing.length) throw new Error(`alt-rarities.json lists illustrations no booster prints: ${missing.join(', ')}`)
for (const tiers of Object.values(sets)) for (const ids of Object.values(tiers)) ids.sort()
const sorted = Object.fromEntries(Object.entries(sets).sort(([a], [b]) => a.localeCompare(b)))
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16)
writeFileSync(resolve('src/lib/boosters/booster-tiers.json'), JSON.stringify({
  version: 1, source: { catalog: hash(catalogPath), manga: hash(mangaPath), mangaStatus: manga.status, alt: hash(altPath), altStatus: alt.status, mismatches: hash(mismatchPath), fixes: hash(fixPath), productLists: Object.fromEntries(listPaths.map(p => [p.split('/').pop()!.replace('.json', ''), hash(p)])) }, sets: sorted,
}) + '\n')
for (const [code, tiers] of Object.entries(sorted)) console.log(code.padEnd(10), Object.entries(tiers).map(([t, ids]) => `${t}:${ids.length}`).join(' '))
console.log('ignored rarities:', [...unclassified].join(', ') || 'none')
