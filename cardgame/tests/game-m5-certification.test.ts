import test from 'node:test'
import assert from 'node:assert/strict'
import { CERTIFICATIONS, M5_CERTIFIABLE, M5_CERTIFIED_TEST, ST02_CERTIFICATIONS, ST03_ST04_CERTIFICATIONS, ST05_ST06_CERTIFICATIONS, ST07_CERTIFICATIONS, ST08_CERTIFICATIONS, ST12_CERTIFICATIONS, ST09_CERTIFICATIONS, ST11_CERTIFICATIONS, ST10_CERTIFICATIONS, REPRINT_CERTIFICATIONS, ST14_CERTIFICATIONS, ST17_CERTIFICATIONS, ST18_CERTIFICATIONS, ST19_CERTIFICATIONS, ST21_CERTIFICATIONS, ST25_CERTIFICATIONS, ST28_CERTIFICATIONS, ST20_CERTIFICATIONS, ST15_CERTIFICATIONS, ST16_CERTIFICATIONS, ST26_CERTIFICATIONS, ST31_CERTIFICATIONS, certificationErrors, effectiveStatus } from '../src/game/cards/certification'
import { M5_CARDS, M5_REVISION } from '../src/game/cards/m5Catalog'
import { M3_FULL_REGISTRY } from '../src/game/cards/m3PurpleDeck'
import { engineCatalog, engineRegistry, engineRuleset } from '../src/lib/engine/catalog'
import { REFERENCE_DECKS } from '../src/lib/engine/decks'
import { validateEngineDeck, type DeckEntry } from '../src/game/rulesets/decks'
import { createGame, applyCommand, getLegalActions } from '../src/game/core/game'
import { assertGameInvariants } from '../src/game/core/invariants'
import { evaluateCharacteristics } from '../src/game/effects/characteristics'
import type { Command, GameState } from '../src/game/core/types'

// M5-5: recognised catalogue (M5 data file) and certification of the red/purple batch through real games.
const cat = engineCatalog()
type Intent = Command extends infer C ? C extends Command ? Omit<C, 'id' | 'actorId' | 'expectedVersion'> : never : never
const send = (s: GameState, actorId: string, intent: Intent) => { const r = applyCommand(s, { ...intent, actorId, id: `c-${s.version}`, expectedVersion: s.version } as Command); assert.ok(r.ok, r.ok ? '' : `${intent.type}:${r.error}`); return r.state }
const toMain = (s: GameState) => { while (s.phase !== 'MAIN') s = send(s, s.activePlayerId!, { type: 'ADVANCE_PHASE' }); return s }
const passTurn = (s: GameState) => toMain(send(s, s.activePlayerId!, { type: 'END_MAIN' }))
const FILL: Record<string, string[]> = {
  RED: ['ST01-003', 'ST01-008', 'ST01-009', 'ST01-010', 'OP01-010', 'OP01-012', 'OP01-018', 'OP01-023', 'P-012', 'P-016', 'ST01-006', 'ST01-007'],
  PURPLE: ['ST04-009', 'ST04-007', 'OP02-080', 'ST04-013', 'OP02-077', 'ST04-012', 'OP01-103', 'OP01-107', 'OP04-062', 'OP01-110', 'OP01-092', 'ST04-011'],
}
/** A legal 50-card deck of the card's colour: the card x4 plus already certified cards. */
function deckFor(number: string, colour: 'RED' | 'PURPLE'): DeckEntry[] {
  const entries: DeckEntry[] = [{ printingKey: colour === 'RED' ? 'ST01-001::standard' : 'ST04-001::standard', quantity: 1 }, { printingKey: `${number}::standard`, quantity: 4 }]
  let count = 4
  for (const filler of FILL[colour].filter(n => n !== number)) { const q = Math.min(4, 50 - count); if (q <= 0) break; entries.push({ printingKey: `${filler}::standard`, quantity: q }); count += q }
  return entries
}

