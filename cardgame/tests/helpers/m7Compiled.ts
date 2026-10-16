import assert from 'node:assert/strict'
import { evaluateCharacteristics, hasCombatKeyword } from '../../src/game/effects/characteristics'
import type { GameState } from '../../src/game/core/types'
import type { EffectDefinition } from '../../src/game/effects/contracts'
import type { CompiledCard } from '../../src/game/cards/textCompiler'
import { act, attachDon, attack, catalogDefinitions, deckFor, definitionOf, endTurn, finishBattle, leaderOf, legal, newGame, offeredEffects, pendingChoice, playCard, put, roundTrip, toMain } from './m6'

// M7 — generic scenarios for cards compiled from their official text. Every ability is triggered through its real command
// (play, attack, activation, Counter, Trigger from Life, K.O. in battle, end of turn, block) in a real game; every choice is
// answered with the first offered options; then every operation of the program is checked against the state before/after:
// the printed result must be visible (a K.O.'d Character is in the trash, a power is changed by the printed amount...).
// A scenario that cannot be built (no Leader for a printed condition, no card matching a search) is reported, never passed.
type Step = EffectDefinition['program'][number]
type Op = Extract<Step, { kind: 'OPERATION' }>['operation']
type Selector = Extract<Step, { kind: 'CHOICE' }>['selector']
export type Outcome = { ok: true; checked: string[] } | { ok: false; reason: string }
const defs = () => catalogDefinitions()
const zones = (s: GameState, owner: string) => s.players.find(p => p.id === owner)!.zones
const power = (s: GameState, id: string) => evaluateCharacteristics(s, id).power.current ?? 0
const cost = (s: GameState, id: string) => evaluateCharacteristics(s, id).cost.current ?? 0
const isVanilla = (d: ReturnType<typeof definitionOf>) => d.category === 'CHARACTER' && !d.review.effects.length && !d.review.effectOriginal.trim() && !d.review.triggerOriginal.trim()

/** Every selector and condition of a program, flattened (CHOICE selectors, CHECK conditions, step conditions). */
function scan(program: Step[]) {
  const selectors: Selector[] = [], conditions: Record<string, unknown>[] = [], ops: Op[] = [], searches: Extract<Step, { kind: 'SEARCH_TOP_DECK' }>[] = []
  for (const st of program) {
    if (st.kind === 'CHOICE') selectors.push(st.selector)
    if (st.kind === 'CHECK') conditions.push(st.condition as Record<string, unknown>)
    if (st.kind === 'OPERATION') ops.push(st.operation)
    if (st.kind === 'SEARCH_TOP_DECK') searches.push(st)
    if ('whenCondition' in st && st.whenCondition) conditions.push(st.whenCondition as Record<string, unknown>)
  }
  return { selectors, conditions, ops, searches }
}
// ANY_OF: the scenario meets the first printed alternative.
const flat = (c: Record<string, unknown>): Record<string, unknown>[] => c.kind === 'ALL_OF' ? (c.conditions as Record<string, unknown>[]).flatMap(flat) : c.kind === 'ANY_OF' ? flat((c.conditions as Record<string, unknown>[])[0]) : [c]

/** A Leader whose colours cover the card's and which satisfies the Leader conditions printed on it. */
function leaderFor(card: ReturnType<typeof definitionOf>, conditions: Record<string, unknown>[], cardIsLeader: boolean): string | null {
  if (cardIsLeader) return card.number
  const trait = conditions.find(c => c.kind === 'LEADER_HAS_TRAIT')?.trait as string | undefined
  const name = conditions.find(c => c.kind === 'LEADER_NAME_IS')?.name as string | undefined
  const includes = conditions.find(c => c.kind === 'LEADER_TRAIT_INCLUDES')?.text as string | undefined
  const multi = conditions.some(c => c.kind === 'LEADER_MULTICOLORED')
  const leaders = defs().filter(d => d.category === 'LEADER' && card.colors.every(c => d.colors.includes(c)) && (!trait || d.traits.includes(trait)) && (!name || d.rulesName === name)
    && (!includes || d.traits.some(t => t.includes(includes))) && (!multi || d.colors.length > 1))
  // Prefer a Leader without its own abilities (no interference with the scenario).
  return (leaders.find(d => !d.review.effects.length) ?? leaders[0])?.number ?? null
}
/** Effect-less Characters of a colour, cheapest and weakest first (scenario targets). */
const bigOf = (colour: string) => defs().filter(d => isVanilla(d) && d.colors.length === 1 && d.colors[0] === colour).filter(v => (v.power ?? 0) >= 6000).sort((a, b) => (b.power ?? 0) - (a.power ?? 0))[0].number
const inert = (d: ReturnType<typeof definitionOf>) => isVanilla(d) || (d.category === 'CHARACTER' && /^\[On Play\]/.test(d.review.effectOriginal) && !/\[(?!On Play)[A-Z][^\]]*\]/.test(d.review.effectOriginal.replace(/^\[On Play\]/, '')) && !d.review.triggerOriginal.trim() && !d.review.effects.some(e => e.kind === 'blocker'))
const vanillas = (colour: string) => defs().filter(d => inert(d) && d.colors.length === 1 && d.colors[0] === colour).sort((a, b) => Number(isVanilla(b)) - Number(isVanilla(a)) || (a.cost ?? 0) - (b.cost ?? 0) || (a.power ?? 0) - (b.power ?? 0))
/** A Leader of one colour for Bob (one without its own abilities when possible). */
const bobLeaderOf = (colour: string) => { const l = defs().filter(d => d.category === 'LEADER' && d.colors.length === 1 && d.colors[0] === colour); return (l.find(d => !d.review.effects.length) ?? l[0])?.number }

