import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { consolidateDefinitions } from '../../src/game/cards/adapter'
import { REVIEWED_CARDS } from '../../src/game/cards/reviewedCards'
import { M3_ABILITY_CARDS } from '../../src/game/cards/m3Abilities'
import { PURPLE_CARDS, PURPLE_DECK, M3_FULL_REGISTRY } from '../../src/game/cards/m3PurpleDeck'
import { M3_RULESET } from '../../src/game/rulesets/m3'
import { createGame, applyCommand, getLegalActions, projectState, restoreGame } from '../../src/game/core/game'
import { evaluateCharacteristics } from '../../src/game/effects/characteristics'
import { validateRegistry } from '../../src/game/effects/contracts'
import type { CardInput } from '../../src/game/cards/types'
import type { Command, GameInput, GameState, LegalAction } from '../../src/game/core/types'

// M3-5: a complete game between two legal decks, driven only by getLegalActions/applyCommand. The policy
// below is a deterministic player: it reads its own projection plus public battle data, never the
// authoritative hidden zones, and never edits the state. Every command goes through the engine.
export const FULL_GAME_SEED = 52 // chosen by a seed sweep for mechanic coverage; the rules do not depend on it
const reviewed: CardInput[] = Object.entries(REVIEWED_CARDS).map(([number, facts]) => ({ ...structuredClone(facts), number, printingKey: `${number}::standard`, extensions: [], databaseIds: [],
  life: facts.category === 'LEADER' ? 5 : null, lifeEvidence: facts.category === 'LEADER' ? [{ field: 'life' as const, value: 5, source: 'https://en.onepiece-cardgame.com/cardlist/?series=569001', checkedAt: '2026-10-10', language: 'en' as const }] : [] }))
// Red ST01-001 deck across ST-01, OP-01, OP-06 and promotion cards; 12 numbers x4 + P-016 x2 = 50.
export const RED_M3_DECK = [
  { printingKey: 'ST01-001::standard', quantity: 1 },
  ...['ST01-003', 'ST01-006', 'ST01-007', 'ST01-008', 'ST01-009', 'ST01-010', 'OP01-016', 'OP06-009', 'OP06-013', 'ST01-014', 'OP06-017', 'OP06-018'].map(number => ({ printingKey: `${number}::standard`, quantity: 4 })),
  { printingKey: 'P-016::standard', quantity: 2 },
]
export function fullGameInput(seed = FULL_GAME_SEED): GameInput {
  const others = M3_ABILITY_CARDS.filter(card => !PURPLE_CARDS.some(p => p.number === card.number))
  const catalog = consolidateDefinitions([...reviewed, ...others, ...PURPLE_CARDS])
  if (catalog.errors.length) throw new Error(`CATALOG:${catalog.errors.join(',')}`)
  return { definitions: catalog.definitions, printings: catalog.printings, gameId: 'm3-full-game', seed, scope: 'BASIC_TURNS', chooserId: 'alice',
    ruleset: structuredClone(M3_RULESET), effectRegistry: validateRegistry(structuredClone(M3_FULL_REGISTRY)),
    players: [{ id: 'alice', cards: structuredClone(PURPLE_DECK), donCount: 10 }, { id: 'bob', cards: structuredClone(RED_M3_DECK), donCount: 10 }] }
}

type Intent = Command extends infer C ? C extends Command ? Omit<C, 'id' | 'actorId' | 'expectedVersion'> : never : never
const of = <T extends LegalAction['type']>(actions: LegalAction[], type: T) => actions.filter((a): a is Extract<LegalAction, { type: T }> => a.type === type)
const numberOf = (s: GameState, id: string) => s.catalog.definitions.find(d => d.definitionId === s.instances[id]?.definitionId)?.number
const definitionOf = (s: GameState, id: string) => s.catalog.definitions.find(d => d.definitionId === s.instances[id]?.definitionId)

