import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { adaptCard, canonicalNumber, consolidateDefinitions, numericCharacteristic } from '../src/game/cards/adapter'
import { resolveLeaderLife, type LifeEvidence } from '../src/game/cards/leaderLife'
import { catalogCardInput } from '../src/game/cards/catalogAdapter'
import { REVIEWED_CARDS } from '../src/game/cards/reviewedCards'
import { validateEngineDeck, type Ruleset } from '../src/game/rulesets/decks'
import { M0_RULESET } from '../src/game/rulesets/m0'
import { parseOfficialLife } from '../scripts/game/leader-life'
import type { CardInput } from '../src/game/cards/types'
import type { Catalog } from '../scripts/catalog/core'

const source = 'https://en.onepiece-cardgame.com/cardlist/?series=569001'
const life: LifeEvidence[] = [{ value: 5, field: 'life', source, language: 'en', checkedAt: '2026-10-10' }]
function input(number = 'ST01-001'): CardInput {
  const facts = structuredClone(REVIEWED_CARDS[number])
  return { number, printingKey: `${number}::standard`, databaseIds: ['existing-cuid'], extensions: ['ST-01'], ...facts, life: facts.category === 'LEADER' ? 5 : null, lifeEvidence: facts.category === 'LEADER' ? life : [] }
}
function accepted(value: CardInput) { const result = adaptCard(value); if (!result.ok) assert.fail(result.errors.join()); return result.card }
// Rules comprehensive v1.2.1 §§2-9, 5-2: Life printed on the Leader, never inferred from cost/colour.
test('Leader Life has explicit official provenance and no fallback, including zero vs absent', () => {
  assert.equal(accepted(input()).definition.life, 5)
  assert.equal(resolveLeaderLife([{ ...life[0], field: 'cost' }]).status, 'missing')
  assert.equal(resolveLeaderLife([{ ...life[0], language: 'local' }]).status, 'missing')
  assert.equal(resolveLeaderLife([{ ...life[0], value: 4 }, life[0]]).status, 'ambiguous')
  assert.equal(resolveLeaderLife([{ ...life[0], value: 0 }]).life, 0)
  for (const value of [null, undefined, '', 'five']) assert.equal(adaptCard({ ...input(), life: value }).ok, false)
  assert.equal(adaptCard({ ...input(), lifeEvidence: [] }).ok, false)
  assert.equal(adaptCard({ ...input(), life: 4 }).ok, false)
})
test('Canonical numbers and artwork identities stay distinct; arbitrary suffixes rejected', () => {
  assert.equal(canonicalNumber('op-01-001_p2'), 'OP01-001')
  assert.equal(canonicalNumber('P-011_p1'), 'P-011')
  for (const id of ['OP01-001_foo', 'OP01-001::standard', 'fake', 'OP1-1']) assert.equal(canonicalNumber(id), null)
  const a = accepted(input()), b = accepted({ ...input(), printingKey: 'ST01-001::_p1', databaseIds: ['other-cuid'], extensions: ['PRB-01'] })
  assert.equal(a.definition.definitionId, b.definition.definitionId)
  assert.notEqual(a.printing.printingKey, b.printing.printingKey)
  assert.deepEqual(a.printing.databaseIds, ['existing-cuid']); assert.deepEqual(b.printing.databaseIds, ['other-cuid'])
  assert.equal(adaptCard({ ...input(), printingKey: 'ST02-001::standard' }).ok, false)
})
// §§2-3, 5-1-2: all component colours of a multi-colour card matter.
test('Multicolour Leaders support French and English without accepting unknown colours', () => {
  assert.deepEqual(accepted({ ...input(), colors: 'Rouge/Vert' }).definition.colors, ['GREEN', 'RED'])
  assert.deepEqual(accepted({ ...input(), colors: ['Red', 'Green', 'Red'] }).definition.colors, ['GREEN', 'RED'])
  assert.equal(adaptCard({ ...input(), colors: 'Red/Magenta' }).ok, false)
})
test('Unknown characteristics are rejected and zero is preserved without coercing strings', () => {
  assert.equal(numericCharacteristic('0'), 0); assert.equal(numericCharacteristic(null), null)
  for (const value of [false, '3x', '1.5', -1, NaN, Infinity]) assert.equal(numericCharacteristic(value), 'INVALID')
  assert.equal(accepted({ ...input('ST01-003'), cost: 0, power: 0, counter: 0 }).definition.cost, 0)
  for (const missing of [{ cost: null }, { power: null }, { colors: '' }, { attributes: [] }, { traits: [] }, { review: undefined }, { conflicts: ['numeric'] }]) assert.equal(adaptCard({ ...input('ST01-003'), ...missing }).ok, false)
  assert.equal(adaptCard({ ...input(), cost: 5 }).ok, false, 'Life-as-cost is not accepted by the engine')
  assert.equal(adaptCard({ ...input('ST01-006'), review: { ...input('ST01-006').review!, requiredCapabilities: [] } }).ok, false, 'Cannot erase effect capability')
})
test('Repeated imports are idempotent, reprints remain memberships and contradictory variants are excluded', () => {
  const a = input('ST01-008'), b = { ...a, printingKey: 'ST01-008::_p1', databaseIds: ['alt-id'], extensions: ['PRB-01'] }
  const prepared = consolidateDefinitions([a, b, a])
  assert.equal(prepared.definitions.length, 1); assert.equal(prepared.printings.length, 2)
  assert.deepEqual(prepared.printings[1].extensions, ['PRB-01'])
  assert.deepEqual(consolidateDefinitions([a, b]), prepared)
  const conflict = consolidateDefinitions([a, { ...b, power: 6000 }])
  assert.equal(conflict.definitions.length, 0); assert.equal(conflict.printings.length, 0)
  assert.ok(conflict.errors.some(e => e.includes('CONFLICTING_VARIANTS')))
})
test('Official Life parser only accepts labelled Life/Vie on Leaders, never other numeric fields', () => {
  const html = (type: string, field: string) => `<dl class="modalCol" id="ST01-001"><div class="infoCol"><span>ST01-001</span><span>L</span><span>${type}</span></div><div><h3>${field}</h3>5</div></dl>`
  assert.equal(parseOfficialLife(html('LEADER', 'Vie'), source, 'fr')[0].value, 5)
  assert.equal(parseOfficialLife(html('LEADER', 'Life'), source, 'en')[0].number, 'ST01-001')
  assert.deepEqual(parseOfficialLife(html('LEADER', 'Cost'), source, 'en'), [])
  assert.deepEqual(parseOfficialLife(html('CHARACTER', 'Life'), source, 'en'), [])
})