/** A catalogue card for `alice`'s deck matching a search or play filter (same colours as her Leader). */
function matching(filter: Record<string, unknown>, leaderColours: string[], exclude: string): string | null {
  const want = defs().filter(d => d.number !== exclude && d.colors.every(c => leaderColours.includes(c)) && d.category !== 'LEADER'
    && (!filter.category || d.category === filter.category) && (!filter.categories || (filter.categories as string[]).includes(d.category))
    && (!filter.traitsAny || (filter.traitsAny as string[]).some(t => d.traits.includes(t)) || (filter.namesAny as string[] | undefined)?.includes(d.rulesName))
    && (!filter.namesAny || filter.traitsAny || (filter.namesAny as string[]).includes(d.rulesName))
    && (!filter.traitIncludesAny || (filter.traitIncludesAny as string[]).some(t => d.traits.some(x => x.includes(t))))
    && (!filter.colorsAny || (filter.colorsAny as string[]).some(c => (d.colors as string[]).includes(c)))
    && (filter.maxCost === undefined || (d.cost ?? 0) <= (filter.maxCost as number)) && (filter.minCost === undefined || (d.cost ?? 0) >= (filter.minCost as number))
    && (filter.maxPower === undefined || (d.power ?? 0) <= (filter.maxPower as number))
    && (!filter.hasTrigger || !!d.review.triggerOriginal.trim()) && (!filter.nameNot || d.rulesName !== filter.nameNot) && (!filter.nameIs || d.rulesName === filter.nameIs) && (!filter.excludeRulesName || d.rulesName !== filter.excludeRulesName))
  return (want.find(d => isVanilla(d)) ?? want[0])?.number ?? null
}

type Plan = { aliceLeader: string; extra: string[]; own: string[]; bobTargets: string[]; bobColour: string; restedTargets: boolean; seedDeck?: string; seedHand?: string; seedTrash?: string; ownLife?: number; oppLife?: number; don: number
  needsDonDeck?: boolean; fieldDonMax?: number; seedHandCost?: string; ownTargets?: { number: string; rested: boolean }[]; handMin?: number; restedDonMin?: number; ownCharsMin?: number; ownCostAtLeast?: number; ownHandMax?: number; oppHandMax?: number; oppHandMin?: number; ownRested?: number; oppRested?: number; trashMin?: number }
