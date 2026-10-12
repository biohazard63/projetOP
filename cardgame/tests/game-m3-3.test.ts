import test from 'node:test'
import assert from 'node:assert/strict'
import { consolidateDefinitions } from '../src/game/cards/adapter'
import { REVIEWED_CARDS } from '../src/game/cards/reviewedCards'
import { M3_ABILITY_CARDS } from '../src/game/cards/m3Abilities'
import { PURPLE_CARDS, PURPLE_DECK, M3_FULL_REGISTRY, KAIDO_ABILITY_ID } from '../src/game/cards/m3PurpleDeck'
import { M3_RULESET } from '../src/game/rulesets/m3'
import { validateEngineDeck } from '../src/game/rulesets/decks'
import { createGame, applyCommand, getLegalActions, projectState, restoreGame } from '../src/game/core/game'
import { assertGameInvariants } from '../src/game/core/invariants'
import type { CardInput } from '../src/game/cards/types'
import type { Command, GameInput, GameState, LegalAction } from '../src/game/core/types'
import { validateRegistry } from '../src/game/effects/contracts'

// M3-3: reference purple deck (Leader ST04-001 Kaido) built only from cards verified on Bandai sources on
// 2026-10-12, validated by the engine deck rules (CR 1.2.1 §5-1-2) and played through public commands.
const reviewed: CardInput[] = Object.entries(REVIEWED_CARDS).map(([number, facts]) => ({ ...structuredClone(facts), number, printingKey: `${number}::standard`, extensions: [], databaseIds: [], life: facts.category === 'LEADER' ? 5 : null, lifeEvidence: facts.category === 'LEADER' ? [{ field: 'life', value: 5, source: 'https://en.onepiece-cardgame.com/cardlist/?series=569001', checkedAt: '2026-10-10', language: 'en' }] : [] }))
function catalog() {
  const others = M3_ABILITY_CARDS.filter(card => !PURPLE_CARDS.some(p => p.number === card.number))
  const result = consolidateDefinitions([...reviewed, ...others, ...PURPLE_CARDS]); assert.deepEqual(result.errors, [])
  return result
}
export function redDeck() {
  const characters = reviewed.filter(c => c.category === 'CHARACTER')
  return [{ printingKey: 'ST01-001::standard', quantity: 1 }, ...characters.slice(0, 12).map(c => ({ printingKey: c.printingKey, quantity: 4 })), { printingKey: characters[12].printingKey, quantity: 2 }]
}
function input(seed: number): GameInput {
  const { definitions, printings } = catalog()
  return { definitions, printings, gameId: 'm3-purple', seed, scope: 'BASIC_TURNS', chooserId: 'alice', ruleset: structuredClone(M3_RULESET), effectRegistry: validateRegistry(structuredClone(M3_FULL_REGISTRY)),
    players: [{ id: 'alice', cards: structuredClone(PURPLE_DECK), donCount: 10 }, { id: 'bob', cards: redDeck(), donCount: 10 }] }
}
type Intent = Command extends infer C ? C extends Command ? Omit<C,'id'|'actorId'|'expectedVersion'> : never : never
function attempt(s:GameState,actorId:string,intent:Intent,id=`m3-3-${s.version}`) {return applyCommand(s,{...intent,actorId,id,expectedVersion:s.version})}
function send(s:GameState,actorId:string,intent:Intent) {const r=attempt(s,actorId,intent);assert.ok(r.ok,r.ok?'':r.error);return r.state}
function opened(seed=77) {
  let s=createGame(input(seed))
  s=send(s,'alice',{type:'CHOOSE_FIRST',choice:'FIRST'})
  for (let n=0;n<2;n++) s=send(s,s.decisionPlayerId!,{type:'MULLIGAN',redraw:false})
  return s
}
function toMain(s:GameState) { while (s.phase!=='MAIN') s=send(s,s.activePlayerId!,{type:'ADVANCE_PHASE'}); return s }
function passTurn(s:GameState) { return toMain(send(s,s.activePlayerId!,{type:'END_MAIN'})) }
const numberOf=(s:GameState,id:string)=>s.catalog.definitions.find(d=>d.definitionId===s.instances[id].definitionId)?.number
const startAction=(s:GameState,actor:string)=>getLegalActions(s,actor).find((a):a is Extract<LegalAction,{type:'START_EFFECT'}>=>a.type==='START_EFFECT'&&a.effectId.startsWith(KAIDO_ABILITY_ID))

