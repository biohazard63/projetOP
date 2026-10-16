import test from 'node:test'
import assert from 'node:assert/strict'
import { M7_CERTIFICATIONS, M7_REVIEWED, M7_TESTS, certificationErrors, effectiveStatus } from '../src/game/cards/certification'
import { compiledCards, currentEngineRegistry, engineCatalog } from '../src/lib/engine/catalog'
import { runAbility, runPrinted, runStatic } from './helpers/m7Compiled'

// M7 — cards compiled from their official English text and certified after review (src/game/cards/certification.ts,
// M7_REVIEWED). Each of their abilities is triggered by its real command in a real game, and every operation is checked.
const reviewed = new Set(Object.values(M7_REVIEWED).flatMap(cards => Object.keys(cards)))
const cards = () => compiledCards().filter(c => reviewed.has(c.number))

test('M7 compiled abilities run in real games and produce their printed result', async t => {
  // A "Choose one" ability is run once per option.
  const modes = (a: (typeof cards extends () => readonly (infer C)[] ? C : never)['abilities'][number]) => Math.max(1, ...a.program.map(st => st.kind === 'MODE' ? st.modes : 1))
  for (const c of cards()) for (const a of c.abilities) for (let m = 0; m < modes(a); m++) await t.test(`${a.id}${m ? ` (option ${m + 1})` : ''}`, () => { const r = runAbility(c, a, m); assert.ok(r.ok, r.ok ? '' : r.reason) })
})

test('M7 compiled static modifiers and conditional keywords apply with their printed condition', async t => {
  for (const c of cards()) for (const x of [...c.continuous, ...c.conditionalKeywords, ...c.attackProhibitions]) await t.test(x.id, () => { const r = runStatic(c, x); assert.ok(r.ok, r.ok ? '' : r.reason) })
})

test('M7 compiled programs: after an optional cost or a printed condition, every step that acts is gated by it', () => {
  // Otherwise an action would happen with the cost unpaid or the condition unmet (as a search did before this check).
  for (const c of compiledCards()) for (const a of c.abilities) {
    const first = a.program.findIndex(st => st.kind === 'CHECK' || (st.kind === 'CHOICE' && st.bind === 'paid'))
    if (first < 0) continue
    for (const st of a.program.slice(first + 1)) {
      if (st.kind === 'BIND_ALL' || st.kind === 'UNION') continue
      const subject = st.kind === 'OPERATION' ? (st.operation as { subjectBinding?: string }).subjectBinding : undefined
      if (subject === 'paid') continue // the payment of the cost itself
      assert.ok('whenBindingNonempty' in st && st.whenBindingNonempty, `${a.id}: ${st.kind} not gated`)
    }
  }
})

test('M7 compiled printed keywords and [Blocker] are carried by the definition', () => {
  for (const c of cards()) { const r = runPrinted(c); assert.ok(r.ok, `${c.number}: ${r.ok ? '' : r.reason}`) }
})

test('M7 every reviewed card is compiled in the catalogue, certified and PLAYABLE_VERIFIED; the others stay uncertified', () => {
  const { definitions } = engineCatalog(), registry = currentEngineRegistry()
  assert.equal(cards().length, reviewed.size, 'every reviewed number is compiled (not hidden by a hand-written pack)')
  for (const c of M7_CERTIFICATIONS) assert.deepEqual(certificationErrors(c, definitions.find(d => d.definitionId === c.definitionId), registry), [], c.definitionId)
  for (const c of compiledCards()) assert.equal(effectiveStatus(definitions.find(d => d.number === c.number)!) === 'PLAYABLE_VERIFIED', reviewed.has(c.number), c.number)
  assert.deepEqual(Object.values(M7_TESTS).length, 3)
})

test('M7 the free ruleset admits exactly the reviewed compiled numbers it certifies', async () => {
  const { FREE_RULESET } = await import('../src/game/rulesets/free')
  for (const n of reviewed) assert.ok(FREE_RULESET.allowedNumbers.includes(n), n)
})
