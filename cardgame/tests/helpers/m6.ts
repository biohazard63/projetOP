import assert from 'node:assert/strict'
import { createGame, applyCommand, getLegalActions, restoreGame, projectState } from '../../src/game/core/game'
import type { Command, GameInput, GameState, LegalAction } from '../../src/game/core/types'
import { engineCatalog, currentEngineRegistry, engineRuleset } from '../../src/lib/engine/catalog'
import type { DeckEntry } from '../../src/game/rulesets/decks'

// M6 scenario harness: real games built by createGame and driven by public commands. Placement helpers only
// move a player's own existing card instance between zones (as a deck order would), keeping zone generations.
export type Intent = Command extends infer C ? C extends Command ? Omit<C, 'id' | 'actorId' | 'expectedVersion'> : never : never
const catalog = engineCatalog()
export const definitionOf = (number: string) => {
  const d = catalog.definitions.find(x => x.number === number)
  if (!d) throw new Error(`NO_DEFINITION:${number}`)
  return d
}
/** Leader + the given numbers (3 copies unless specified) padded to 50 with effect-less Characters of the Leader colours. */
export function deckFor(leader: string, numbers: (string | [string, number])[]): DeckEntry[] {
  const lead = definitionOf(leader), entries: DeckEntry[] = [{ printingKey: `${leader}::standard`, quantity: 1 }]
  let total = 0
  for (const item of numbers) {
    const [number, quantity] = Array.isArray(item) ? item : [item, 3]
    entries.push({ printingKey: `${number}::standard`, quantity }); total += quantity
  }
  const fillers = catalog.definitions.filter(d => d.category === 'CHARACTER' && !d.review.effects.length && !d.review.effectOriginal.trim() && !d.review.triggerOriginal.trim()
    && d.colors.every(c => lead.colors.includes(c)) && !numbers.some(n => (Array.isArray(n) ? n[0] : n) === d.number))
  for (const f of fillers) { if (total >= 50) break; const q = Math.min(4, 50 - total); entries.push({ printingKey: `${f.number}::standard`, quantity: q }); total += q }
  assert.equal(total, 50, `not enough fillers for ${leader}`)
  return entries
}
export function newGame(alice: DeckEntry[], bob: DeckEntry[], seed = 61013): GameState {
  const ruleset = engineRuleset()
  const numbers = [...alice, ...bob].map(e => catalog.printings.find(p => p.printingKey === e.printingKey)!).map(p => catalog.definitions.find(d => d.definitionId === p.definitionId)!.number)
  ruleset.allowedNumbers = [...new Set([...ruleset.allowedNumbers, ...numbers])]
  const input: GameInput = { ...catalog, gameId: 'm6-scenario', seed, scope: 'BASIC_TURNS', chooserId: 'alice', ruleset, effectRegistry: currentEngineRegistry(),
    players: [{ id: 'alice', cards: structuredClone(alice), donCount: 10 }, { id: 'bob', cards: structuredClone(bob), donCount: 10 }] }
  return createGame(input)
}
let serial = 0
export function act(s: GameState, actorId: string, intent: Intent): GameState {
  const r = applyCommand(s, { ...intent, id: `m6h-${++serial}`, actorId, expectedVersion: s.version } as Command)
  assert.ok(r.ok, r.ok ? '' : `${intent.type}: ${r.error}`)
  return r.state
}
export function refused(s: GameState, actorId: string, intent: Intent): string {
  const r = applyCommand(s, { ...intent, id: `m6h-${++serial}`, actorId, expectedVersion: s.version } as Command)
  assert.equal(r.ok, false, `${intent.type} should be refused`)
  return r.ok ? '' : r.error
}
export const legal = (s: GameState, actorId: string) => getLegalActions(s, actorId)
export function advanceToMain(s: GameState): GameState { while (s.phase !== 'MAIN' && !s.result) s = act(s, s.activePlayerId!, { type: 'ADVANCE_PHASE' }); return s }
/** Alice goes first; both keep; stops in Alice's main phase of `turn` (1 = her first turn, 3 = her second...). */
export function toMain(s: GameState, turn = 3): GameState {
  s = act(s, 'alice', { type: 'CHOOSE_FIRST', choice: 'FIRST' })
  for (let i = 0; i < 2; i++) s = act(s, s.decisionPlayerId!, { type: 'MULLIGAN', redraw: false })
  s = advanceToMain(s)
  while (s.turn < turn) { s = act(s, s.activePlayerId!, { type: 'END_MAIN' }); s = advanceToMain(s) }
  return s
}
export function endTurn(s: GameState): GameState { return advanceToMain(act(s, s.activePlayerId!, { type: 'END_MAIN' })) }
export const ownerOf = (s: GameState, id: string) => s.players.find(p => p.id === s.instances[id].owner)!
/** Moves one of `owner`'s instances of `number` to `zone`. Life keeps its size: a card put into Life (as its top
 * card) swaps places with the previous top card, which goes where the new card came from. Life is never emptied. */