test('M3-3: every purple reference card adapts from reviewed Bandai data and the Leader Life is verified', () => {
  const { definitions } = catalog()
  for (const card of PURPLE_CARDS) {
    const d = definitions.find(d => d.number === card.number)!
    assert.ok(d, card.number); assert.deepEqual(d.colors, ['PURPLE'], card.number)
    assert.equal(d.review.faqChecked && d.review.errataChecked, true)
    assert.ok(d.review.references.every(r => r.checkedAt === '2026-10-12' || r.checkedAt === '2026-10-11'), card.number)
    assert.notEqual(d.review.playabilityStatus, 'PLAYABLE_VERIFIED', `${card.number} is not certified by M3-3`)
  }
  const kaido = definitions.find(d => d.number === 'ST04-001')!
  assert.equal(kaido.category, 'LEADER'); assert.equal(kaido.life, 5); assert.equal(kaido.definitionId, 'ST04-001@m3-2026-10-12')
  assert.match(kaido.review.effectOriginal, /from the top of their Life cards/, 'the post-errata wording is the reviewed one')
})

test('M3-3: the purple deck satisfies every construction rule in playable mode and wrong variants are refused', () => {
  const { definitions, printings } = catalog()
  assert.deepEqual(validateEngineDeck(PURPLE_DECK, definitions, printings, M3_RULESET, 'playable'), [])
  assert.equal(PURPLE_DECK.filter(e => e.printingKey !== 'ST04-001::standard').reduce((n, e) => n + e.quantity, 0), 50)
  assert.ok(PURPLE_DECK.every(e => e.quantity <= 4))
  assert.deepEqual(validateEngineDeck(redDeck(), definitions, printings, M3_RULESET, 'playable'), [], 'the red opponent deck is legal too')
  const red = structuredClone(PURPLE_DECK); red[1].quantity--; red.push({ printingKey: 'ST01-003::standard', quantity: 1 })
  assert.ok(validateEngineDeck(red, definitions, printings, M3_RULESET, 'playable').includes('INCOMPATIBLE_COLOR'))
  const five = structuredClone(PURPLE_DECK); five[1].quantity = 5; five[2].quantity = 3
  assert.ok(validateEngineDeck(five, definitions, printings, M3_RULESET, 'playable').includes('TOO_MANY_COPIES:ST04-009'))
  const short = structuredClone(PURPLE_DECK); short[1].quantity = 3
  assert.ok(validateEngineDeck(short, definitions, printings, M3_RULESET, 'playable').includes('EXACTLY_FIFTY_MAIN'))
  const stale = structuredClone(M3_RULESET); stale.date = '2026-10-13'
  assert.ok(validateEngineDeck(PURPLE_DECK, definitions, printings, stale, 'playable').includes('RESTRICTIONS_OUT_OF_DATE'))
})

test('M3-3: a game between the purple and red legal decks starts through public commands with hidden zones private', () => {
  const s = toMain(opened())
  assertGameInvariants(s)
  assert.equal(s.players[0].zones.life.length, 5); assert.equal(s.players[0].zones.hand.length, 5)
  assert.equal(numberOf(s, s.players[0].zones.leader[0]), 'ST04-001')
  const bobView = JSON.stringify(projectState(s, 'bob'))
  for (const id of [...s.players[0].zones.hand, ...s.players[0].zones.life, ...s.players[0].zones.deck]) assert.equal(bobView.includes(`"${id}"`), false, id)
  assert.deepEqual(restoreGame(JSON.stringify(s)), s)
})