/** Builds the scenario needs of one ability (or reports why it cannot be built). */
function plan(card: CompiledCard, a: EffectDefinition | null, staticConds: Record<string, unknown>): Plan | string {
  const d = definitionOf(card.number), { selectors, conditions, searches, ops } = scan(a?.program ?? [])
  const conds = [...conditions.flatMap(flat), ...(a ? flat(a.condition as Record<string, unknown>) : []), ...(staticConds.whenLeaderHasTrait ? [{ kind: 'LEADER_HAS_TRAIT', trait: staticConds.whenLeaderHasTrait }] : []), ...(staticConds.leaderHasTrait ? [{ kind: 'LEADER_HAS_TRAIT', trait: staticConds.leaderHasTrait }] : []), ...(staticConds.leaderTraitIncludes ? [{ kind: 'LEADER_TRAIT_INCLUDES', text: staticConds.leaderTraitIncludes }] : [])]
  const aliceLeader = leaderFor(d, conds, d.category === 'LEADER')
  if (!aliceLeader) return 'NO_LEADER_FOR_CONDITIONS'
  const lead = definitionOf(aliceLeader)
  const opp = selectors.filter(x => x.kind === 'CARDS' && (x.side === 'OPPONENT' || x.side === 'ANY') && ['characters', 'leaderOrCharacters'].includes(x.zone)) as Extract<Selector, { kind: 'CARDS' }>[]
  const maxCost = Math.min(...opp.map(x => x.maxCost ?? 20)), maxPower = Math.min(...opp.map(x => x.maxPower ?? 999999)), minCost = Math.max(0, ...opp.map(x => x.minCost ?? 0))
  const basePower = opp.some(x => x.powerBasis === 'BASE')
  const fits = (v: ReturnType<typeof definitionOf>) => (v.cost ?? 0) <= maxCost && (v.cost ?? 0) >= minCost && (v.power ?? 0) <= maxPower && (basePower || true)
  const colour = ['RED', 'GREEN', 'BLUE', 'PURPLE', 'BLACK', 'YELLOW'].find(c => vanillas(c).some(fits) && bobLeaderOf(c))
  if (opp.length && !colour) return 'NO_TARGET_FOR_FILTER'
  const bobColour = colour ?? 'RED'
  const bobTargets = opp.length ? [vanillas(bobColour).find(fits)!.number] : []
  const extra: string[] = [], own: string[] = [], plan: Plan = { aliceLeader, extra, own, bobTargets, bobColour, restedTargets: opp.some(x => x.rested), don: 0 }
  // "Up to 1 of your [Name]": a Character of that name on Alice's field (or her Leader already has it).
  for (const x of selectors) if (x.kind === 'CARDS' && x.side === 'OWN' && x.nameIs && ['characters', 'leader', 'leaderOrCharacters'].includes(x.zone) && lead.rulesName !== x.nameIs) {
    const named = defs().find(d => d.category === 'CHARACTER' && d.rulesName === x.nameIs && d.colors.every(c => lead.colors.includes(c)))
    if (!named) return 'NO_NAMED_CARD'; extra.push(named.number); own.push(named.number)
  }
  // Typed hand costs ("trash 1 {X} type card", "a card with a [Trigger]"): one such card in hand.
  const costSelectors = (a?.program ?? []).flatMap(st => st.kind === 'CHOICE' && st.bind === 'paid' ? [st.selector] : [])
  for (const x of costSelectors) if (x.kind === 'CARDS' && x.side === 'OWN' && x.zone === 'hand' && (x.traitsAny || x.hasTrigger || x.categories)) {
    const m = matching(x as unknown as Record<string, unknown>, lead.colors, card.number); if (!m) return 'NO_CARD_FOR_HAND_COST'; extra.push(m); plan.seedHandCost = m
  }
  // "Up to N of your {X} type Leader or Character cards" / "set up to N of your {X} type Characters as active": one on the field.
  for (const x of selectors) if (x.kind === 'CARDS' && x.side === 'OWN' && ['characters', 'leaderOrCharacters'].includes(x.zone) && (x.traitsAny || x.rested) && !x.isSource && !x.nameIs) {
    if (x.zone === 'leaderOrCharacters' && x.traitsAny?.some(t => lead.traits.includes(t))) continue
    const m = matching({ ...x, category: 'CHARACTER' } as unknown as Record<string, unknown>, lead.colors, card.number); if (!m) return 'NO_OWN_TARGET'; extra.push(m)
    ;(plan.ownTargets ??= []).push({ number: m, rested: !!x.rested })
  }
  for (const sr of searches) { const m = matching(sr as unknown as Record<string, unknown>, lead.colors, card.number); if (!m) return 'NO_CARD_FOR_SEARCH'; extra.push(m); plan.seedDeck = m }
  for (const op of ops.filter(o => o.primitive === 'playCard')) {
    const from = (op as { from?: string }).from
    const sel = selectors.find(x => x.kind === 'CARDS' && x.zone === from && (x.categories || x.nameIs)) as Record<string, unknown> | undefined
    if (!sel || (from !== 'hand' && from !== 'trash')) return 'PLAY_SOURCE_NOT_HAND_OR_TRASH'
    const m = matching(sel, lead.colors, card.number); if (!m) return 'NO_CARD_TO_PLAY'; extra.push(m)
    if (from === 'hand') plan.seedHand = m; else plan.seedTrash = m
  }
  for (const c of conds) {
    if (c.kind === 'SOURCE_ATTACHED_DON_AT_LEAST') plan.don = Math.max(plan.don, c.minimum as number)
    if (c.kind === 'LIFE_AT_MOST') { if (c.player === 'OPPONENT') plan.oppLife = c.maximum as number; else plan.ownLife = c.maximum as number }
    if (c.kind === 'HAND_AT_MOST') { if (c.player === 'OPPONENT') plan.oppHandMax = c.maximum as number; else plan.ownHandMax = c.maximum as number; continue }
    if (c.kind === 'HAND_AT_LEAST' && c.player === 'OPPONENT') { plan.oppHandMin = c.minimum as number; continue }
    if (c.kind === 'OWN_RESTED_CHARACTERS_AT_LEAST') { plan.ownRested = c.minimum as number; continue }
    if (c.kind === 'OPPONENT_RESTED_CHARACTERS_AT_LEAST') { plan.oppRested = c.minimum as number; continue }
    if (c.kind === 'TRASH_AT_LEAST') { plan.trashMin = c.minimum as number; continue }
    if (c.kind === 'FIELD_DON_AT_MOST') { plan.fieldDonMax = c.maximum as number; continue }
    if (c.kind === 'LIFE_LESS_THAN_OPPONENT') { plan.ownLife = 3; continue }
    if (c.kind === 'OWN_CHARACTER_COST_AT_LEAST') { plan.ownCostAtLeast = c.minimum as number; continue }
    if (['ALWAYS', 'LIFE_AT_LEAST', 'FIELD_DON_AT_LEAST', 'LEADER_HAS_TRAIT', 'LEADER_NAME_IS', 'LEADER_TRAIT_INCLUDES', 'LEADER_MULTICOLORED', 'CAN_ADD_LIFE_TO_HAND', 'FIELD_DON_AT_MOST_OPPONENT', 'DECK_AT_LEAST', 'YOUR_TURN', 'OPPONENT_TURN', 'HAND_AT_LEAST', 'ACTIVE_DON_AT_LEAST', 'OWN_CHARACTERS_AT_LEAST'].includes(c.kind as string)) continue
    if (!['SOURCE_ATTACHED_DON_AT_LEAST', 'LIFE_AT_MOST'].includes(c.kind as string)) return `CONDITION_${c.kind}`
  }
  // "Add up to 1 DON!! card from your DON!! deck": by turn 11 all 10 DON!! are out, two go back to the DON!! deck.
  if (ops.some(o => o.primitive === 'moveDon')) plan.needsDonDeck = true
  if (staticConds.minimumHandSize !== undefined) plan.handMin = staticConds.minimumHandSize as number
  if (staticConds.minimumRestedDon !== undefined) plan.restedDonMin = staticConds.minimumRestedDon as number
  if (staticConds.minimumOwnCharacters !== undefined) plan.ownCharsMin = staticConds.minimumOwnCharacters as number
  if (staticConds.whenOwnCharacterCostAtLeast !== undefined) plan.ownCostAtLeast = staticConds.whenOwnCharacterCostAtLeast as number
  if (staticConds.maximumOwnLife !== undefined) plan.ownLife = staticConds.maximumOwnLife as number
  if (typeof staticConds.minimumAttachedDon === 'number') plan.don = Math.max(plan.don, staticConds.minimumAttachedDon)
  return plan
}
/** Life reduced to `n` cards (to the trash), Life never emptied below 1 unless asked. */
function lifeTo(s: GameState, owner: string, n: number) {
  const z = zones(s, owner)
  while (z.life.length > n) { const id = z.life.pop()!; z.trash.push(id); const i = s.instances[id]; i.zone = 'trash'; i.zoneGeneration++; i.faceUp = true; s.events.push({ sequence: s.events.length, type: 'LIFE_TRASHED', actorId: owner }) }
}
/** As toMain, but answers any choice an automatic ability (a Leader's [End of Your Turn]...) asks on the way. */
function toMainAnswering(s: GameState, turn: number): GameState {
  s = act(s, 'alice', { type: 'CHOOSE_FIRST', choice: 'FIRST' })
  for (let i = 0; i < 2; i++) s = act(s, s.decisionPlayerId!, { type: 'MULLIGAN', redraw: false })
  const step = () => { s = answerAll(s); if (s.phase !== 'MAIN' && legal(s, s.activePlayerId!).some(a => a.type === 'ADVANCE_PHASE')) s = act(s, s.activePlayerId!, { type: 'ADVANCE_PHASE' }) }
  for (let n = 0; n < 400 && !(s.turn >= turn && s.phase === 'MAIN' && !['alice', 'bob'].some(o => pendingChoice(s, o))); n++) {
    if (s.phase === 'MAIN' && s.turn < turn && !['alice', 'bob'].some(o => pendingChoice(s, o))) s = act(s, s.activePlayerId!, { type: 'END_MAIN' })
    else step()
  }
  assert.equal(s.phase, 'MAIN'); assert.ok(s.turn >= turn)
  return s
}
function setup(card: CompiledCard, p: Plan, turn: number) {
  const aliceDeck = deckFor(p.aliceLeader, [...new Set([...(definitionOf(card.number).category === 'LEADER' ? [] : [card.number]), ...p.extra])])
  const bobDeck = deckFor(bobLeaderOf(p.bobColour)!, [...new Set([...p.bobTargets, bigOf(p.bobColour), ...defs().filter(x => isVanilla(x) && (x.power ?? 0) >= 10000 && x.colors.length === 1 && x.colors[0] === p.bobColour).slice(0, 1).map(x => x.number)])])
  let s = toMainAnswering(newGame(aliceDeck, bobDeck, undefined, true), turn)
  if (p.ownLife !== undefined) lifeTo(s, 'alice', Math.max(1, p.ownLife))
  if (p.oppLife !== undefined) lifeTo(s, 'bob', Math.max(1, p.oppLife))
  const targets = p.bobTargets.flatMap(n => [put(s, 'bob', n, 'characters', { playedEarlier: true }), put(s, 'bob', n, 'characters', { playedEarlier: true, rested: p.restedTargets }),
    ...(p.restedTargets ? [put(s, 'bob', n, 'characters', { playedEarlier: true, rested: true })] : [])])
  for (const n of p.own) put(s, 'alice', n, 'characters', { playedEarlier: true })
  if (p.seedDeck) put(s, 'alice', p.seedDeck, 'deckTop')
  if (p.seedTrash) put(s, 'alice', p.seedTrash, 'trash')
  // Printed counts: rested Characters on each side, cards in the trash, hand sizes (extra hand cards go to the deck bottom).
  const filler = (owner: string, colour: string) => vanillas(colour).find(v => v.category === 'CHARACTER')!.number
  for (let i = 0; i < (p.ownRested ?? 0); i++) put(s, 'alice', filler('alice', definitionOf(p.aliceLeader).colors[0]), 'characters', { playedEarlier: true, rested: true })
  for (let i = 0; i < (p.oppRested ?? 0); i++) put(s, 'bob', filler('bob', p.bobColour), 'characters', { playedEarlier: true, rested: true })
  for (const z = zones(s, 'alice'); z.trash.length < (p.trashMin ?? 0);) { const id = z.deck.pop()!; z.trash.push(id); s.instances[id].zone = 'trash'; s.instances[id].zoneGeneration++; s.instances[id].faceUp = true }
  const trimHand = (owner: string, n: number) => { const z = zones(s, owner); while (z.hand.length > n) { const id = z.hand.pop()!; z.deck.push(id); s.instances[id].zone = 'deck'; s.instances[id].zoneGeneration++ } }
  if (p.ownHandMax !== undefined) trimHand('alice', Math.max(0, p.ownHandMax - (p.seedHand ? 1 : 0)))
  if (p.oppHandMax !== undefined) trimHand('bob', p.oppHandMax)
  if (p.oppHandMin !== undefined && zones(s, 'bob').hand.length < p.oppHandMin) throw new Error('OPPONENT_HAND_TOO_SMALL')
  if (p.seedHandCost) put(s, 'alice', p.seedHandCost, 'hand')
  for (const t of p.ownTargets ?? []) put(s, 'alice', t.number, 'characters', { playedEarlier: true, rested: t.rested })
  const own = definitionOf(p.aliceLeader).colors[0]
  for (let i = 0; i < (p.ownCharsMin ?? 0); i++) put(s, 'alice', filler('alice', own), 'characters', { playedEarlier: true })
  if (p.ownCostAtLeast !== undefined) { const big = vanillas(own).filter(v => (v.cost ?? 0) >= p.ownCostAtLeast!)[0]; if (!big) throw new Error('NO_COSTLY_CHARACTER'); put(s, 'alice', big.number, 'characters', { playedEarlier: true }) }
  for (const z = zones(s, 'alice'); z.hand.length < (p.handMin ?? 0);) { const id = z.deck.shift()!; z.hand.push(id); s.instances[id].zone = 'hand'; s.instances[id].zoneGeneration++ }
  for (const id of zones(s, 'alice').cost.slice(0, Math.max(2, p.restedDonMin ?? 0))) s.instances[id].rested = true
  const seededHand = p.seedHand ? put(s, 'alice', p.seedHand, 'hand') : null
  // Two rested DON!! for "give a rested DON!!" / "set DON!! as active".
  for (const id of zones(s, 'alice').cost.slice(0, 2)) s.instances[id].rested = true
  // "If you have N or less DON!! cards on your field": the extra DON!! go back to the DON!! deck.
  if (p.fieldDonMax !== undefined) { const z = zones(s, 'alice'); while (z.cost.length + z.attached.length > p.fieldDonMax && z.cost.length) { const id = z.cost.pop()!; z.donDeck.push(id); s.instances[id].zone = 'donDeck'; s.instances[id].zoneGeneration++; s.instances[id].rested = false; s.instances[id].faceUp = false } }
  if (p.needsDonDeck) { const z = zones(s, 'alice'); for (let i = 0; i < 2 && z.donDeck.length < 2; i++) { const id = z.cost.pop()!; z.donDeck.push(id); s.instances[id].zone = 'donDeck'; s.instances[id].zoneGeneration++; s.instances[id].rested = false; s.instances[id].faceUp = false } }
  return { s, targets, seededHand }
}
/** Answers pending choices with the first offered options (pays optional costs, chooses the maximum allowed). */
function answerAll(s: GameState): GameState {
  for (let n = 0; n < 12; n++) {
    const who = ['alice', 'bob'].find(o => pendingChoice(s, o))
    if (!who) {
      const t = legal(s, 'alice').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
      if (t) { s = act(s, 'alice', { type: 'ANSWER_TRIGGER', choiceId: t.choiceId, activate: true }); continue }
      return s
    }
    const c = pendingChoice(s, who)!
    const count = c.choiceType === 'ORDER' ? c.options.length : c.allOrNone ? (c.options.length >= c.max ? c.max : 0) : Math.min(c.max, c.options.length)
    s = act(s, who, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: c.options.slice(0, Math.max(count, c.min)).map(o => o.token) })
  }
  return s
}
type Snap = { ev: Record<string, number>; blockerLocks: number; delayed: number; bobLife: number; aliceTrash: number; aliceLife: number; bobTrash: number; locks: number; battleMods: number; field: string[]; restedDonIds: string[]; aliceHand: number; bobHand: number; aliceChars: string[]; bobChars: string[]; trash: number; bobDeck: number; aliceDeck: number; cost: number; restedDon: number; attached: number; rested: Set<string>; power: Map<string, number>; costs: Map<string, number>; stage: number }
function snap(s: GameState): Snap {
  const a = zones(s, 'alice'), b = zones(s, 'bob'), field = [...a.leader, ...a.characters, ...b.leader, ...b.characters]
  // Alice's public events by type: an effect may draw then place back, take a Life then add one (zone counts unchanged).
  const ev: Record<string, number> = {}; for (const e of s.events) if (e.actorId === 'alice') ev[e.type] = (ev[e.type] ?? 0) + 1
  return { ev, blockerLocks: (s.effects?.blockerRestrictions ?? []).length, delayed: (s.effects?.delayedTriggers ?? []).length, bobLife: b.life.length, aliceTrash: a.trash.length, aliceLife: a.life.length, bobTrash: b.trash.length, locks: (s.effects?.refreshLocks ?? []).length, battleMods: (s.battle?.counterModifiers ?? []).reduce((n, m) => n + m.amount, 0), field: [...a.characters, ...b.characters], restedDonIds: a.cost.filter(id => s.instances[id].rested), aliceHand: a.hand.length, bobHand: b.hand.length, aliceChars: [...a.characters], bobChars: [...b.characters], trash: b.trash.length, bobDeck: b.deck.length, aliceDeck: a.deck.length,
    cost: a.cost.length, restedDon: a.cost.filter(id => s.instances[id].rested).length, attached: a.attached.length, rested: new Set(field.filter(id => s.instances[id].rested)),
    power: new Map(field.map(id => [id, power(s, id)])), costs: new Map(field.map(id => [id, cost(s, id)])), stage: b.stage.length }
}
/** Checks every operation of `program` against the state change (before → after). */
function verify(program: Step[], before: Snap, after: Snap, s: GameState, sourceId: string | null): string[] | string {
  const { ops, searches } = scan(program), checked: string[] = []
  const changedPower = (sign: number, amount: number) => [...before.power].some(([id, p]) => after.power.has(id) && (after.power.get(id)! - p) * sign >= amount)
  for (const op of ops) {
    const o = op as Record<string, unknown>
    switch (op.primitive) {
      case 'koCharacter': { const gone = before.bobChars.filter(id => s.instances[id].zone === 'trash').length; if (!gone && before.stage <= after.stage) return 'KO_NOT_APPLIED'; checked.push('ko'); break }
      case 'restCard': if (o.subjectBinding === 'paid' ? after.restedDon <= before.restedDon : ![...after.rested].some(id => !before.rested.has(id)) && !before.field.some(id => !before.rested.has(id) && s.instances[id].zone === 'trash')) return 'REST_NOT_APPLIED'; checked.push('rest'); break
      case 'addPower': if (!changedPower(Math.sign(o.amount as number), Math.abs(o.amount as number)) && !(o.duration === 'THIS_BATTLE' && (after.battleMods - before.battleMods) * Math.sign(o.amount as number) >= Math.abs(o.amount as number))) return 'POWER_NOT_APPLIED'; checked.push(`power ${o.amount}`); break
      case 'addCost': if (![...before.costs].some(([id, c]) => after.costs.has(id) && after.costs.get(id)! - c <= (o.amount as number) || (c > 0 && after.costs.get(id) === Math.max(0, c + (o.amount as number))))) return 'COST_NOT_APPLIED'; checked.push(`cost ${o.amount}`); break
      case 'returnToHand': if (![...before.field, ...(sourceId ? [sourceId] : [])].some(id => s.instances[id].zone === 'hand')) return 'RETURN_NOT_APPLIED'; checked.push('return'); break
      case 'moveToDeckBottom': if (![...before.field, ...(sourceId ? [sourceId] : [])].some(id => s.instances[id].zone === 'deck')) return 'BOTTOM_NOT_APPLIED'; checked.push('bottom'); break
      case 'drawCards': if (after.aliceDeck > before.aliceDeck - (o.amount as number) && (after.ev.DRAWN ?? 0) - (before.ev.DRAWN ?? 0) < (o.amount as number)) return 'DRAW_NOT_APPLIED'; checked.push(`draw ${o.amount}`); break
      case 'moveDon': if (after.cost + after.attached <= before.cost + before.attached) return 'DON_NOT_ADDED'; checked.push('add DON!!'); break
      case 'attachRestedDon': if (after.attached <= before.attached) return 'DON_NOT_GIVEN'; checked.push('give DON!!'); break
      case 'setActive': if (o.subjectBinding ? !before.restedDonIds.some(id => !s.instances[id].rested) && ![...before.rested].some(id => !after.rested.has(id)) : sourceId && s.instances[sourceId].rested) return 'NOT_SET_ACTIVE'; checked.push('set active'); break
      case 'playCard': if (after.aliceChars.length <= before.aliceChars.length) return 'NOT_PLAYED'; checked.push('play'); break
      case 'grantKeyword': if (!sourceId || !hasCombatKeyword(s, sourceId, o.keyword as 'RUSH')) return 'KEYWORD_NOT_GRANTED'; checked.push(`keyword ${o.keyword}`); break
      case 'trashCharacter': if (!sourceId || s.instances[sourceId].zone !== 'trash') return 'NOT_TRASHED'; checked.push('trash this Character'); break
      case 'lockRefresh': if (after.locks <= before.locks) return 'REFRESH_NOT_LOCKED'; checked.push('refresh lock'); break
      case 'preventBlocker': if (after.blockerLocks <= before.blockerLocks) return 'BLOCKER_NOT_PREVENTED'; checked.push('no [Blocker]'); break
      case 'scheduleEndOfTurn': if (after.delayed <= before.delayed) return 'NOT_SCHEDULED'; checked.push('scheduled at end of turn'); break
      case 'lifeToHand': if (after.aliceLife >= before.aliceLife && (after.ev.LIFE_TO_HAND ?? 0) <= (before.ev.LIFE_TO_HAND ?? 0)) return 'LIFE_NOT_TAKEN'; checked.push('Life to hand'); break
      case 'trashLife': if (after.bobLife >= before.bobLife) return 'OPPONENT_LIFE_NOT_TRASHED'; checked.push('trash opponent Life'); break
      case 'addToLife': if (after.aliceLife <= before.aliceLife && (after.ev.LIFE_ADDED ?? 0) <= (before.ev.LIFE_ADDED ?? 0)) return 'LIFE_NOT_ADDED'; checked.push('add to Life'); break
      case 'moveCard':
        if (o.player === 'OPPONENT' && o.from === 'hand') { if (after.bobHand >= before.bobHand || after.bobTrash <= before.bobTrash) return 'OPPONENT_NOT_TRASHED'; checked.push('opponent trashes'); break }
        if (o.from === 'deck' && o.to === 'trash') { if (after.aliceTrash <= before.aliceTrash || after.aliceDeck >= before.aliceDeck) return 'DECK_NOT_TRASHED'; checked.push('trash from deck'); break }
        checked.push(op.primitive); break // costs, checked by the rest of the program running
      case 'returnDon': checked.push(op.primitive); break
      case 'playSelfFromTrigger': checked.push('played from Trigger'); break
      case 'arrangeTopDeck': checked.push('arrange top'); break
      default: return `UNCHECKED_PRIMITIVE_${op.primitive}`
    }
  }
  // A search then a play of the found card leaves the hand size unchanged: the reveal of the found card is the proof.
  for (const _ of searches) { if (after.aliceHand <= before.aliceHand - 1 && !(ops.some(o => o.primitive === 'playCard') && (after.ev.CARD_REVEALED ?? 0) > (before.ev.CARD_REVEALED ?? 0))) return 'SEARCH_NOT_APPLIED'; checked.push('search') }
  return checked
}
const sourceInstance = (s: GameState, number: string) => Object.values(s.instances).find(i => i.owner === 'alice' && s.catalog.definitions.find(d => d.definitionId === i.definitionId)?.number === number && ['characters', 'leader', 'stage'].includes(i.zone))?.id ?? null

