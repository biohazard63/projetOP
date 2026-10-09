import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateBooster, validatePools, weightedIndex, type DrawCard } from '../src/lib/boosters/generator'
import { resolveRules, rulesSchema, legacyDefaultRules, BoosterError } from '../src/lib/boosters/rules'
const card = (id: string, rarity: string, flags = {}): DrawCard => ({ id, rarity, setCode: 'OP-TEST', isAltArt: false, isParallel: false, isSpecial: false, ...flags })
const pool = ['C', 'UC', 'R', 'SR', 'L', 'SEC', 'SP CARD', 'TR'].map(rarity => card(rarity, rarity))
const fixed = resolveRules({ commonCount: 6, uncommonCount: 3, rareCount: 2, superRareCount: 1 }).rules
const rules = (choices: unknown[], specialPacks: unknown[] = []) => rulesSchema.parse({ version: 1, label: 'Synthetic test', source: 'Test fixture; non official', slots: [{ choices }], specialPacks })
function rng(seed: number) { return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 0x100000000 } }
const code = (value: string) => (e: unknown) => e instanceof BoosterError && e.code === value

test('per-set legacy slots generate exactly 6C 3UC 2R 1SR, with legitimate duplicates', () => {
 const draw = generateBooster(pool, 'OP-TEST', fixed, () => .5)
 assert.deepEqual(draw.cards.map(c => c.rarity), [...Array(6).fill('C'), ...Array(3).fill('UC'), 'R', 'R', 'SR'])
 assert.equal(draw.cards.length, 12); assert.equal(draw.specialPack, null)
 assert.ok(draw.cards.every(c => c.setCode === 'OP-TEST'))
})
test('empty and incomplete sets fail instead of silently replacing rarities', () => {
 assert.throws(() => generateBooster([], 'OP-TEST', fixed, () => .5), code('EMPTY_SET'))
 assert.throws(() => generateBooster(pool.filter(c => c.rarity !== 'SR'), 'OP-TEST', fixed, () => .5), code('INCOMPLETE_SET'))
 assert.throws(() => validatePools(pool.slice(0, 4), 'OP-TEST', legacyDefaultRules), code('INCOMPLETE_SET'))
})
test('a card from another extension is rejected, even with a similar alias', () => {
 assert.throws(() => validatePools([...pool, { ...pool[0], setCode: 'OPTEST' }], 'OP-TEST', fixed), code('FOREIGN_CARD'))
})
test('configuration rejects malformed weights, unknown fields and impossible special packs', () => {
 for (const weight of [-1, 0, Infinity, NaN]) assert.throws(() => rules([{ rarity: 'R', weight }]))
 assert.throws(() => resolveRules({ version: 7, slots: [] }), code('INVALID_RULES'))
 assert.throws(() => resolveRules({ commonCount: 0, uncommonCount: 0, rareCount: 0, superRareCount: 0 }), code('INVALID_RULES'))
 assert.throws(() => rules([{ rarity: 'R', weight: 1, unexpected: true }]))
 assert.throws(() => rules([{ rarity: 'R', weight: 1 }], [{ label: 'Too large', probability: .8, slots: fixed.slots }, { label: 'Too frequent', probability: .8, slots: fixed.slots }]))
})
test('weighted choice boundaries and zero-weight cards', () => {
 assert.equal(weightedIndex([0, 1, 3, 0], () => 0), 1)
 assert.equal(weightedIndex([0, 1, 3, 0], () => .25), 2)
 assert.equal(weightedIndex([0, 1, 3, 0], () => .999999), 2)
 for (const bad of [1, -1, NaN]) assert.throws(() => weightedIndex([1], () => bad), code('INVALID_RANDOM'))
 for (const weights of [[0], [-1, 2], [NaN], [Infinity], []]) assert.throws(() => weightedIndex(weights, () => .5), code('INVALID_WEIGHTS'))
})
test('configured rarity and card probabilities hold over 40000 draws', () => {
 const configuration = rules([{ rarity: 'R', weight: 3 }, { rarity: 'SR', weight: 1 }])
 const cards = [card('R1', 'R'), card('R2', 'R'), card('SR', 'SR')]
 const weights = new Map([['R1', 1], ['R2', 3], ['SR', 1]])
 const counts = new Map<string, number>(); const random = rng(42)
 for (let n = 0; n < 40000; n++) { const id = generateBooster(cards, 'OP-TEST', configuration, random, weights).cards[0].id; counts.set(id, (counts.get(id) || 0) + 1) }
 for (const [id, expected] of [['R1', .1875], ['R2', .5625], ['SR', .25]] as const) assert.ok(Math.abs(counts.get(id)! / 40000 - expected) < .01, `${id}: ${counts.get(id)}`)
})
test('variants are explicit pools; standard excludes alternative, parallel and special cards', () => {
 const cards = [card('normal', 'R'), card('R_p1', 'R'), card('parallel', 'R', { isParallel: true }), card('special', 'R', { isSpecial: true })]
 for (const [variant, expected] of [['standard', 'normal'], ['alt', 'R_p1'], ['parallel', 'parallel'], ['special', 'special']]) assert.equal(generateBooster(cards, 'OP-TEST', rules([{ rarity: 'R', weight: 1, variant }]), () => .5).cards[0].id, expected)
 assert.throws(() => validatePools([cards[0]], 'OP-TEST', rules([{ rarity: 'R', weight: 1, variant: 'alt' }])), code('INCOMPLETE_SET'))
})
test('special packs replace all slots; configured 10% probability and required pools verified', () => {
 const configuration = rules([{ rarity: 'C', weight: 1 }], [{ label: 'Test special', probability: .1, slots: [{ choices: [{ rarity: 'SR', weight: 1 }] }] }])
 assert.equal(generateBooster(pool, 'OP-TEST', configuration, () => 0).specialPack, 'Test special')
 assert.equal(generateBooster(pool, 'OP-TEST', configuration, () => .1).specialPack, null)
 assert.throws(() => validatePools(pool.filter(c => c.rarity !== 'SR'), 'OP-TEST', configuration), code('INCOMPLETE_SET'))
 let hits = 0; const random = rng(7)
 for (let n = 0; n < 20000; n++) if (generateBooster(pool, 'OP-TEST', configuration, random).specialPack) hits++
 assert.ok(Math.abs(hits / 20000 - .1) < .01)
})
test('historical God Pack retains explicit 1% occurrence with all 12 cards rare', () => {
 const draw = generateBooster(pool, 'OP-TEST', legacyDefaultRules, () => 0)
 assert.equal(draw.specialPack, 'God Pack (simulation)'); assert.equal(draw.cards.length, 12)
 assert.ok(draw.cards.every(c => ['SR', 'L', 'SEC', 'SP CARD', 'TR'].includes(c.rarity)))
 assert.equal(generateBooster(pool, 'OP-TEST', legacyDefaultRules, () => .01).specialPack, null)
})
test('BoosterCard zero weights exclude cards and missing/negative values fail', () => {
 const cards = [card('one', 'R'), card('two', 'R')]; const config = rules([{ rarity: 'R', weight: 1 }])
 assert.equal(generateBooster(cards, 'OP-TEST', config, () => 0, new Map([['one', 0], ['two', 1]])).cards[0].id, 'two')
 assert.throws(() => validatePools(cards, 'OP-TEST', config, new Map([['one', 1]])), code('INVALID_WEIGHTS'))
 assert.throws(() => validatePools(cards, 'OP-TEST', config, new Map([['one', 0], ['two', 0]])), code('INCOMPLETE_SET'))
})
test('legacy variant chances are disclosed instead of silently applied or claimed official', () => {
 const resolved = resolveRules({ commonCount: 6, uncommonCount: 3, rareCount: 2, superRareCount: 1, altArtChance: .1 })
 assert.equal(resolved.rules.slots.length, 12); assert.equal(resolved.warnings.length, 1)
 assert.match(resolved.rules.source, /non officielle/)
 assert.deepEqual(resolveRules(null).rules, legacyDefaultRules)
})

