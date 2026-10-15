import test from 'node:test'
import assert from 'node:assert/strict'
import compositions from '../src/game/cards/starter-compositions.json'
import { STARTER_DECKS, STARTER_COMPOSITIONS } from '../src/game/cards/starterDecks'

// The /play manifest is the audited list of scripts/rebuildStarterDecks.ts (explicit numbers and quantities) gated by
// scripts/starterAudit/product-evidence.json.
test('audited Starter compositions: ST-01..ST-35 with 50 main cards, at most 4 copies per number and at least one Leader; ST-36 stays absent', () => {
  assert.deepEqual(STARTER_COMPOSITIONS.map(d => d.deckCode), Array.from({ length: 35 }, (_, i) => `ST-${String(i + 1).padStart(2, '0')}`))
  assert.deepEqual(compositions.absent.map(a => a.deckCode), ['ST-36'])
  for (const d of STARTER_COMPOSITIONS) {
    assert.equal(d.entries.filter(e => e.type !== 'LEADER').reduce((n, e) => n + e.quantity, 0), 50, d.deckCode)
    const perNumber = new Map<string, number>()
    for (const e of d.entries) perNumber.set(e.number, (perNumber.get(e.number) ?? 0) + e.quantity)
    assert.ok([...perNumber.values()].every(q => q <= 4), d.deckCode)
    assert.ok(d.leaders.length >= 1 && d.leaders.every(l => d.entries.some(e => e.number === l && e.type === 'LEADER' && e.quantity === 1)), d.deckCode)
  }
})

test('unverified compositions are never listed; a product with several Leaders gives one 51-card deck per Leader', () => {
  for (const d of STARTER_COMPOSITIONS.filter(d => !d.compositionVerified)) assert.ok(!STARTER_DECKS.some(deck => deck.deckCode === d.deckCode), d.deckCode)
  for (const code of ['ST-10', 'ST-13']) {
    const decks = STARTER_DECKS.filter(d => d.deckCode === code)
    assert.deepEqual(decks.map(d => d.leader).sort(), STARTER_COMPOSITIONS.find(d => d.deckCode === code)!.leaders.slice().sort(), code)
    for (const deck of decks) {
      assert.equal(deck.entries.reduce((n, e) => n + e.quantity, 0), 51, deck.id)
      assert.equal(deck.entries.filter(e => decks.some(other => `${other.leader}::standard` === e.printingKey)).length, 1, `${deck.id}: only its own Leader`)
    }
  }
})

test('the audited ST-03 contents replace the earlier name lookup: Sables x4 and Love-Love Mellow x2', () => {
  const st03 = STARTER_DECKS.find(d => d.id === 'starter-st03')!
  const q = (n: string) => st03.entries.find(e => e.printingKey === `${n}::standard`)?.quantity
  assert.equal(q('ST03-015'), 4); assert.equal(q('ST03-017'), 2)
  assert.equal(q('OP01-088'), undefined); assert.equal(q('OP07-057'), undefined)
})

test('ST-24: the user-confirmed quantities (ST24-004 Law & Bepo x2, ST24-005 X.Drake x4) give one Leader + 50 cards', () => {
  const st24 = STARTER_COMPOSITIONS.find(d => d.deckCode === 'ST-24')!
  assert.equal(st24.compositionVerified, true); assert.deepEqual(st24.reasons, []); assert.equal(st24.mainCount, 50)
  const deck = STARTER_DECKS.find(d => d.id === 'starter-st24')!
  const q = (n: string) => deck.entries.find(e => e.printingKey === `${n}::standard`)?.quantity
  assert.equal(q('OP07-019'), 1); assert.equal(q('ST24-004'), 2); assert.equal(q('ST24-005'), 4)
  assert.equal(deck.entries.reduce((n, e) => n + e.quantity, 0), 51)
})
