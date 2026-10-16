import type { CardDefinition } from '../../../game/cards/types'
import { activeDon, battleGap, cardOf, eventBonus, fallback, of, powerOf, seats, visible, type BotContext, type BotLevel, type Intent, type Strategy, type Visible } from './context'

// Three measurably different players built from shared, public-only building blocks.
type Knobs = {
  defend: 'never' | 'low-life' | 'smart'; trigger: boolean; mulligan: 'keep' | 'smart'
  plays: 'one-cheapest' | 'all-highest' | 'value'; attack: 'leader-only' | 'all' | 'planned'
  don: 'none' | 'leader' | 'attackers'; reserve: boolean; abilities: boolean
}
const KNOBS: Record<BotLevel, Knobs> = {
  easy: { defend: 'never', trigger: false, mulligan: 'keep', plays: 'one-cheapest', attack: 'leader-only', don: 'none', reserve: false, abilities: false },
  normal: { defend: 'low-life', trigger: true, mulligan: 'keep', plays: 'all-highest', attack: 'all', don: 'leader', reserve: true, abilities: true },
  hard: { defend: 'smart', trigger: true, mulligan: 'smart', plays: 'value', attack: 'planned', don: 'attackers', reserve: true, abilities: true },
}

function choose(ctx: BotContext): Intent | null {
  const choice = of(ctx, 'ANSWER_CHOICE')[0]
  if (!choice) return null
  if (choice.choiceType === 'ORDER') return { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: choice.options.slice(0, choice.max).map(o => o.token) }
  if (choice.max === 0 || !choice.options.length) return { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: [] }
  // DON!! −X: pay in full (the effect it unlocks is worth it for every level) — never a partial answer.
  if (choice.allOrNone) return { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: choice.options.slice(0, choice.max).map(o => o.token) }
  const { me } = seats(ctx), battle = ctx.projection.battle
  const ids = choice.options.map(o => ('instanceId' in o ? o.instanceId : undefined))
  const foeOptions = choice.options.filter((o, i) => ids[i] && visible(ctx, ids[i]!) && !seats(ctx).myField.some(v => v.id === ids[i]) && !(me.hand ?? []).some(v => (v as Visible).id === ids[i]))
  let pick = choice.options[0]
  if (foeOptions.length) pick = [...foeOptions].sort((a, b) => powerOf(ctx, (b as { instanceId: string }).instanceId) - powerOf(ctx, (a as { instanceId: string }).instanceId))[0] // K.O. the strongest
  else {
    const target = battle && battle.defenderId === ctx.seat ? battle.target : me.leader[0]?.id
    pick = choice.options.find(o => 'instanceId' in o && o.instanceId === target) ?? choice.options.find(o => 'instanceId' in o && o.instanceId === me.leader[0]?.id) ?? choice.options[0]
  }
  const count = Math.max(choice.min, 1)
  return { type: 'ANSWER_CHOICE', choiceId: choice.choiceId, tokens: count === 1 ? [pick.token] : choice.options.slice(0, count).map(o => o.token) }
}

function defend(ctx: BotContext, k: Knobs): Intent | null {
  const battle = ctx.projection.battle
  if (!battle || battle.defenderId !== ctx.seat) return null
  const { me, hand } = seats(ctx), life = me.counts.life, onLeader = battle.target === me.leader[0]?.id
  const pass = of(ctx, 'PASS_BLOCKER')[0]
  if (pass) {
    const blockers = of(ctx, 'ACTIVATE_BLOCKER')[0]?.blockerIds ?? []
    if (k.defend === 'low-life' && blockers.length && onLeader && life <= 2) return { type: 'ACTIVATE_BLOCKER', blockerId: blockers[0], battleId: battle.id }
    if (k.defend === 'smart' && blockers.length && onLeader && (life <= 2 || battleGap(ctx) > 0 && life <= 3)) {
      const weakest = [...blockers].sort((a, b) => powerOf(ctx, a) - powerOf(ctx, b))[0]
      return { type: 'ACTIVATE_BLOCKER', blockerId: weakest, battleId: battle.id }
    }
    return { type: 'PASS_BLOCKER', battleId: battle.id }
  }
  const passCounter = of(ctx, 'PASS_COUNTER')[0]
  if (!passCounter) return null
  const gap = battleGap(ctx)
  const target = cardOf(ctx, battle.target)
  const worth = k.defend === 'never' ? false : k.defend === 'low-life' ? (onLeader ? life <= 3 : true) : (onLeader ? life <= 2 || (life <= 4 && gap <= 2000) : (target?.cost ?? 0) >= 4)
  if (gap > 0 && worth) {
    const characters = of(ctx, 'PLAY_COUNTER_CHARACTER')[0]
    const values = (characters?.cardIds ?? []).map(id => ({ id, value: cardOf(ctx, id)?.counter ?? 0 })).filter(c => c.value > 0)
    const events = of(ctx, 'PLAY_COUNTER_EVENT')[0]
    const eventChoice = (events?.eventIds ?? []).map(id => ({ id, d: cardOf(ctx, id) })).map(e => ({ ...e, bonus: eventBonus(e.d) })).filter(e => e.bonus >= gap && (e.d?.cost ?? 0) <= events!.paymentDonIds.length)
    const total = values.reduce((n, c) => n + c.value, 0)
    // smart: the smallest single sufficient counter; others: the biggest one first.
    const sufficient = [...values].sort((a, b) => a.value - b.value).find(c => c.value >= gap)
    if (k.defend === 'smart' && sufficient) return { type: 'PLAY_COUNTER_CHARACTER', cardId: sufficient.id, targetId: battle.target, battleId: battle.id }
    const event = eventChoice.sort((a, b) => (a.d?.cost ?? 0) - (b.d?.cost ?? 0))[0]
    if (event && events) {
      const pay = events.paymentDonIds.slice(0, event.d?.cost ?? 0), text = event.d?.review.effectOriginal ?? ''
      return { type: 'PLAY_COUNTER_EVENT', cardId: event.id, battleId: battle.id, paymentDonIds: pay, donMinusIds: /DON!! −1/.test(text) ? [pay[0] ?? events.donMinusIds[0]] : [], targetId: null, ...(/top of your Life cards/.test(text) && life >= 2 ? { lifePayment: true } : {}) }
    }
    if (values.length && total >= gap) {
      const best = [...values].sort((a, b) => b.value - a.value)[0]
      return { type: 'PLAY_COUNTER_CHARACTER', cardId: best.id, targetId: battle.target, battleId: battle.id }
    }
  }
  void hand
  return { type: 'PASS_COUNTER', battleId: battle.id }
}