test('every available extension in the actual read-only inventory supports its configured slots', async () => {
 const { readFile } = await import('node:fs/promises')
 const inventory = JSON.parse(await readFile('../docs/boosters/database-inventory.json', 'utf8')) as { sets: { code: string }[]; cards: { setCode: string; rarity: string }[]; rules: { code: string; boosterRules: unknown }[] }
 let available = 0; let blocked = 0
 for (const set of inventory.sets) {
  const row = inventory.rules.find(r => r.code === set.code || r.code === set.code.replace(/-/g, ''))
  const cards = inventory.cards.filter(c => c.setCode === set.code).map(c => card(`${set.code}-${c.rarity}`, c.rarity, { setCode: set.code }))
  try {
   const configuration = resolveRules(row?.boosterRules).rules
   const draw = generateBooster(cards, set.code, configuration, rng(42))
   assert.equal(draw.cards.length, configuration.slots.length)
   assert.ok(draw.cards.every(c => c.setCode === set.code)); available++
  } catch (e) { assert.ok(e instanceof BoosterError && ['EMPTY_SET', 'INCOMPLETE_SET'].includes(e.code)); blocked++ }
 }
 assert.equal(available, 28); assert.equal(blocked, 18)
})

test('booster illustrations differ per extension, preserve configured artwork and normalize aliases', async () => {
 const { getBoosterArtwork } = await import('../src/lib/boosters/artwork')
 assert.notEqual(getBoosterArtwork('OP-01', null), getBoosterArtwork('OP-09', null))
 assert.equal(getBoosterArtwork('OP-01', null), getBoosterArtwork('op01', null))
 assert.equal(getBoosterArtwork('OP-01', '/images/custom-pack.png'), '/images/custom-pack.png')
 assert.equal(getBoosterArtwork('UNKNOWN', null), null)
 for (let n = 1; n <= 12; n++) assert.match(getBoosterArtwork(`OP-${String(n).padStart(2, '0')}`, null)!, /\/img_thumbnail\.png$/)
})