function decide(s: GameState, actor: string, actions: LegalAction[]): Intent {
  const me = s.players.find(p => p.id === actor)!, foe = s.players.find(p => p.id !== actor)!
  const view = projectState(s, actor), mine = view.players.find(p => p.id === actor)!
  const choice = of(actions, 'ANSWER_CHOICE')[0]
  if (choice) {
    if (choice.choiceType === 'ORDER') return { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: choice.options.slice(0, choice.max).map(o => o.token) }
    if (choice.max === 0 || !choice.options.length) return { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: [] }
    const leader = choice.options.find(o => 'instanceId' in o && o.instanceId === me.zones.leader[0])
    if (choice.min > 1) return { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: choice.options.slice(0, choice.min).map(o => o.token) }
    return { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: [(leader ?? choice.options[0]).token] }
  }
  const trigger = of(actions, 'ANSWER_TRIGGER')[0]
  if (trigger) return { type: 'ANSWER_TRIGGER', choiceId: trigger.choiceId, activate: true }
  for (const type of ['CHOOSE_FIRST', 'MULLIGAN', 'CONTINUE_LIFE_DAMAGE', 'RESOLVE_BATTLE', 'ADVANCE_PHASE'] as const) {
    const action = of(actions, type)[0]
    if (!action) continue
    if (action.type === 'CHOOSE_FIRST') return { type: 'CHOOSE_FIRST', choice: 'FIRST' }
    if (action.type === 'MULLIGAN') return { type: 'MULLIGAN', redraw: actor === 'alice' } // covers one rule-imposed reshuffle
    if (action.type === 'CONTINUE_LIFE_DAMAGE' || action.type === 'RESOLVE_BATTLE') return { type: action.type, battleId: action.battleId }
    return { type: 'ADVANCE_PHASE' }
  }
  const battle = s.battle
  if (battle && battle.defenderId === actor) {
    const targetIsLeader = battle.target.instanceId === me.zones.leader[0]
    const blocker = of(actions, 'ACTIVATE_BLOCKER')[0]
    if (blocker) return targetIsLeader && me.zones.life.length <= 2 ? { type: 'ACTIVATE_BLOCKER', blockerId: blocker.blockerIds[0], battleId: battle.id } : { type: 'PASS_BLOCKER', battleId: battle.id }
    if (of(actions, 'PASS_BLOCKER')[0]) return { type: 'PASS_BLOCKER', battleId: battle.id }
    const attack = evaluateCharacteristics(s, battle.attacker.instanceId).power.current ?? 0
    const defence = (evaluateCharacteristics(s, battle.target.instanceId).power.current ?? 0) + battle.counterModifiers.filter(m => m.target.instanceId === battle.target.instanceId).reduce((n, m) => n + m.amount, 0)
    const gap = attack - defence + 1000
    const worth = targetIsLeader ? me.zones.life.length <= 3 : true
    if (gap > 0 && worth) {
      const events = of(actions, 'PLAY_COUNTER_EVENT')[0]
      if (events) for (const cardId of events.eventIds) {
        const number = numberOf(s, cardId), pay = events.paymentDonIds.slice(0, definitionOf(s, cardId)!.cost ?? 0)
        if (number === 'ST04-016' && gap <= 4000) return { type: 'PLAY_COUNTER_EVENT', cardId, battleId: battle.id, paymentDonIds: pay, donMinusIds: [pay[0] ?? events.donMinusIds[0]], targetId: null }
        if (number === 'ST01-014' && gap <= 3000) return { type: 'PLAY_COUNTER_EVENT', cardId, battleId: battle.id, paymentDonIds: pay, donMinusIds: [], targetId: null }
        if (number === 'OP06-017' && gap <= 3000 && me.zones.life.length >= 2) return { type: 'PLAY_COUNTER_EVENT', cardId, battleId: battle.id, paymentDonIds: pay, donMinusIds: [], targetId: null, lifePayment: true }
      }
      const characters = of(actions, 'PLAY_COUNTER_CHARACTER')[0]
      if (characters) {
        const best = [...characters.cardIds].sort((a, b) => (definitionOf(s, b)!.counter ?? 0) - (definitionOf(s, a)!.counter ?? 0))[0]
        const total = characters.cardIds.reduce((n, id) => n + (definitionOf(s, id)!.counter ?? 0), 0)
        if (best && total >= gap) return { type: 'PLAY_COUNTER_CHARACTER', cardId: best, targetId: battle.target.instanceId, battleId: battle.id }
      }
    }
    return { type: 'PASS_COUNTER', battleId: battle.id }
  }
  // Main Phase of the turn player.
  const starts = of(actions, 'START_EFFECT')
  const kaido = starts.find(a => a.effectId.startsWith('ST04-001.'))
  if (kaido?.donMinus && foe.zones.life.length > 0) {
    const field = kaido.donMinus.eligibleDonIds
    const ordered = [...field.filter(id => me.zones.cost.includes(id) && s.instances[id].rested), ...field.filter(id => me.zones.cost.includes(id) && !s.instances[id].rested), ...field.filter(id => me.zones.attached.includes(id))]
    return { type: 'START_EFFECT', effectId: kaido.effectId, donMinusIds: ordered.slice(0, kaido.donMinus.amount) }
  }
  // Keep enough active DON!! for the cheapest Counter Event in hand, to be able to defend on the next turn.
  const active = me.zones.cost.filter(id => !s.instances[id].rested).length
  const reserve = Math.min(...me.zones.hand.map(id => definitionOf(s, id)!).filter(d => d.review.counterEvent).map(d => d.cost ?? 0), Number.POSITIVE_INFINITY)
  const keep = Number.isFinite(reserve) ? reserve : 0
  const plays = of(actions, 'PLAY_CARD').filter(a => !a.requiresReplacement && a.cost <= active - keep).sort((a, b) => b.cost - a.cost || a.instanceId.localeCompare(b.instanceId))
  if (plays[0]) return { type: 'PLAY_CARD', instanceId: plays[0].instanceId, donIds: plays[0].eligibleDonIds.slice(0, plays[0].cost), replaceId: null }
  const gatling = starts.find(a => a.effectId.startsWith('OP06-018.') && active - 2 >= keep)
  if (gatling) return { type: 'START_EFFECT', effectId: gatling.effectId }
  const give = starts.find(a => a.effectId.includes('.activate-main-give-rested-don') && me.zones.cost.some(id => s.instances[id].rested))
  if (give) return { type: 'START_EFFECT', effectId: give.effectId }
  const attach = of(actions, 'ATTACH_DON')[0]
  if (attach && attach.eligibleDonIds.length > keep) return { type: 'ATTACH_DON', donIds: attach.eligibleDonIds.slice(keep), targetId: me.zones.leader[0] }
  const declare = of(actions, 'DECLARE_ATTACK')[0]
  if (declare) {
    const power = (id: string) => mine.characters.concat(mine.leader).find(c => c.id === id)?.power ?? 0
    const attacker = [...declare.attackerIds].sort((a, b) => power(b) - power(a) || a.localeCompare(b))[0]
    const targets = declare.targetIdsByAttacker?.[attacker] ?? declare.targetIds
    // A rested opponent Character the attacker can K.O. is taken first while the opponent still has 3+ Life.
    const foeView = view.players.find(p => p.id !== actor)!
    const ko = targets.filter(id => id !== foe.zones.leader[0]).map(id => foeView.characters.find(c => c.id === id)!).filter(c => (c.power ?? 0) <= power(attacker)).sort((a, b) => (b.power ?? 0) - (a.power ?? 0))[0]
    if (ko && foe.zones.life.length >= 3) return { type: 'DECLARE_ATTACK', attackerId: attacker, targetId: ko.id }
    return { type: 'DECLARE_ATTACK', attackerId: attacker, targetId: targets.includes(foe.zones.leader[0]) ? foe.zones.leader[0] : targets[0] }
  }
  return { type: 'END_MAIN' }
}