test('M5-5: the M5 data file adds only no-ability or exact [Blocker] Characters, distinct from the certified subset', () => {
  assert.ok(M5_CARDS.length >= 250, `${M5_CARDS.length} recognised cards`)
  for (const card of M5_CARDS) {
    assert.equal(card.category, 'CHARACTER'); assert.equal(card.review!.triggerOriginal, ''); assert.equal(card.review!.revision, M5_REVISION)
    assert.ok(card.review!.effects.length === 0 ? card.review!.effectOriginal === '' : card.review!.effects[0].kind === 'blocker' && /^\[Blocker\] \(After your opponent declares an attack/.test(card.review!.effectOriginal), card.number)
    assert.ok(card.review!.references.every(r => r.checkedAt === '2026-10-12' && r.source.startsWith('https://en.onepiece-cardgame.com/')))
  }
  const d = (n: string) => cat.definitions.find(def => def.number === n)!
  const certified = M5_CARDS.filter(c => effectiveStatus(d(c.number)) === 'PLAYABLE_VERIFIED')
  // M6 certifies a few more M5 revisions through their own Starter Deck suites (ST02_CERTIFICATIONS).
  const starter = [...ST02_CERTIFICATIONS, ...ST03_ST04_CERTIFICATIONS, ...ST05_ST06_CERTIFICATIONS, ...ST07_CERTIFICATIONS, ...ST08_CERTIFICATIONS, ...ST12_CERTIFICATIONS, ...ST09_CERTIFICATIONS, ...ST11_CERTIFICATIONS, ...ST10_CERTIFICATIONS, ...REPRINT_CERTIFICATIONS, ...ST14_CERTIFICATIONS, ...ST17_CERTIFICATIONS, ...ST18_CERTIFICATIONS, ...ST19_CERTIFICATIONS, ...ST21_CERTIFICATIONS, ...ST25_CERTIFICATIONS, ...ST28_CERTIFICATIONS, ...ST20_CERTIFICATIONS, ...ST15_CERTIFICATIONS, ...ST16_CERTIFICATIONS, ...ST26_CERTIFICATIONS, ...ST31_CERTIFICATIONS]
  const viaStarter = starter.filter(c => c.definitionId.endsWith(`@${M5_REVISION}`)).length
  assert.equal(certified.length, M5_CERTIFIABLE.length + viaStarter, 'the red/purple batch plus the M6 starter certifications')
  assert.ok(M5_CARDS.some(c => effectiveStatus(d(c.number)) !== 'PLAYABLE_VERIFIED'), 'recognised is not certified')
  for (const c of CERTIFICATIONS.filter(c => c.definitionId.endsWith(`@${M5_REVISION}`) && !starter.includes(c))) assert.deepEqual(certificationErrors(c, d(c.definitionId.split('@')[0]), M3_FULL_REGISTRY), [], c.definitionId)
})

test(M5_CERTIFIED_TEST, () => {
  for (const card of M5_CERTIFIABLE) {
    const colour = (card.colors as string[])[0] as 'RED' | 'PURPLE', d = cat.definitions.find(def => def.number === card.number)!, blocker = d.review.effects.length > 0
    const deck = deckFor(card.number, colour)
    assert.deepEqual(validateEngineDeck(deck, cat.definitions, cat.printings, engineRuleset(), 'playable'), [], `${card.number} deck is legal`)
    const foe = REFERENCE_DECKS.find(r => r.id === (colour === 'RED' ? 'reference-purple' : 'reference-red'))!
    let s = createGame({ definitions: cat.definitions, printings: cat.printings, gameId: 'm5cert', seed: 11, scope: 'BASIC_TURNS', chooserId: 'p1', ruleset: engineRuleset(), effectRegistry: engineRegistry(),
      players: [{ id: 'p1', cards: deck, donCount: 10 }, { id: 'p2', cards: structuredClone(foe.entries), donCount: 10 }] })
    s = send(s, 'p1', { type: 'CHOOSE_FIRST', choice: 'FIRST' }); for (let n = 0; n < 2; n++) s = send(s, s.decisionPlayerId!, { type: 'MULLIGAN', redraw: false })
    // Two copies are put in hand (hidden-zone reordering only); one is played, one defends.
    const me = s.players[0], copies = [...me.zones.deck, ...me.zones.life].filter(id => s.instances[id].definitionId === d.definitionId).filter(id => me.zones.deck.includes(id)).slice(0, 2)
    for (const id of copies) { const out = me.zones.hand[0]; me.zones.deck[me.zones.deck.indexOf(id)] = out; me.zones.hand[0] = id; s.instances[id].zone = 'hand'; s.instances[id].zoneGeneration++; s.instances[out].zone = 'deck'; s.instances[out].zoneGeneration++; me.zones.hand.push(me.zones.hand.shift()!) }
    assertGameInvariants(s); assert.equal(copies.length, 2, card.number)
    const [played, held] = copies
    s = toMain(s)
    while (!(s.activePlayerId === 'p1' && s.players[0].zones.cost.filter(id => !s.instances[id].rested).length >= d.cost!)) s = passTurn(s)
    const play = getLegalActions(s, 'p1').find(a => a.type === 'PLAY_CARD' && a.instanceId === played)
    assert.ok(play && play.type === 'PLAY_CARD' && play.cost === d.cost, `${card.number} costs ${d.cost}`)
    s = send(s, 'p1', { type: 'PLAY_CARD', instanceId: played, donIds: play.eligibleDonIds.slice(0, d.cost!), replaceId: null })
    assert.equal(s.instances[played].zone, 'characters'); assert.equal(evaluateCharacteristics(s, played).power.current, d.power, `${card.number} power`)
    s = passTurn(s); while (!(s.activePlayerId === 'p2' && s.players[1].turns >= 2)) s = passTurn(s)
    s = send(s, 'p2', { type: 'DECLARE_ATTACK', attackerId: s.players[1].zones.leader[0], targetId: s.players[0].zones.leader[0] })
    if (blocker) {
      const block = getLegalActions(s, 'p1').find(a => a.type === 'ACTIVATE_BLOCKER')
      assert.ok(block && block.type === 'ACTIVATE_BLOCKER' && block.blockerIds.includes(played), `${card.number} can block`)
      s = send(s, 'p1', { type: 'ACTIVATE_BLOCKER', blockerId: played, battleId: s.battle!.id })
      assert.equal(s.battle!.target.instanceId, played); assert.equal(s.instances[played].rested, true)
    } else {
      s = send(s, 'p1', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
      if (d.counter !== null) {
        s = send(s, 'p1', { type: 'PLAY_COUNTER_CHARACTER', cardId: held, targetId: s.players[0].zones.leader[0], battleId: s.battle!.id })
        assert.equal(s.battle!.counterModifiers.at(-1)!.amount, d.counter, `${card.number} counter`)
      }
    }
    if (s.battle?.step === 'COUNTER') s = send(s, 'p1', { type: 'PASS_COUNTER', battleId: s.battle.id })
    s = send(s, 'p2', { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
    while (s.battle) s = send(s, s.battle.step === 'LIFE_TRIGGER' ? 'p1' : 'p2', s.battle.step === 'LIFE_TRIGGER' ? { type: 'ANSWER_TRIGGER', choiceId: s.battle.pendingLifeTrigger!.id, activate: false } : { type: 'CONTINUE_LIFE_DAMAGE', battleId: s.battle.id })
    if (!blocker) {
      s = passTurn(s)
      s = send(s, 'p1', { type: 'DECLARE_ATTACK', attackerId: played, targetId: s.players[1].zones.leader[0] })
      assert.equal(evaluateCharacteristics(s, played).power.current, d.power, `${card.number} attacks with its printed power`)
    }
    assertGameInvariants(s)
  }
})
