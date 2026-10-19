import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import manifest from '../src/lib/boosters/booster-tiers.json'
import { generateBooster, drawIdentity } from '../src/lib/boosters/generator'
import { isBoosterProduct } from '../src/lib/boosters/products'
import { CHASE_TIERS, planDisplay, tierPools, tierRate, tieredRules, DISPLAY_SIZE, type DrawTier } from '../src/lib/boosters/tiers'
import altRarities from '../src/lib/boosters/alt-rarities.json'
import mismatchList from '../src/lib/boosters/image-mismatches.json'
import printFixes from '../src/lib/boosters/print-fixes.json'
import { resaleTier } from '../src/lib/economy/resale'
import economy from '../src/lib/economy/economy.json'

const sets = manifest.sets as Record<string, Partial<Record<DrawTier, string[]>>>
const CHASE = new Set<string>(CHASE_TIERS)
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
  assert.equal(manifest.source.alt, hash('src/lib/boosters/alt-rarities.json'))
  assert.equal(manifest.source.altStatus, altRarities.status)
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

test('Collector tiers keep the owner order: each one is rarer than the one before, silver SP above manga', () => {
  const all = new Set<DrawTier>(CHASE_TIERS.concat(['C', 'UC', 'R', 'L', 'SR', 'SEC']))
  const rules = tieredRules('OP-13', all)
  const rate = (tier: string) => rules.slots.slice(10).reduce((sum, slot) => sum + (slot.choices.find(c => c.rarity === tier)?.weight ?? 0), 0)
  const hits = CHASE_TIERS.filter(tier => tier !== 'ALT' && tier !== 'LEADER ALT')
  for (let i = 1; i < hits.length; i++) assert.ok(rate(hits[i]) < rate(hits[i - 1]), `${hits[i]} rarer than ${hits[i - 1]}`)
  assert.ok(rate('SP SILVER') < rate('MANGA') && rate('MANGA RED') === Math.min(...hits.map(rate)))
  assert.ok(rate('LEADER ALT') < rate('ALT'))
})

test('Every collector tier has a resale value ordered like its rarity', () => {
  const values = economy.resale.values as Record<string, number>
  for (let i = 1; i < CHASE_TIERS.length; i++) assert.ok(values[CHASE_TIERS[i]] > values[CHASE_TIERS[i - 1]], CHASE_TIERS[i])
})

test('A Leader alternate is its own tier, drawn and resold apart from other alternates', () => {
  assert.ok(tierPools('OP-05')!['LEADER ALT']!.includes('OP05-001_p1'))
  assert.ok(!tierPools('OP-05')!.ALT!.includes('OP05-001_p1'))
  assert.equal(resaleTier({ id: 'OP05-001_p1', rarity: 'L', isAltArt: true, isParallel: false }), 'LEADER ALT')
  assert.equal(resaleTier({ id: 'OP13-080_p1', rarity: 'SR', isAltArt: true, isParallel: false }), 'ALT')
  // PRB-01: its standard print resells at its rarity, its reprinted manga as a manga; a gold SP excluded elsewhere keeps its tier.
  assert.equal(resaleTier({ id: 'OP01-120_p1', rarity: 'SEC', isAltArt: true, isParallel: false }), 'SEC')
  assert.equal(resaleTier({ id: 'OP01-120_p3', rarity: 'SEC', isAltArt: true, isParallel: false }), 'MANGA')
  assert.equal(resaleTier({ id: 'OP05-119_p6', rarity: 'SP CARD', isAltArt: true, isParallel: false }), 'SP GOLD')
})