function cheapestCounterEvent(ctx: BotContext): number {
  const costs = seats(ctx).hand.map(v => ctx.definition(v.definitionId)).filter((d): d is CardDefinition => !!d?.review.counterEvent).map(d => d.cost ?? 0)
  return costs.length ? Math.min(...costs) : 0
}

function mainPhase(ctx: BotContext, k: Knobs): Intent | null {
  if (!ctx.actions.some(a => a.type === 'END_MAIN')) return null
  const { me, foe } = seats(ctx), foeLife = foe.counts.life, active = activeDon(me)
  const keep = k.reserve && (k.plays !== 'value' || me.counts.life <= 3) ? cheapestCounterEvent(ctx) : 0
  const starts = of(ctx, 'START_EFFECT')
  if (k.abilities) {
    const donMinus = starts.find(a => a.donMinus)
    if (donMinus?.donMinus && foeLife > 0) {
      const field = donMinus.donMinus.eligibleDonIds, cost = me.cost as Visible[]
      const ordered = [...field.filter(id => cost.find(d => d.id === id)?.rested), ...field.filter(id => cost.some(d => d.id === id && !d.rested)), ...field.filter(id => !cost.some(d => d.id === id))]
      return { type: 'START_EFFECT', effectId: donMinus.effectId, donMinusIds: ordered.slice(0, donMinus.donMinus.amount) }
    }
  }
  const plays = of(ctx, 'PLAY_CARD').filter(a => a.cost <= active - keep)
  const pick = (() => {
    if (k.plays === 'one-cheapest') return me.characters.length === 0 || ctx.projection.turn <= 2 ? plays.filter(a => !a.requiresReplacement).sort((a, b) => a.cost - b.cost)[0] : undefined
    const open = plays.filter(a => !a.requiresReplacement)
    if (k.plays === 'all-highest') return open.sort((a, b) => b.cost - a.cost || a.instanceId.localeCompare(b.instanceId))[0]
    // value: best power per card; replace the weakest Character only by a clearly stronger one.
    const scored = plays.map(a => ({ a, power: cardOf(ctx, a.instanceId)?.power ?? 0 })).sort((x, y) => y.power - x.power || y.a.cost - x.a.cost)
    for (const { a, power } of scored) {
      if (!a.requiresReplacement) return a
      const weakest = [...a.replacementIds].sort((x, y) => powerOf(ctx, x) - powerOf(ctx, y))[0]
      if (power >= powerOf(ctx, weakest) + 3000) return { ...a, replacementIds: [weakest] }
    }
    return undefined
  })()
  if (pick) return { type: 'PLAY_CARD', instanceId: pick.instanceId, donIds: pick.eligibleDonIds.slice(0, pick.cost), replaceId: pick.requiresReplacement ? pick.replacementIds[0] : null }
  if (k.abilities) {
    // Effect ids are `<ability>:<instance>:<generation>`: match the whole instance id (`c4` must not match `c49`).
    const main = starts.find(a => !a.donMinus && !a.optionalCost && !a.effectId.includes('give-rested-don') && seats(ctx).hand.some(h => a.effectId.includes(`:${h.id}:`)) && active - keep >= 2)
    if (main) return { type: 'START_EFFECT', effectId: main.effectId }
    const give = starts.find(a => a.effectId.includes('give-rested-don') && (me.cost as Visible[]).some(d => d.rested))
    if (give) return { type: 'START_EFFECT', effectId: give.effectId }
  }
  const attach = of(ctx, 'ATTACH_DON')[0], spare = attach ? attach.eligibleDonIds.slice(keep) : []
  const declare = of(ctx, 'DECLARE_ATTACK')[0]
  const foeLeader = foe.leader[0] as Visible | undefined, foeLeaderPower = foeLeader?.power ?? 5000
  if (attach && spare.length && k.don === 'leader') return { type: 'ATTACH_DON', donIds: spare, targetId: me.leader[0].id }
  if (attach && spare.length && k.don === 'attackers' && declare) {
    // Give DON!! to the attacker that needs the fewest to beat the opposing Leader by a Counter margin.
    const margin = foe.counts.hand > 0 ? 2000 : 0
    const needs = declare.attackerIds.filter(id => attach.targetIds.includes(id)).map(id => ({ id, need: Math.max(0, Math.ceil((foeLeaderPower + margin - powerOf(ctx, id)) / 1000)) }))
      .filter(x => x.need > 0 && x.need <= spare.length).sort((a, b) => a.need - b.need)
    if (needs[0]) return { type: 'ATTACH_DON', donIds: spare.slice(0, needs[0].need), targetId: needs[0].id }
  }
  if (declare) {
    const attackers = [...declare.attackerIds].sort((a, b) => powerOf(ctx, b) - powerOf(ctx, a) || a.localeCompare(b))
    const targetsOf = (id: string) => declare.targetIdsByAttacker?.[id] ?? declare.targetIds
    if (k.attack === 'leader-only') {
      const leader = me.leader[0]?.id
      if (leader && attackers.includes(leader) && foeLeader && targetsOf(leader).includes(foeLeader.id)) return { type: 'DECLARE_ATTACK', attackerId: leader, targetId: foeLeader.id }
    } else if (k.attack === 'all') {
      const attacker = attackers[0], targets = targetsOf(attacker)
      const ko = targets.filter(id => id !== foeLeader?.id && powerOf(ctx, id) <= powerOf(ctx, attacker)).sort((a, b) => powerOf(ctx, b) - powerOf(ctx, a))[0]
      return { type: 'DECLARE_ATTACK', attackerId: attacker, targetId: ko && foeLife >= 3 ? ko : (foeLeader && targets.includes(foeLeader.id) ? foeLeader.id : targets[0]) }
    } else {
      // planned: lethal first; then remove the most valuable rested threat it can K.O.; then pressure the Leader
      // only with attackers that beat its power; weak attackers stay home.
      const lethal = foeLife === 0
      for (const attacker of attackers) {
        const targets = targetsOf(attacker), power = powerOf(ctx, attacker)
        if (lethal && foeLeader && targets.includes(foeLeader.id)) return { type: 'DECLARE_ATTACK', attackerId: attacker, targetId: foeLeader.id }
        const threat = targets.filter(id => id !== foeLeader?.id && powerOf(ctx, id) <= power).sort((a, b) => (cardOf(ctx, b)?.cost ?? 0) - (cardOf(ctx, a)?.cost ?? 0) || powerOf(ctx, b) - powerOf(ctx, a))[0]
        if (threat && (cardOf(ctx, threat)?.cost ?? 0) >= 3) return { type: 'DECLARE_ATTACK', attackerId: attacker, targetId: threat }
        if (foeLeader && targets.includes(foeLeader.id) && power >= foeLeaderPower) return { type: 'DECLARE_ATTACK', attackerId: attacker, targetId: foeLeader.id }
      }
    }
  }
  return { type: 'END_MAIN' }
}