/** A Character of Bob's deck moved straight onto his field (scenario setup, as `put`). */
const toBobField = (s: GameState, number: string) => { put(s, 'bob', number, 'characters', { playedEarlier: true }); return s }

/** "At the end of this turn": the turn ends, the delayed part resolves and sets a rested DON!! active. */
function endOfTurnPart(s: GameState, a: EffectDefinition, card: CompiledCard): string | null {
  const delayed = card.abilities.filter(x => x.source.kind === 'CARD_DEFINITION' && x.source.zone === 'delayed' && JSON.stringify(a.program).includes(`"definitionId":"${x.id}"`))
  if (!delayed.length) return null
  const rested = () => zones(s, 'alice').cost.filter(id => s.instances[id].rested).length
  if (s.activePlayerId !== 'alice' || s.phase !== 'MAIN') return 'DELAYED_NOT_IN_MAIN'
  const before = rested(); s = act(s, 'alice', { type: 'END_MAIN' }); s = answerAll(s)
  return rested() < before ? null : 'DELAYED_NOT_APPLIED'
}

/** Runs one compiled ability in a real game and checks its printed result. */
export function runAbility(card: CompiledCard, a: EffectDefinition): Outcome {
  // A delayed "at the end of this turn" part is run by the scenario of the ability that schedules it.
  if (a.source.kind === 'CARD_DEFINITION' && a.source.zone === 'delayed') {
    const parent = card.abilities.find(x => JSON.stringify(x.program).includes(`"definitionId":"${a.id}"`))
    if (!parent) return { ok: false, reason: 'DELAYED_WITHOUT_SCHEDULER' }
    const r = runAbility(card, parent); return r.ok ? { ok: true, checked: [...r.checked, 'end of turn part'] } : r
  }
  const p = plan(card, a, {})
  if (typeof p === 'string') return { ok: false, reason: p }
  const d = definitionOf(card.number)
  const condKinds = flat(a.condition as Record<string, unknown>).map(c => c.kind)
  try {
    const turn = 11
    let { s, targets } = setup(card, p, turn), before: Snap, sourceId: string | null = null
    const ownTurn = () => { if (s.activePlayerId !== 'alice') s = endTurn(s) }
    const bobAttacks = (targetId: string) => { const atk = put(s, 'bob', bigOf(p.bobColour), 'characters', { playedEarlier: true }); s = attack(s, atk, targetId) }
    switch (a.timing) {
      case 'ON_PLAY': { const id = put(s, 'alice', card.number, 'hand'); before = snap(s); s = playCard(s, 'alice', id); sourceId = id; for (let n = 0; n < p.don; n++) {} break }
      case 'WHEN_ATTACKING': {
        sourceId = d.category === 'LEADER' ? leaderOf(s, 'alice') : put(s, 'alice', card.number, 'characters', { playedEarlier: true })
        if (p.don) attachDon(s, 'alice', sourceId, p.don)
        before = snap(s); s = attack(s, sourceId, leaderOf(s, 'bob')); s = answerAll(s); const mid = snap(s); s = finishBattle(s)
        const r = verify(a.program, before, mid, s, sourceId); if (typeof r === 'string') return { ok: false, reason: r }
        const late = endOfTurnPart(s, a, card); if (late) return { ok: false, reason: late }
        roundTrip(s); return { ok: true, checked: r }
      }
      case 'ACTIVATE_MAIN': {
        sourceId = d.category === 'LEADER' ? leaderOf(s, 'alice') : d.category === 'STAGE' ? put(s, 'alice', card.number, 'stage', { playedEarlier: true }) : put(s, 'alice', card.number, 'characters', { playedEarlier: true })
        for (const id of zones(s, 'alice').cost) s.instances[id].rested = false
        // "Give up to 1 rested DON!!" / "set up to 1 of your DON!! cards as active": two DON!! stay rested.
        if (scan(a.program).ops.some(o => o.primitive === 'attachRestedDon' || (o.primitive === 'setActive' && o.subjectBinding))) for (const id of zones(s, 'alice').cost.slice(0, 2)) s.instances[id].rested = true
        if (p.don) attachDon(s, 'alice', sourceId, p.don)
        const offer = offeredEffects(s, 'alice', a.id)[0]; if (!offer) return { ok: false, reason: 'NOT_OFFERED' }
        before = snap(s)
        s = act(s, 'alice', { type: 'START_EFFECT', effectId: offer.effectId, ...(offer.donMinus ? { donMinusIds: offer.donMinus.eligibleDonIds.slice(0, offer.donMinus.amount) } : {}) })
        break
      }
      case 'MAIN': {
        const id = put(s, 'alice', card.number, 'hand')
        for (const x of zones(s, 'alice').cost) s.instances[x].rested = false
        const offer = offeredEffects(s, 'alice', a.id).find(o => o.effectId.includes(id)); if (!offer) return { ok: false, reason: 'NOT_OFFERED' }
        before = snap(s); s = act(s, 'alice', { type: 'START_EFFECT', effectId: offer.effectId, ...(offer.donMinus ? { donMinusIds: offer.donMinus.eligibleDonIds.slice(0, offer.donMinus.amount) } : {}) }); break
      }
      case 'END_OF_YOUR_TURN': { sourceId = put(s, 'alice', card.number, 'characters', { playedEarlier: true }); if (p.don) attachDon(s, 'alice', sourceId, p.don); before = snap(s); s = act(s, 'alice', { type: 'END_MAIN' }); break }
      case 'COUNTER': case 'TRIGGER': case 'ON_KO': case 'ON_BLOCK': case 'ON_OPPONENT_ATTACK': {
        if (condKinds.includes('YOUR_TURN')) return { ok: false, reason: 'YOUR_TURN_ON_OPPONENT_TURN' }
        const ev = a.timing === 'COUNTER' ? put(s, 'alice', card.number, 'hand') : null
        if (a.timing === 'TRIGGER') put(s, 'alice', card.number, 'life')
        if (['ON_KO', 'ON_BLOCK', 'ON_OPPONENT_ATTACK'].includes(a.timing)) { sourceId = d.category === 'LEADER' ? leaderOf(s, 'alice') : put(s, 'alice', card.number, 'characters', { playedEarlier: true, rested: a.timing === 'ON_KO' }); if (p.don) attachDon(s, 'alice', sourceId, p.don) }
        s = endTurn(s)
        // Bob's Refresh Phase set his rested targets active again: the scenario rests them back (as before the effect).
        if (p.restedTargets) for (const id of targets.slice(1)) if (s.instances[id].zone === 'characters') s.instances[id].rested = true
        before = snap(s)
        bobAttacks(a.timing === 'ON_KO' ? sourceId! : leaderOf(s, 'alice'))
        if (a.timing === 'ON_OPPONENT_ATTACK') { const offer = offeredEffects(s, 'alice', a.id)[0]; if (offer) s = act(s, 'alice', { type: 'START_EFFECT', effectId: offer.effectId }); s = answerAll(s); break }
        if (a.timing === 'ON_BLOCK') { if (!s.battle || s.battle.step !== 'BLOCKER') return { ok: false, reason: 'NO_BLOCK_STEP' }; s = act(s, 'alice', { type: 'ACTIVATE_BLOCKER', blockerId: sourceId!, battleId: s.battle.id }); s = answerAll(s); break }
        if (s.battle?.step === 'BLOCKER') s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle.id })
        if (a.timing === 'COUNTER') {
          const c = legal(s, 'alice').find(x => x.type === 'PLAY_COUNTER_EVENT') as { paymentDonIds: string[]; battleId: string } | undefined
          if (!c) return { ok: false, reason: 'COUNTER_NOT_OFFERED' }
          before = snap(s)
          s = act(s, 'alice', { type: 'PLAY_COUNTER_EVENT', cardId: ev!, targetId: null, paymentDonIds: c.paymentDonIds.slice(0, d.cost ?? 0), donMinusIds: [], battleId: c.battleId })
          s = answerAll(s); break
        }
        if (s.battle?.step === 'COUNTER') s = act(s, 'alice', { type: 'PASS_COUNTER', battleId: s.battle.id })
        if (s.battle?.step === 'DAMAGE') s = act(s, 'bob', { type: 'RESOLVE_BATTLE', battleId: s.battle.id })
        if (a.timing === 'TRIGGER') { const t = legal(s, 'alice').find(x => x.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined; if (!t) return { ok: false, reason: 'TRIGGER_NOT_OFFERED' }; before = snap(s); s = act(s, 'alice', { type: 'ANSWER_TRIGGER', choiceId: t.choiceId, activate: true }) }
        break
      }
      default: return { ok: false, reason: `TIMING_${a.timing}` }
    }
    s = answerAll(s)
    void ownTurn
    const r = verify(a.program, before!, snap(s), s, sourceId ?? sourceInstance(s, card.number))
    if (typeof r === 'string') return { ok: false, reason: r }
    const late = endOfTurnPart(s, a, card); if (late) return { ok: false, reason: late }
    roundTrip(s)
    return { ok: true, checked: r }
  } catch (e) { return { ok: false, reason: `ERROR ${(e as Error).message.slice(0, 160)}` } }
}