test('The alternate-families list only applies once validated by the owner', () => {
  const listed = Object.entries(altRarities.tiers).flatMap(([tier, cards]) => cards.map(c => ({ ...c, tier })))
  const mismatched = new Set(mismatchList.cards.map(c => `${c.id}@${c.setCode}`))
  for (const card of listed) {
    const fixed = printFixes.cards.find(f => f.from === card.id && f.setCode === card.setCode)?.id
    if (!fixed && mismatched.has(`${card.id}@${card.setCode}`)) continue // classified, but its stored image is another print's
    if (fixed) card.id = fixed // drawn as the print added with its own identifier
    const pools = tierPools(card.setCode)!
    if (card.tier === 'EXCLUDED') assert.ok(!Object.values(pools).flat().includes(card.id), `${card.id} still drawn in ${card.setCode}`)
    else if (altRarities.status === 'validated') assert.ok(pools[card.tier as DrawTier]?.includes(card.id), `${card.id}@${card.setCode} → ${card.tier}`)
    else assert.ok(!pools[card.tier as DrawTier]?.includes(card.id), `${card.id} drawn before review`)
  }
})

test('Drop rates of the collector tiers, product by product, over virtual displays', () => {
  const boxes = 25000
  for (const code of ['OP-03', 'OP-09', 'OP-11', 'OP-12', 'OP-13', 'OP-17', 'OP14-EB04', 'EB-02', 'PRB-01']) {
    const available = new Set(Object.keys(tierPools(code)!) as DrawTier[]), random = seeded(code.length * 97 + 13), counts = new Map<string, number>()
    for (let b = 0; b < boxes; b++) for (const p of planDisplay(available, random)) for (const t of [p.rare, p.hit]) counts.set(t, (counts.get(t) ?? 0) + 1)
    const packs = boxes * DISPLAY_SIZE
    for (const tier of CHASE_TIERS.filter(t => t !== 'ALT')) {
      const seen = counts.get(tier) ?? 0
      if (!available.has(tier)) { assert.equal(seen, 0, `${code}: ${tier} planned though absent`); continue }
      const expected = tierRate(tier) * packs
      // 5 standard deviations of a Poisson count: a wrong rate fails, chance does not.
      assert.ok(Math.abs(seen - expected) < 5 * Math.sqrt(expected), `${code}: ${tier} ${seen} for ${expected.toFixed(0)} expected`)
    }
    assert.equal((counts.get('ALT') ?? 0) / boxes, 2, `${code}: alternates per display`)
  }
})

test('Every collector tier is drawn only in positions 11–12 with its own illustrations', () => {
  for (const code of ['OP-11', 'OP-13', 'OP-17', 'PRB-01']) {
    const cards = pool(code), available = new Set(cards.map(c => c.rarity as DrawTier)), random = seeded(3)
    for (const tier of [...available].filter(t => CHASE.has(t))) {
      const plan = { rare: 'R' as DrawTier, hit: tier }
      const drawn = generateBooster(cards, code, tieredRules(code, available, plan), random).cards
      assert.equal(drawn[11].rarity, tier)
      assert.ok(tierPools(code)![tier]!.includes(drawn[11].id), `${code}: ${drawn[11].id} under ${tier}`)
      drawn.slice(0, 10).forEach(card => assert.ok(!CHASE.has(card.rarity), `${code}: ${card.rarity} before position 11`))
    }
  }
})

test('PRB-01 follows the official list: one standard print per number, its reprinted manga apart', async () => {
  const list = (await import('../src/lib/boosters/product-lists/PRB-01.json')).default
  const prb = tierPools('PRB-01')!
  // Official standard prints: 23 C, 25 UC, 20 R, 25 SR, 6 SEC, 1 L (the 8 SR / SEC numbers reprinted only as manga apart).
  assert.deepEqual([prb.C, prb.UC, prb.R, prb.SR, prb.SEC, prb.L].map(ids => ids!.length), [23, 25, 20, 25, 6, 1])
  assert.equal(prb.MANGA!.length, 10)
  assert.equal(list.cards.length, 319)
  const standard = list.cards.filter(c => c.tier === 'STD').map(c => c.id.split('_')[0])
  assert.equal(new Set(standard).size, standard.length, 'one standard print per number')
  for (const [code, tiers] of Object.entries(sets)) if (code !== 'PRB-01') for (const ids of Object.values(tiers)) for (const id of ids) assert.ok(!list.cards.some(c => c.id === id), `${id} drawn in ${code} with the PRB-01 image`)
})