export function put(s: GameState, owner: string, number: string, zone: 'hand' | 'characters' | 'trash' | 'life' | 'stage' | 'deckTop', opts: { rested?: boolean; playedEarlier?: boolean } = {}): string {
  const p = s.players.find(x => x.id === owner)!, d = definitionOf(number), target = zone === 'deckTop' ? 'deck' : zone
  const free = Object.values(s.instances).filter(i => i.owner === owner && i.definitionId === d.definitionId && ['deck', 'hand', 'trash'].includes(i.zone)
    && (zone === 'deckTop' ? p.zones.deck[0] !== i.id : i.zone !== target))
  let id = (free.find(i => i.zone === 'deck') ?? free[0])?.id
  if (!id) {
    // Every free copy sits in Life: swap one with a deck card (Life keeps its size and order of the others).
    const inLife = p.zones.life.find(x => s.instances[x].definitionId === d.definitionId), sub = p.zones.deck.find(x => s.instances[x].definitionId !== d.definitionId)
    assert.ok(inLife && sub, `no free ${number} for ${owner}`)
    p.zones.life[p.zones.life.indexOf(inLife!)] = sub!; p.zones.deck[p.zones.deck.indexOf(sub!)] = inLife!
    s.instances[sub!].zone = 'life'; s.instances[sub!].zoneGeneration++; s.instances[inLife!].zone = 'deck'; s.instances[inLife!].zoneGeneration++
    id = inLife
  }
  const i = s.instances[id!], from = i.zone as 'deck' | 'hand' | 'trash'
  p.zones[from].splice(p.zones[from].indexOf(id!), 1)
  if (zone === 'life') {
    const old = p.zones.life.shift()!, o = s.instances[old]
    p.zones[from].push(old); o.zone = from; o.zoneGeneration++; o.faceUp = from === 'trash'
    p.zones.life.unshift(id!)
  } else if (zone === 'deckTop') p.zones.deck.unshift(id!)
  else p.zones[target as 'hand'].push(id!)
  i.zone = target as typeof i.zone; i.zoneGeneration++; i.rested = !!opts.rested
  i.faceUp = ['characters', 'stage', 'trash'].includes(target)
  i.playedOnTurn = target === 'characters' || target === 'stage' ? (opts.playedEarlier === false ? s.turn : Math.max(1, s.turn - 1)) : null
  return id!
}
/** An effect-less Character of `colour` with at least `minPower`, for scenario decks. */
export function vanilla(colour: string, minPower = 0, maxPower = 99999): string {
  const d = catalog.definitions.find(x => x.category === 'CHARACTER' && x.colors.join() === colour && !x.review.effects.length && !x.review.effectOriginal.trim() && !x.review.triggerOriginal.trim()
    && (x.power ?? 0) >= minPower && (x.power ?? 0) <= maxPower)
  assert.ok(d, `no vanilla ${colour} ${minPower}`); return d!.number
}
export function attachDon(s: GameState, owner: string, targetId: string, count = 1): void {
  const p = s.players.find(x => x.id === owner)!
  for (let n = 0; n < count; n++) {
    const id = p.zones.cost.find(x => !s.instances[x].rested) ?? p.zones.cost[0]
    assert.ok(id, 'no DON!! to attach')
    p.zones.cost.splice(p.zones.cost.indexOf(id), 1); p.zones.attached.push(id)
    const i = s.instances[id]; i.zone = 'attached'; i.zoneGeneration++; i.rested = false; i.attachedTo = targetId
  }
}
export const instancesOf = (s: GameState, owner: string, number: string) => Object.values(s.instances).filter(i => i.owner === owner && i.definitionId === definitionOf(number).definitionId).map(i => i.id)
export function playCard(s: GameState, owner: string, id: string): GameState {
  const a = legal(s, owner).find(x => x.type === 'PLAY_CARD' && x.instanceId === id) as Extract<LegalAction, { type: 'PLAY_CARD' }> | undefined
  assert.ok(a, `cannot play ${id}`)
  return act(s, owner, { type: 'PLAY_CARD', instanceId: id, donIds: a.eligibleDonIds.slice(0, a.cost), replaceId: null })
}
/** Offered START_EFFECT ids containing `abilityId` (ids are scoped to the source instance). */
export const offeredEffects = (s: GameState, owner: string, abilityId: string) => legal(s, owner).filter(a => a.type === 'START_EFFECT' && a.effectId.includes(abilityId)) as Extract<LegalAction, { type: 'START_EFFECT' }>[]
export function startEffect(s: GameState, owner: string, abilityId: string, extra: { donMinusIds?: string[]; payOptionalCost?: boolean } = {}): GameState {
  const offered = offeredEffects(s, owner, abilityId)
  assert.ok(offered.length, `${abilityId} not offered: ${JSON.stringify(legal(s, owner).map(a => a.type === 'START_EFFECT' ? a.effectId : a.type))}`)
  return act(s, owner, { type: 'START_EFFECT', effectId: offered[0].effectId, ...extra })
}
export function pendingChoice(s: GameState, owner: string) {
  return legal(s, owner).find(a => a.type === 'ANSWER_CHOICE') as Extract<LegalAction, { type: 'ANSWER_CHOICE' }> | undefined
}
export function optionIds(s: GameState, owner: string): string[] {
  const c = pendingChoice(s, owner); assert.ok(c, 'no pending choice')
  return c!.options.map(o => ('instanceId' in o ? o.instanceId! : ''))
}
export function choose(s: GameState, owner: string, ids: string[]): GameState {
  const c = pendingChoice(s, owner); assert.ok(c, 'no pending choice')
  const tokens = ids.map(id => { const o = c!.options.find(x => 'instanceId' in x && x.instanceId === id); assert.ok(o, `${id} is not an option`); return o!.token })
  return act(s, owner, { type: 'ANSWER_CHOICE', choiceId: c!.choiceId, tokens })
}
export function attack(s: GameState, attackerId: string, targetId: string): GameState {
  return act(s, s.activePlayerId!, { type: 'DECLARE_ATTACK', attackerId, targetId })
}
/** JSON round trip through the public restore entry point (invariants included). */
export function roundTrip(s: GameState): GameState { const back = restoreGame(JSON.stringify(s)); assert.deepEqual(back, s); return back }
export const leaderOf = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones.leader[0]
export const zoneOf = (s: GameState, id: string) => s.instances[id].zone
export { projectState }
/** After DECLARE_ATTACK (and any When Attacking choice): defender blocks with `block` or passes, passes Counter, battle resolves, Triggers are declined. */
export function finishBattle(s: GameState, opts: { block?: string } = {}): GameState {
  const defender = s.players.find(p => p.id !== s.activePlayerId)!.id, attacker = s.activePlayerId!
  if (!s.battle) return s
  if (opts.block) s = act(s, defender, { type: 'ACTIVATE_BLOCKER', blockerId: opts.block, battleId: s.battle.id })
  else if (s.battle.step === 'BLOCKER') s = act(s, defender, { type: 'PASS_BLOCKER', battleId: s.battle.id })
  if (s.battle?.step === 'COUNTER') s = act(s, defender, { type: 'PASS_COUNTER', battleId: s.battle.id })
  if (s.battle?.step === 'DAMAGE') s = act(s, attacker, { type: 'RESOLVE_BATTLE', battleId: s.battle.id })
  for (let n = 0; n < 4 && s.battle; n++) {
    const t = legal(s, defender).find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
    if (t) s = act(s, defender, { type: 'ANSWER_TRIGGER', choiceId: t.choiceId, activate: false })
    else if (legal(s, attacker).some(a => a.type === 'CONTINUE_LIFE_DAMAGE')) s = act(s, attacker, { type: 'CONTINUE_LIFE_DAMAGE', battleId: s.battle!.id })
    else break
  }
  return s
}
export const attackerIds = (s: GameState, owner: string) => ((legal(s, owner).find(a => a.type === 'DECLARE_ATTACK') as { attackerIds: string[] } | undefined)?.attackerIds ?? [])
/** A copy of `number` in `owner`'s hand other than `exclude` (one already there is used before moving another). */
export function inHand(s: GameState, owner: string, number: string, exclude: string[] = []): string {
  const there = Object.values(s.instances).find(i => i.owner === owner && i.zone === 'hand' && i.definitionId === definitionOf(number).definitionId && !exclude.includes(i.id))
  return there?.id ?? put(s, owner, number, 'hand')
}