/** A static modifier or conditional keyword: absent without its condition... present with it. */
export function runStatic(card: CompiledCard, item: CompiledCard['continuous'][number] | CompiledCard['conditionalKeywords'][number]): Outcome {
  const p = plan(card, null, item as unknown as Record<string, unknown>)
  if (typeof p === 'string') return { ok: false, reason: p }
  try {
    let { s } = setup(card, p, 11)
    const d = definitionOf(card.number)
    if ('characteristic' in item && item.zone === 'hand') {
      const id = put(s, 'alice', card.number, 'hand')
      if (item.whenCharacter) { const big = defs().filter(x => isVanilla(x) && (x.power ?? 0) >= item.whenCharacter!.minPower && x.colors.every(c => definitionOf(bobLeaderOf(p.bobColour)!).colors.includes(c)))[0]; if (!big) return { ok: false, reason: 'NO_OPPOSING_POWER' }
        const before = evaluateCharacteristics(s, id).cost.current; if (before !== (d.cost ?? 0)) return { ok: false, reason: 'HAND_COST_WITHOUT_CONDITION' }
        s = toBobField(s, big.number) }
      const now = evaluateCharacteristics(s, id).cost.current
      return now === (d.cost ?? 0) + item.amount ? { ok: true, checked: [`hand cost ${item.amount}`] } : { ok: false, reason: `HAND_COST ${now}` }
    }
    if (item.duringOpponentTurn) s = endTurn(s)
    const id = d.category === 'LEADER' ? leaderOf(s, 'alice') : put(s, 'alice', card.number, 'characters', { playedEarlier: true })
    if ('characteristic' in item) {
      const printed = item.characteristic === 'POWER' ? (d.power ?? 0) : (d.cost ?? 0), read = () => item.characteristic === 'POWER' ? power(s, id) : cost(s, id)
      const donBonus = (n: number) => item.characteristic === 'POWER' && s.activePlayerId === 'alice' ? 1000 * n : 0
      if (item.minimumAttachedDon) { if (read() !== printed) return { ok: false, reason: 'ACTIVE_WITHOUT_DON' }; attachDon(s, 'alice', id, item.minimumAttachedDon) }
      const want = printed + item.amount + donBonus(item.minimumAttachedDon)
      return read() === want ? { ok: true, checked: [`${item.characteristic} ${item.amount}`] } : { ok: false, reason: `STATIC ${read()} != ${want}` }
    }
    if (item.minimumAttachedDon) { if (hasCombatKeyword(s, id, item.keyword)) return { ok: false, reason: 'KEYWORD_WITHOUT_DON' }; attachDon(s, 'alice', id, item.minimumAttachedDon) }
    return hasCombatKeyword(s, id, item.keyword) ? { ok: true, checked: [`keyword ${item.keyword}`] } : { ok: false, reason: 'KEYWORD_ABSENT' }
  } catch (e) { return { ok: false, reason: `ERROR ${(e as Error).message.slice(0, 160)}` } }
}

/** Printed keywords and [Blocker]: the definition carries them. */
export function runPrinted(card: CompiledCard): Outcome {
  const d = definitionOf(card.number), checked: string[] = []
  if (card.profile.blocker) { if (!d.review.effects.some(e => e.kind === 'blocker')) return { ok: false, reason: 'BLOCKER_MISSING' }; checked.push('blocker') }
  for (const k of card.profile.keywords ?? []) { if (!(d.review.combatKeywords ?? []).includes(k)) return { ok: false, reason: `KEYWORD_${k}` }; checked.push(k) }
  return { ok: true, checked }
}
export { assert }