test('Resale values follow the owner multipliers on the alternate (×1 = 400 ฿)', () => {
  const values = economy.resale.values as Record<string, number>
  const multipliers: Record<string, number> = { ALT: 1, 'LEADER ALT': 2, 'SP CARD': 3, WANTED: 4, TR: 6, MANGA: 10, 'CREW ALT': 15, 'SP SILVER': 20, 'SUPER LEADER': 30, 'SP GOLD': 45, 'MANGA GOLD': 60, 'MANGA RED': 80 }
  for (const [tier, m] of Object.entries(multipliers)) assert.equal(values[tier], 400 * m, tier)
})

test('God Packs: 1 in 3 000 eligible boosters, exact composition, only in eligible products', async () => {
  const { GOD_PACK_RATE, godPack, rollGodPack } = await import('../src/lib/boosters/tiers')
  const prb = godPack('PRB-01')!, op13 = godPack('OP-13')!
  // PRB-01: its 10 reprinted manga, every one of them; OP-13: the five Elders (demon art) and Imu's alternate Leader.
  assert.deepEqual([...prb.cards].sort(), [...tierPools('PRB-01')!.MANGA!].sort())
  assert.equal(prb.cards.length, 10)
  assert.deepEqual(op13.cards, ['OP13-080_p2', 'OP13-083_p2', 'OP13-084_p2', 'OP13-089_p2', 'OP13-091_p2', 'OP13-079_p1'])
  for (const [code, pack] of [['PRB-01', prb], ['OP-13', op13]] as const) {
    const ids = Object.values(tierPools(code)!).flat()
    for (const id of pack.cards) assert.ok(ids.includes(id), `${code}: ${id} not drawable`)
    assert.equal(new Set(pack.cards).size, pack.cards.length)
  }
  for (const code of ['OP-01', 'OP-09', 'OP-17', 'EB-02']) assert.equal(godPack(code), null, code)
  const packs = 600000
  for (const code of ['PRB-01', 'OP-13']) {
    const random = seeded(code.length * 31 + 7)
    let hits = 0
    for (let i = 0; i < packs; i++) if (rollGodPack(code, random)) hits++
    const expected = packs * GOD_PACK_RATE
    assert.ok(Math.abs(hits - expected) < 5 * Math.sqrt(expected), `${code}: ${hits} God Packs for ${expected} expected`)
  }
  const random = seeded(5)
  for (let i = 0; i < 100000; i++) assert.equal(rollGodPack('OP-05', random), null)
})

test('A God Pack bought in a display only replaces a pack planned without collector', async () => {
  const { godPackSlots } = await import('../src/lib/boosters/tiers')
  const available = new Set(Object.keys(tierPools('OP-13')!) as DrawTier[]), random = seeded(17)
  for (let b = 0; b < 2000; b++) {
    const plan = planDisplay(available, random), slots = godPackSlots(plan, 1 + (b % 3), random)
    assert.equal(slots.length, 1 + (b % 3))
    for (const i of slots) assert.ok(!CHASE.has(plan[i].rare) && !CHASE.has(plan[i].hit), `pack ${i} holds ${plan[i].rare}/${plan[i].hit}`)
    // The display keeps its 2 alternates and every planned collector.
    const kept = plan.filter((_, i) => !slots.includes(i)).flatMap(p => [p.rare, p.hit])
    assert.equal(kept.filter(t => t === 'ALT').length, 2)
    assert.equal(kept.filter(t => CHASE.has(t)).length, plan.flatMap(p => [p.rare, p.hit]).filter(t => CHASE.has(t)).length)
  }
})

test('No product draws an illustration whose stored image is another print', async () => {
  const mismatches = (await import('../src/lib/boosters/image-mismatches.json')).default
  assert.ok(mismatches.cards.length > 0)
  for (const { id, setCode } of mismatches.cards) assert.ok(!Object.values(tierPools(setCode) ?? {}).flat().includes(id), `${id} drawn in ${setCode}`)
  assert.equal(manifest.source.mismatches, createHash('sha256').update(readFileSync('src/lib/boosters/image-mismatches.json')).digest('hex').slice(0, 16))
})