function strings(value: unknown, into: Set<string>) {
  if (typeof value === 'string') into.add(value)
  else if (Array.isArray(value)) for (const v of value) strings(v, into)
  else if (value && typeof value === 'object') for (const v of Object.values(value)) strings(v, into)
  return into
}
/** Ids of the opponent's hand, deck and Life, and of anyone's Life, that a viewer's projection exposes. */
export function leakedIds(s: GameState, viewer: string): string[] {
  const seen = strings(projectState(s, viewer), new Set())
  return s.players.flatMap(p => [...p.zones.life, ...(p.id === viewer ? [] : [...p.zones.hand, ...p.zones.deck])]).filter(id => seen.has(id))
}

export type FullGameRun = { final: GameState; commands: Command[]; checkpoints: number; leaks: string[]; coverage: Record<string, number> }
export function runFullGame(seed = FULL_GAME_SEED, checkpointEvery = 25, maxCommands = 3000): FullGameRun {
  let s = createGame(fullGameInput(seed)), checkpoints = 0
  const commands: Command[] = [], leaks: string[] = [], coverage: Record<string, number> = {}
  const count = (key: string) => { coverage[key] = (coverage[key] ?? 0) + 1 }
  while (!s.result && commands.length < maxCommands) {
    const candidates = [s.decisionPlayerId, s.activePlayerId, ...s.players.map(p => p.id)].filter((id): id is string => !!id)
    const actor = candidates.find(id => getLegalActions(s, id).length)
    if (!actor) throw new Error(`NO_LEGAL_ACTION:${s.version}`)
    const intent = decide(s, actor, getLegalActions(s, actor))
    const command = { ...intent, id: `fg-${s.version}`, actorId: actor, expectedVersion: s.version } as Command
    const result = applyCommand(s, command)
    if (!result.ok) throw new Error(`REFUSED:${s.version}:${command.type}:${result.error}`)
    s = result.state; commands.push(command)
    count(command.type)
    if (command.type === 'START_EFFECT') count(`START_EFFECT:${command.effectId.split(':')[0]}`)
    if (command.type === 'PLAY_COUNTER_EVENT') count(`COUNTER_EVENT:${numberOf(s, command.cardId)}`)
    if (command.type === 'PLAY_CARD') count(`PLAY:${numberOf(s, command.instanceId)}`)
    for (const viewer of ['alice', 'bob']) leaks.push(...leakedIds(s, viewer).map(id => `${s.version}:${viewer}:${id}`))
    if (commands.length % checkpointEvery === 0) { s = restoreGame(JSON.stringify(s)); checkpoints++ }
  }
  for (const e of s.events) count(`EVENT:${e.type}`)
  return { final: s, commands, checkpoints, leaks, coverage }
}

