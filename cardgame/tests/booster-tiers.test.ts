import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import manifest from '../src/lib/boosters/booster-tiers.json'
import { generateBooster, drawIdentity } from '../src/lib/boosters/generator'
import { isBoosterProduct } from '../src/lib/boosters/products'
import { tierPools, tieredRules, type DrawTier } from '../src/lib/boosters/tiers'

const sets = manifest.sets as Record<string, Partial<Record<DrawTier, string[]>>>
const CHASE = new Set(['ALT', 'SP CARD', 'TR', 'MANGA', 'MANGA RED'])
function seeded(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0x100000000 } }
function pool(code: string) {
  return Object.entries(tierPools(code)!).flatMap(([tier, ids]) => ids.map(id => ({ id, code: id.replace(/_[pr]\d+$/i, ''), setCode: code, rarity: tier, isAltArt: false, isParallel: false, isSpecial: false })))
}
function simulate(code: string, packs: number) {
  const cards = pool(code), rules = tieredRules(code, new Set(cards.map(c => c.rarity as DrawTier))), random = seeded(42)
  const counts = new Map<string, number>()
  for (let i = 0; i < packs; i++) {
    const drawn = generateBooster(cards, code, rules, random).cards
    assert.equal(drawn.length, 12)
    assert.equal(new Set(drawn.map(drawIdentity)).size, 12, 'one number at most once per pack')
    drawn.forEach((card, position) => {
      if (position < 10) assert.ok(!CHASE.has(card.rarity), `${code}: ${card.rarity} at position ${position + 1}`)
      if (position >= 10) counts.set(card.rarity, (counts.get(card.rarity) ?? 0) + 1)
    })
  }
  return (tier: string) => (counts.get(tier) ?? 0) / packs
}

test('The tier manifest is regenerated from the current catalogue and manga list', () => {
  const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16)
  assert.equal(manifest.source.catalog, hash('data/onepiece/catalog/master-catalog.json'))
  assert.equal(manifest.source.manga, hash('src/lib/boosters/manga-rares.json'))
})

test('Every manifest product is an openable booster and lists each illustration under one tier', () => {
  for (const [code, tiers] of Object.entries(sets)) {
    assert.ok(isBoosterProduct(code), code)
    const ids = Object.values(tiers).flat()
    assert.equal(new Set(ids).size, ids.length, `${code}: illustration in two tiers`)
  }
})

test('Alternates only appear in positions 11–12, at about two per 24-pack display', () => {
  for (const code of ['OP-05', 'OP-13', 'EB-01']) {
    const rate = simulate(code, 3000)
    // 1/36 (rare slot) + 1/18 (hit slot) = 1/12 per pack, i.e. 2 per display.
    assert.ok(Math.abs(rate('ALT') * 24 - 2) < 0.4, `${code}: ${rate('ALT') * 24} alternates per display`)
    assert.ok(Math.abs(rate('SR') - 7 / 24) < 0.03, `${code}: SR ${rate('SR')}`)
    assert.ok(rate('MANGA') < 0.02, `${code}: manga ${rate('MANGA')}`)
  }
})

test('A tier absent from a product gives its share to the standard rare of the slot', () => {
  const rules = tieredRules('OP-01', new Set(['C', 'UC', 'R', 'L', 'SR', 'SEC', 'ALT']))
  const hit = rules.slots[11].choices
  assert.deepEqual(hit.map(c => c.rarity), ['R', 'SR', 'SEC', 'ALT'])
  assert.ok(Math.abs(hit.reduce((sum, c) => sum + c.weight, 0) - 1) < 1e-9)
  assert.equal(rules.slots.length, 12)
})

test('PRB keeps its own frame as standard and stays drawable', () => {
  const rate = simulate('PRB-01', 1000)
  assert.ok(rate('ALT') < 0.15, `PRB-01 alternates per pack ${rate('ALT')}`)
})

test('A virtual display holds exactly 2 alternates, 7 SR and 8 Leaders; rarer tiers keep their long-run rate', async () => {
  const { planDisplay, DISPLAY_SIZE } = await import('../src/lib/boosters/tiers')
  const available = new Set<DrawTier>(['C', 'UC', 'R', 'L', 'SR', 'SEC', 'ALT', 'SP CARD', 'TR', 'MANGA'])
  const random = seeded(7), totals = new Map<string, number>(), boxes = 3000
  for (let b = 0; b < boxes; b++) {
    const plan = planDisplay(available, random)
    assert.equal(plan.length, DISPLAY_SIZE)
    const count = (tier: string) => plan.filter(p => p.rare === tier).length + plan.filter(p => p.hit === tier).length
    assert.equal(count('ALT'), 2); assert.equal(count('SR'), 7); assert.equal(count('L'), 8)
    assert.equal(count('MANGA RED'), 0, 'absent tier never planned')
    for (const tier of ['SEC', 'SP CARD', 'TR', 'MANGA']) totals.set(tier, (totals.get(tier) ?? 0) + count(tier))
  }
  const perPack = (tier: string) => totals.get(tier)! / (boxes * DISPLAY_SIZE)
  assert.ok(Math.abs(perPack('SEC') - 1 / 36) < 0.004, `SEC ${perPack('SEC')}`)
  assert.ok(Math.abs(perPack('SP CARD') - 1 / 96) < 0.002, `SP ${perPack('SP CARD')}`)
  assert.ok(Math.abs(perPack('MANGA') - 1 / 288) < 0.001, `MANGA ${perPack('MANGA')}`)
})

test('A planned pack forces its rare and hit tiers', () => {
  const rules = tieredRules('OP-05', new Set(['C', 'UC', 'R', 'L', 'SR', 'SEC', 'ALT']), { rare: 'L', hit: 'ALT' })
  assert.deepEqual(rules.slots[10].choices.map(c => c.rarity), ['L'])
  assert.deepEqual(rules.slots[11].choices.map(c => c.rarity), ['ALT'])
})