test('Packs bought one by one, by 5 or by 10 walk through virtual displays: every display keeps its 2 alternates', async () => {
  const { nextDisplayPacks } = await import('../src/lib/boosters/service')
  // In-memory stand-in for the two virtualDisplay queries the function uses.
  type Box = { id: string; userId: string; setCode: string; size: number; plan: unknown; nextIndex: number; completedAt: Date | null; rulesVersion: string }
  const boxes: Box[] = []
  const tx = { virtualDisplay: {
    findFirst: async ({ where }: { where: { userId: string; setCode: string } }) => boxes.find(b => b.userId === where.userId && b.setCode === where.setCode && !b.completedAt) ?? null,
    create: async ({ data }: { data: Omit<Box, 'id' | 'nextIndex' | 'completedAt'> }) => { const box = { ...data, id: `box-${boxes.length}`, nextIndex: 0, completedAt: null }; boxes.push(box); return box },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Box> }) => Object.assign(boxes.find(b => b.id === where.id)!, data),
  } }
  for (const code of ['OP-13', 'PRB-01']) {
    const available = new Set(Object.keys(tierPools(code)!) as DrawTier[])
    const ctx = { set: { code }, available } as never
    const random = seeded(11), opened = new Map<string, { index: number; plan: { rare: string; hit: string } }[]>()
    let total = 0
    while (total < 24 * 40) {
      const count = [1, 5, 10][Math.floor(random() * 3)]
      for (const pack of await nextDisplayPacks(tx as never, 'user', ctx, count)) {
        const list = opened.get(pack!.id) ?? []; list.push(pack!); opened.set(pack!.id, list)
      }
      total += count
    }
    const full = [...opened.values()].filter(list => list.length === 24)
    assert.ok(full.length >= 39, `${code}: ${full.length} complete displays`)
    for (const list of full) {
      assert.deepEqual(list.map(p => p.index), Array.from({ length: 24 }, (_, i) => i), 'each pack of a display opened once, in order')
      assert.equal(list.filter(p => p.plan.rare === 'ALT').length + list.filter(p => p.plan.hit === 'ALT').length, 2, `${code}: 2 alternates per display`)
    }
    assert.ok(boxes.filter(b => b.setCode === code && !b.completedAt).length <= 1, 'one open display per product')
  }
})

test('Every added official print is drawn in its product under its own identifier, never under the old one', () => {
  assert.ok(printFixes.cards.length > 0)
  for (const fix of printFixes.cards) {
    const ids = Object.values(tierPools(fix.setCode) ?? {}).flat()
    assert.ok(ids.includes(fix.id), `${fix.id} not drawn in ${fix.setCode}`)
    assert.ok(!ids.includes(fix.from), `${fix.from} still drawn in ${fix.setCode} with another print's image`)
    assert.match(fix.imageUrl, /^https:\/\/(en|fr)\.onepiece-cardgame\.com\/images\/cardlist\/card\/[A-Z0-9-]+(_[pr]\d+)?\.(png|webp)$/)
    assert.equal(fix.id, `${fix.from}.${fix.setCode.replace(/-/g, '')}`)
  }
  assert.equal(new Set(printFixes.cards.map(f => f.id)).size, printFixes.cards.length)
  assert.equal(manifest.source.fixes, createHash('sha256').update(readFileSync('src/lib/boosters/print-fixes.json')).digest('hex').slice(0, 16))
  // The gold Shanks of OP-13 is its added print; the old identifier (another print) resells at its printed rarity.
  assert.equal(resaleTier({ id: 'OP09-004_p4.OP13', rarity: 'SP CARD', isAltArt: true, isParallel: false }), 'SP GOLD')
  assert.equal(resaleTier({ id: 'OP09-004_p4', rarity: 'SR', isAltArt: true, isParallel: false }), 'ALT')
})