test('M3-3: Blast Breath from a naturally drawn hand defends in the legal purple deck, DON!! -1 returning the DON!! that paid it (CR 10-2-10-1)', () => {
  let seed = 0, s: GameState | undefined
  for (let candidate = 1; candidate <= 300 && !s; candidate++) {
    const o = opened(candidate)
    if (o.players[0].zones.hand.some(id => numberOf(o, id) === 'ST04-016')) { seed = candidate; s = o }
  }
  assert.ok(s, 'a seed deals Blast Breath to the purple player'); if (!s) return
  s = passTurn(passTurn(passTurn(toMain(s))))
  assert.equal(s.activePlayerId, 'bob'); assert.equal(s.turn, 4, 'CR 6-5-6-1: no battle on a player\'s first turn')
  assert.ok(s.players[0].zones.hand.some(id => numberOf(s!, id) === 'ST04-016'))
  const alice = s.players[0], blast = alice.zones.hand.find(id => numberOf(s!, id) === 'ST04-016')!, don = alice.zones.cost.find(id => !s!.instances[id].rested)!
  s = send(s, 'bob', { type: 'DECLARE_ATTACK', attackerId: s.players[1].zones.leader[0], targetId: alice.zones.leader[0] })
  s = send(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle!.id })
  const counter = getLegalActions(s, 'alice').find(a => a.type === 'PLAY_COUNTER_EVENT')
  assert.ok(counter && counter.type === 'PLAY_COUNTER_EVENT' && counter.eventIds.includes(blast))
  s = send(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: blast, battleId: s.battle!.id, paymentDonIds: [don], donMinusIds: [don], targetId: null })
  assert.equal(s.instances[don].zone, 'donDeck', 'the rested DON!! on the field may be the one returned')
  assert.equal(s.effects!.payments!.find(p => p.resolutionId === s!.battle!.id)!.outcome, 'PAID')
  const q = s.effects!.choice!
  s = send(restoreGame(JSON.stringify(s)), 'alice', { type: 'ANSWER_CHOICE', choiceId: q.id, tokens: [q.options.find(o => o.presence.instanceId === alice.zones.leader[0])!.token] })
  assert.equal(s.battle!.counterModifiers.at(-1)!.amount, 4000)
  s = send(s, 'alice', { type: 'PASS_COUNTER', battleId: s.battle!.id })
  s = send(s, 'bob', { type: 'RESOLVE_BATTLE', battleId: s.battle!.id })
  assert.equal(s.battle, null); assert.equal(s.players[0].zones.life.length, 5, '5000 attacker against 9000 defender: no damage')
  assertGameInvariants(s); assert.ok(seed > 0)
})

function kaidoTurn(seed = 77) {
  let s = toMain(opened(seed))
  while (!(s.activePlayerId === 'alice' && s.players[0].zones.cost.length >= 7)) s = passTurn(s)
  return s
}

test('M3-3: Kaido pays DON!! -7, trashes the top Life card of the opponent and stays once per turn', () => {
  let s = kaidoTurn()
  assert.equal(s.turn, 7)
  const bob = s.players[1], top = bob.zones.life[0], action = startAction(s, 'alice')!
  assert.ok(action?.donMinus); assert.equal(action.donMinus!.amount, 7)
  assert.equal(startAction(s, 'bob'), undefined)
  const dons = action.donMinus!.eligibleDonIds.slice(0, 7), before = s.effects!.operations!.length
  s = send(s, 'alice', { type: 'START_EFFECT', effectId: action.effectId, donMinusIds: dons })
  assert.ok(dons.every(id => s.instances[id].zone === 'donDeck'))
  assert.deepEqual(s.effects!.operations!.slice(before).filter(o => o.intent === 'COST').map(o => [o.type, o.outcome]), Array(7).fill(['MOVE_DON', 'CONFIRMED']))
  const legal = getLegalActions(s, 'alice').find(a => a.type === 'ANSWER_CHOICE')
  assert.ok(legal && legal.type === 'ANSWER_CHOICE'); if (!legal || legal.type !== 'ANSWER_CHOICE') return
  assert.equal(legal.options.length, 1); assert.equal('instanceId' in legal.options[0], false, 'the hidden Life card is designated by token only')
  for (const viewer of ['alice', 'bob']) assert.equal(JSON.stringify(projectState(s, viewer)).includes(`"${top}"`), false, `${viewer} cannot identify the Life card`)
  const snapshot = JSON.stringify(s)
  s = send(restoreGame(snapshot), 'alice', { type: 'ANSWER_CHOICE', choiceId: legal.choiceId, tokens: [legal.options[0].token] })
  assert.equal(s.instances[top].zone, 'trash'); assert.equal(s.instances[top].faceUp, true)
  assert.equal(bob.zones.life.length, 5); assert.equal(s.players[1].zones.life.length, 4)
  const trashed = s.events.filter(e => e.type === 'LIFE_TRASHED')
  assert.equal(trashed.length, 1); assert.equal(trashed[0].actorId, 'bob')
  assert.ok(s.events.some(e => e.type === 'CARD_TRASHED' && e.publicInstanceId === top))
  assert.ok(JSON.stringify(projectState(s, 'alice')).includes(`"${top}"`), 'once trashed, the card is public')
  assert.equal(s.players[1].zones.hand.includes(top), false, 'a trashed Life card is not added to hand: no damage, no [Trigger]')
  assert.equal(s.result, null); assert.equal(startAction(s, 'alice'), undefined, '[Once Per Turn]')
  const again = attempt(s, 'alice', { type: 'START_EFFECT', effectId: action.effectId, donMinusIds: s.players[0].zones.cost.slice(0, 7) })
  assert.equal(again.ok, false)
  assertGameInvariants(s); assert.deepEqual(restoreGame(JSON.stringify(s)), s)
})