function deckFixture() {
  const leader = input()
  const cards = Array.from({ length: 13 }, (_, i) => {
    const number = `OP99-${String(i + 1).padStart(3, '0')}`
    return { ...input('ST01-003'), number, printingKey: `${number}::standard`, databaseIds: [`fixture-${i}`] }
  })
  const data = consolidateDefinitions([leader, ...cards])
  const entries = [{ printingKey: leader.printingKey, quantity: 1 }, ...cards.map((c, i) => ({ printingKey: c.printingKey, quantity: i === 12 ? 2 : 4 }))]
  const ruleset: Ruleset = { ...structuredClone(M0_RULESET), allowedNumbers: [leader.number, ...cards.map(c => c.number)], capabilities: ['giveRestedDon'], restrictions: [] }
  return { data, entries, ruleset }
}
// Test-only OP99 fixtures are synthetic and never admitted by the real ruleset.
test('Deck rules count artwork copies by number and enforce 1 Leader + 50, colours and quantities', () => {
  const { data, entries, ruleset } = deckFixture()
  assert.deepEqual(validateEngineDeck(entries, data.definitions, data.printings, ruleset), [])
  assert.ok(validateEngineDeck(entries.slice(1), data.definitions, data.printings, ruleset).includes('EXACTLY_ONE_LEADER'))
  const alt = { ...data.printings[1], printingKey: 'OP99-001::_p1' }
  const repeated = [...entries, { printingKey: alt.printingKey, quantity: 1 }]
  assert.ok(validateEngineDeck(repeated, data.definitions, [...data.printings, alt], ruleset).includes('TOO_MANY_COPIES:OP99-001'))
  assert.ok(validateEngineDeck([{ printingKey: entries[0].printingKey, quantity: -1 }], data.definitions, data.printings, ruleset).includes('INVALID_QUANTITY'))
  const modified = structuredClone(data.definitions); modified[1].colors = ['BLUE']
  assert.ok(validateEngineDeck(entries, modified, data.printings, ruleset).includes('INCOMPATIBLE_COLOR'))
})
test('Restrictions respect effective dates, limits, pairs, expired snapshots and competitive block policy', () => {
  const { data, entries, ruleset } = deckFixture()
  const restriction = { kind: 'banned' as const, number: 'OP99-001', effectiveFrom: '2026-10-12', source: 'fixture' }
  assert.deepEqual(validateEngineDeck(entries, data.definitions, data.printings, { ...ruleset, restrictions: [restriction] }), [])
  assert.ok(validateEngineDeck(entries, data.definitions, data.printings, { ...ruleset, date: '2026-10-12', restrictions: [restriction] }).includes('RESTRICTED:OP99-001'))
  assert.ok(validateEngineDeck(entries, data.definitions, data.printings, { ...ruleset, date: '2026-10-13' }).includes('RESTRICTIONS_OUT_OF_DATE'))
  assert.ok(validateEngineDeck(entries, data.definitions, data.printings, { ...ruleset, restrictions: [{ kind: 'limited', number: 'OP99-001', limit: 1, effectiveFrom: ruleset.date, source: 'fixture' }] }).includes('RESTRICTED:OP99-001'))
  assert.ok(validateEngineDeck(entries, data.definitions, data.printings, { ...ruleset, restrictions: [{ kind: 'pair', numbers: ['OP99-001', 'OP99-002'], effectiveFrom: ruleset.date, source: 'fixture' }] }).includes('BANNED_PAIR:OP99-001+OP99-002'))
  assert.ok(validateEngineDeck(entries, data.definitions, data.printings, { ...ruleset, competitive: true }).includes('FORMAT_NOT_VERIFIED'))
  assert.ok(validateEngineDeck(entries, data.definitions, data.printings, { ...ruleset, allowedBlocks: ['2'] }).includes('BLOCK_NOT_ALLOWED:OP99-001'))
})
test('Actual reviewed specs retain FAQ/errata semantics and unimplemented effects cannot be admitted', () => {
  const data = consolidateDefinitions(Object.keys(REVIEWED_CARDS).map(n => input(n)))
  assert.equal(data.definitions.length, 14)
  assert.deepEqual(REVIEWED_CARDS['ST01-001'].review.effects[0], { kind: 'giveRestedDon', timing: 'ACTIVATE_MAIN', oncePerTurn: true, amount: { min: 0, max: 1 }, from: 'OWN_COST_RESTED', target: 'OWN_LEADER_OR_CHARACTER' })
  assert.equal(REVIEWED_CARDS['ST01-006'].review.effects[0].kind, 'blocker')
  assert.ok(REVIEWED_CARDS['ST01-007'].review.references.some(r => r.source.includes('qa_st-01')))
  assert.ok(validateEngineDeck([{ printingKey: 'ST01-001::standard', quantity: 1 }], data.definitions, data.printings, M0_RULESET).includes('UNSUPPORTED_EFFECT:ST01-001'))
  const entries = data.definitions.map((d, index) => ({ printingKey: `${d.number}::standard`, quantity: d.category === 'LEADER' ? 1 : index === data.definitions.length - 1 ? 2 : 4 }))
  assert.deepEqual(validateEngineDeck(entries, data.definitions, data.printings, M0_RULESET, 'composition'), [])
  assert.ok(validateEngineDeck(entries, data.definitions, data.printings, M0_RULESET).includes('UNSUPPORTED_EFFECT:ST01-006'))
  assert.deepEqual(JSON.parse(JSON.stringify(data)), data, 'No executable functions hidden in data')
})
test('Real 284 Leader variants have official evidence; preparing the subset preserves historical IDs and source data', async (t) => {
  try { await fs.access('data/onepiece/catalog/master-catalog.json') } catch { t.skip('Catalogue local absent : exécuter catalog:sync avec les archives autorisées'); return }
  const master = JSON.parse(await fs.readFile('data/onepiece/catalog/master-catalog.json', 'utf8')) as Catalog
  const before = JSON.stringify(master)
  const evidence = JSON.parse(await fs.readFile('../docs/game/evidence/leader-life.json', 'utf8')) as { rows: { number: string; variants: string[]; evidence: LifeEvidence[] }[] }
  const leaders = master.variants.filter(v => v.text.type.original === 'LEADER')
  assert.equal(leaders.length, 284)
  for (const v of leaders) {
    const row = evidence.rows.find(r => r.number === v.number)
    assert.ok(row?.variants.includes(v.key))
    assert.equal(resolveLeaderLife(row!.evidence).status, 'verified', v.key)
  }
  assert.equal(resolveLeaderLife(evidence.rows.find(r => r.number === 'ST01-001')!.evidence).life, 5)
  assert.equal(resolveLeaderLife(evidence.rows.find(r => r.number === 'OP02-001')!.evidence).life, 6)
  const raw = master.variants.find(v => v.key === 'ST01-001::standard')!
  const converted = catalogCardInput(raw, evidence.rows.find(r => r.number === raw.number)!.evidence, REVIEWED_CARDS[raw.number], raw.legacyIds)
  assert.equal(accepted(converted).definition.cost, null)
  assert.equal(accepted(converted).definition.life, 5)
  assert.deepEqual(accepted(converted).printing.databaseIds, raw.legacyIds)
  const bad = catalogCardInput({ ...raw, power: 6000 }, [], REVIEWED_CARDS[raw.number])
  assert.equal(adaptCard(bad).ok, false)
  assert.equal(JSON.stringify(master), before)
})