function decide(level: BotLevel) {
  const k = KNOBS[level]
  return (ctx: BotContext): Intent => {
    const chosen = choose(ctx); if (chosen) return chosen
    const first = of(ctx, 'CHOOSE_FIRST')[0]; if (first) return { type: 'CHOOSE_FIRST', choice: 'FIRST' }
    if (of(ctx, 'MULLIGAN')[0]) {
      const cheap = seats(ctx).hand.filter(v => (ctx.definition(v.definitionId)?.cost ?? 9) <= 2 && ctx.definition(v.definitionId)?.category === 'CHARACTER').length
      return { type: 'MULLIGAN', redraw: k.mulligan === 'smart' && cheap === 0 }
    }
    const trigger = of(ctx, 'ANSWER_TRIGGER')[0]; if (trigger) return { type: 'ANSWER_TRIGGER', choiceId: trigger.choiceId, activate: k.trigger }
    for (const type of ['CONTINUE_LIFE_DAMAGE', 'RESOLVE_BATTLE'] as const) { const x = of(ctx, type)[0]; if (x) return { type, battleId: x.battleId } }
    if (ctx.actions.length === 1 && ctx.actions[0].type === 'ADVANCE_PHASE') return { type: 'ADVANCE_PHASE' }
    return defend(ctx, k) ?? mainPhase(ctx, k) ?? fallback(ctx)
  }
}
export const STRATEGIES: Record<BotLevel, Strategy> = {
  easy: { id: 'easy', decide: decide('easy') },
  normal: { id: 'normal', decide: decide('normal') },
  hard: { id: 'hard', decide: decide('hard') },
}
