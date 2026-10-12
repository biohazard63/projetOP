import { projectState } from '../../game/core/game'
import { evaluateCharacteristics } from '../../game/effects/characteristics'
import type { Command, GameState, LegalAction } from '../../game/core/types'

// Deterministic server-side bot (M3-5 policy). It reads its own projection plus public battle data and the
// public Life/DON!! counts, never hidden zones of the opponent, and returns an intent that the caller sends
// through applyCommand like any player command. It never edits the state.
export type Intent = Command extends infer C ? C extends Command ? Omit<C, 'id' | 'actorId' | 'expectedVersion'> : never : never
const of = <T extends LegalAction['type']>(actions: LegalAction[], type: T) => actions.filter((a): a is Extract<LegalAction, { type: T }> => a.type === type)
const numberOf = (s: GameState, id: string) => s.catalog.definitions.find(d => d.definitionId === s.instances[id]?.definitionId)?.number
const definitionOf = (s: GameState, id: string) => s.catalog.definitions.find(d => d.definitionId === s.instances[id]?.definitionId)

export function botIntent(s: GameState, actor: string, actions: LegalAction[]): Intent {
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