test('M3-3: Kaido may choose zero Life cards after paying, and its cost requires 7 distinct own field DON!!, attached ones included', () => {
  let s = kaidoTurn()
  const alice = s.players[0], leader = alice.zones.leader[0], action = startAction(s, 'alice')!
  s = send(s, 'alice', { type: 'ATTACH_DON', donIds: [alice.zones.cost[0]], targetId: leader })
  const attached = s.players[0].zones.attached[0]
  const field = startAction(s, 'alice')!.donMinus!.eligibleDonIds
  assert.ok(field.includes(attached), 'a DON!! given to the Leader is on the field')
  const invalid = (ids: string[]) => { const before = JSON.stringify(s), r = attempt(s, 'alice', { type: 'START_EFFECT', effectId: action.effectId, donMinusIds: ids }); assert.equal(r.ok, false); assert.equal(JSON.stringify(s), before) }
  invalid(field.slice(0, 6)); invalid([field[0], ...field.slice(0, 6)]); invalid([...field.slice(0, 6), s.players[1].zones.cost[0]]); invalid([...field.slice(0, 6), s.players[0].zones.donDeck[0]])
  assert.equal(attempt(s, 'alice', { type: 'START_EFFECT', effectId: action.effectId }).ok, false, 'the DON!! selection is mandatory')
  s = send(s, 'alice', { type: 'START_EFFECT', effectId: action.effectId, donMinusIds: [attached, ...field.filter(id => id !== attached).slice(0, 6)] })
  assert.equal(s.instances[attached].zone, 'donDeck'); assert.equal(s.instances[attached].attachedTo, null)
  s = send(s, 'alice', { type: 'ANSWER_CHOICE', choiceId: s.effects!.choice!.id, tokens: [] })
  assert.equal(s.players[1].zones.life.length, 5, 'up to 1: choosing 0 trashes nothing'); assert.equal(s.effects!.continuation, null)
  assertGameInvariants(s)
})

test('M3-3: Kaido is not offered below 7 field DON!! and a MOVE_DON prohibition makes its cost unpayable', () => {
  let s = toMain(opened())
  while (!(s.activePlayerId === 'alice' && s.players[0].zones.cost.length >= 5)) s = passTurn(s)
  assert.equal(s.players[0].zones.cost.length, 5); assert.equal(startAction(s, 'alice'), undefined)
  s = kaidoTurn()
  const effectId = startAction(s, 'alice')!.effectId
  s.effects!.registry.restrictions.push({ id: 'no-don-move', playerId: 'alice', prohibited: 'MOVE_DON' })
  assert.equal(startAction(s, 'alice'), undefined)
  const r = attempt(s, 'alice', { type: 'START_EFFECT', effectId, donMinusIds: s.players[0].zones.cost.slice(0, 7) })
  assert.equal(r.ok, false); assert.ok(s.players[0].zones.cost.length >= 7, 'nothing was returned')
})