// Evidence writer: `node --import tsx scripts/game/m3-full-game.ts`. Refuses to overwrite different evidence.
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  const run = runFullGame()
  const trace = { seed: FULL_GAME_SEED, rulesVersion: run.final.ruleset.rulesVersion, ruleset: run.final.ruleset.id, decks: { alice: PURPLE_DECK, bob: RED_M3_DECK },
    result: run.final.result, turns: run.final.turn, commandCount: run.commands.length, checkpoints: run.checkpoints, leaks: run.leaks, coverage: run.coverage,
    commands: run.commands.map(c => ({ v: c.expectedVersion, actor: c.actorId, type: c.type, ...Object.fromEntries(Object.entries(c).filter(([k]) => !['id', 'actorId', 'expectedVersion', 'type'].includes(k))) })),
    publicEvents: run.final.events.map(e => ({ seq: e.sequence, type: e.type, actor: e.actorId ?? null })) }
  const out = resolve(__dirname, '../../../docs/game/evidence/m3/full-game-trace.json'), text = `${JSON.stringify(trace, null, 1)}\n`
  if (existsSync(out) && readFileSync(out, 'utf8') !== text) throw new Error(`EVIDENCE_EXISTS_AND_DIFFERS:${out}`)
  writeFileSync(out, text)
  console.log(JSON.stringify({ result: trace.result, turns: trace.turns, commands: trace.commandCount, checkpoints: trace.checkpoints, leaks: trace.leaks.length, out }))
}
