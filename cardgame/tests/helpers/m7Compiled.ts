import assert from 'node:assert/strict'
import { evaluateCharacteristics, hasCombatKeyword } from '../../src/game/effects/characteristics'
import type { GameState } from '../../src/game/core/types'
import type { EffectDefinition } from '../../src/game/effects/contracts'
import type { CompiledCard } from '../../src/game/cards/textCompiler'
import { currentEngineRegistry } from '../../src/lib/engine/catalog'
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

/** N Event cards of the Leader's colours (3 copies of each in the deck) for "N or more Events in your trash". */
function eventsFor(n: number, colours: string[], exclude: string): string[] | null {
  const evs = defs().filter(d => d.category === 'EVENT' && d.number !== exclude && d.colors.every(c => colours.includes(c))).map(d => d.number)
  const out: string[] = []; for (const e of evs) for (let i = 0; i < 3 && out.length < n; i++) out.push(e)
  return out.length >= n ? out : null
}
type Plan = { aliceLeader: string; extra: string[]; own: string[]; bobTargets: string[]; bobColour: string; restedTargets: boolean; seedDeck?: string; seedHand?: string; seedTrash?: string; ownLife?: number; oppLife?: number; don: number
  needsDonDeck?: boolean; triggerPlayer?: string; koVictim?: string; trashEvents?: string[]; sourcePowerMin?: number; deckMax?: number; aura?: { target: string; plain: string }; returner?: { number: string; abilityId: string }; ownPowerAtLeast?: number; fieldDonMax?: number; seedHandCost?: string; ownTargets?: { number: string; rested: boolean }[]; handMin?: number; restedDonMin?: number; ownCharsMin?: number; ownCostAtLeast?: number; ownHandMax?: number; oppHandMax?: number; oppHandMin?: number; ownRested?: number; oppRested?: number; trashMin?: number }
/** Builds the scenario needs of one ability (or reports why it cannot be built). */
function plan(card: CompiledCard, a: EffectDefinition | null, staticConds: Record<string, unknown>): Plan | string {
  const d = definitionOf(card.number), { selectors, conditions, searches, ops } = scan(a?.program ?? [])
  const conds = [...conditions.flatMap(flat), ...(a ? flat(a.condition as Record<string, unknown>) : []), ...(staticConds.whenLeaderHasTrait ? [{ kind: 'LEADER_HAS_TRAIT', trait: staticConds.whenLeaderHasTrait }] : []), ...(staticConds.leaderHasTrait ? [{ kind: 'LEADER_HAS_TRAIT', trait: staticConds.leaderHasTrait }] : []), ...(staticConds.leaderTraitIncludes ? [{ kind: 'LEADER_TRAIT_INCLUDES', text: staticConds.leaderTraitIncludes }] : []), ...(staticConds.leaderMulticolored ? [{ kind: 'LEADER_MULTICOLORED' }] : [])]
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
  // [When you play a Character]: a Character whose [Trigger] plays it (a Life card), so that it is played during Bob's turn too.
  if (a?.timing === 'ON_CHARACTER_PLAYED') {
    const byId = new Map(defs().map(d => [d.definitionId, d]))
    const t = currentEngineRegistry().definitions.find(x => x.timing === 'TRIGGER' && x.program.some(st => st.kind === 'OPERATION' && st.operation.primitive === 'playSelfFromTrigger') && x.condition.kind === 'ALWAYS'
      && x.program.every(st => st.kind !== 'CHECK') && (() => { const d = byId.get((x.source as { definitionId: string }).definitionId); return d && d.category === 'CHARACTER' && d.number !== card.number && d.colors.every(c => lead.colors.includes(c)) })())
    if (!t) return 'NO_TRIGGER_CHARACTER'
    const n = byId.get((t.source as { definitionId: string }).definitionId)!.number; extra.push(n); plan.triggerPlayer = n
  }
  // [When one of your {X} Characters is K.O.'d]: such a Character of Alice's, K.O.'d in battle by a stronger attacker.
  if (a?.timing === 'ON_CHARACTER_KO' && a.subject) {
    const sub = a.subject, v = defs().filter(d => d.category === 'CHARACTER' && d.number !== card.number && d.colors.every(c => lead.colors.includes(c)) && (!sub.traitsAny || sub.traitsAny.some(t => d.traits.includes(t))) && (sub.minBasePower === undefined || (d.power ?? -1) >= sub.minBasePower) && inert(d))
      .sort((x, y) => Number(isVanilla(y)) - Number(isVanilla(x)) || (x.power ?? 0) - (y.power ?? 0))[0]
    if (!v) return 'NO_KO_VICTIM'; extra.push(v.number); plan.koVictim = v.number
  }
  // [When a DON!! card is returned]: a catalogue Character whose [Activate: Main] costs DON!! −X returns one in the scenario.
  // During Bob's turn: a card of Alice whose [Trigger] costs DON!! −1, revealed from her Life by Bob's attack.
  if (a?.timing === 'ON_DON_RETURNED' && flat(a.condition as Record<string, unknown>).some(c => c.kind === 'OPPONENT_TURN')) {
    const byId = new Map(defs().map(d => [d.definitionId, d]))
    const t = currentEngineRegistry().definitions.find(x => x.timing === 'TRIGGER' && x.program.some(st => st.kind === 'OPERATION' && st.operation.primitive === 'returnDon') && x.condition.kind === 'ALWAYS' && !x.program.some(st => st.kind === 'CHECK')
      && (() => { const d = byId.get((x.source as { definitionId: string }).definitionId); return d && d.number !== card.number && d.colors.every(c => lead.colors.includes(c)) })())
    if (!t) return 'NO_DON_RETURNING_TRIGGER'
    const n = byId.get((t.source as { definitionId: string }).definitionId)!.number; extra.push(n); plan.triggerPlayer = n
  } else if (a?.timing === 'ON_DON_RETURNED') {
    const byId = new Map(defs().map(d => [d.definitionId, d]))
    const r = currentEngineRegistry().definitions.find(x => x.timing === 'ACTIVATE_MAIN' && x.cost.kind === 'DON_MINUS' && x.condition.kind === 'ALWAYS' && x.source.kind === 'CARD_DEFINITION' && x.source.zone === 'characters'
      && (() => { const d = byId.get((x.source as { definitionId: string }).definitionId); return d && d.number !== card.number && d.colors.every(c => lead.colors.includes(c)) })())
    if (!r) return 'NO_DON_RETURNER'
    const n = byId.get((r.source as { definitionId: string }).definitionId)!.number; extra.push(n); plan.returner = { number: n, abilityId: r.id }
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
    // "If you don't have [X]": the scenario has none of them on the field.
    if (c.kind === 'OWN_CHARACTER_COUNT' && c.atMost === 0 && c.atLeast === undefined) continue
    if (c.kind === 'OWN_CHARACTER_COUNT' && c.atLeast && (c.traitsAny || c.nameIs)) {
      const m = matching({ category: 'CHARACTER', ...(c.traitsAny ? { traitsAny: c.traitsAny } : {}), ...(c.nameIs ? { namesAny: [c.nameIs] } : {}) }, lead.colors, card.number); if (!m) return 'NO_CARD_FOR_CONDITION'
      extra.push(m); (plan.ownTargets ??= []).push({ number: m, rested: false }); continue
    }
    if (c.kind === 'TRASH_EVENTS_AT_LEAST') { const r = eventsFor(c.minimum as number, lead.colors, card.number); if (!r) return 'NO_EVENTS_FOR_TRASH'; extra.push(...new Set(r)); plan.trashEvents = r; continue }
    if (c.kind === 'LIFE_AT_MOST_OPPONENT') { plan.ownLife = 3; continue }
    if (c.kind === 'TOTAL_LIFE_AT_MOST') { const t = c.maximum as number; plan.ownLife = Math.max(1, Math.floor(t / 2)); plan.oppLife = Math.max(1, t - plan.ownLife); continue }
    if (c.kind === 'SOURCE_POWER_AT_LEAST') { plan.sourcePowerMin = c.minimum as number; continue }
    if (c.kind === 'ANY_CHARACTER_COST_AT_LEAST') { plan.ownCostAtLeast = c.minimum as number; continue }
    if (c.kind === 'OWN_CHARACTER_POWER_AT_LEAST') {
      const big = defs().filter(v => isVanilla(v) && v.colors.every(x => lead.colors.includes(x)) && (v.power ?? 0) >= (c.minimum as number))[0]; if (!big) return 'NO_STRONG_CHARACTER'
      extra.push(big.number); (plan.ownTargets ??= []).push({ number: big.number, rested: false }); continue
    }
    if (c.kind === 'FIELD_DON_AT_MOST') { plan.fieldDonMax = c.maximum as number; continue }
    if (c.kind === 'LIFE_LESS_THAN_OPPONENT') { plan.ownLife = 3; continue }
    if (c.kind === 'OWN_CHARACTER_COST_AT_LEAST') { plan.ownCostAtLeast = c.minimum as number; continue }
    if (['ALWAYS', 'LIFE_AT_LEAST', 'FIELD_DON_AT_LEAST', 'LEADER_HAS_TRAIT', 'LEADER_NAME_IS', 'LEADER_TRAIT_INCLUDES', 'LEADER_MULTICOLORED', 'CAN_ADD_LIFE_TO_HAND', 'DON_RETURNED_BY_OWN_EFFECT', 'FIELD_DON_AT_MOST_OPPONENT', 'DECK_AT_LEAST', 'YOUR_TURN', 'OPPONENT_TURN', 'HAND_AT_LEAST', 'ACTIVE_DON_AT_LEAST', 'OWN_CHARACTERS_AT_LEAST'].includes(c.kind as string)) continue
    if (!['SOURCE_ATTACHED_DON_AT_LEAST', 'LIFE_AT_MOST'].includes(c.kind as string)) return `CONDITION_${c.kind}`
  }
  // "Add up to 1 DON!! card from your DON!! deck": by turn 11 all 10 DON!! are out, two go back to the DON!! deck.
  if (ops.some(o => o.primitive === 'moveDon')) plan.needsDonDeck = true
  // An aura: one Character of the printed type and one without it, both in the deck.
  const targets = staticConds.targets as { traitsAny: string[] } | undefined
  if (targets) {
    const t = matching({ category: 'CHARACTER', traitsAny: targets.traitsAny }, lead.colors, card.number), plain = vanillas(lead.colors[0]).find(v => !v.traits.some(x => targets.traitsAny.includes(x)))
    if (!t || !plain) return 'NO_AURA_TARGET'
    extra.push(t, plain.number); plan.aura = { target: t, plain: plain.number }
  }
  for (const n of (staticConds.whenOwnCharacterNamed as string[] | undefined) ?? []) {
    const m = matching({ category: 'CHARACTER', namesAny: [n] }, lead.colors, card.number); if (!m) return 'NO_NAMED_CARD'; extra.push(m); (plan.ownTargets ??= []).push({ number: m, rested: false })
  }
  if (staticConds.whenAnyCharacterCostAtLeast !== undefined) plan.ownCostAtLeast = staticConds.whenAnyCharacterCostAtLeast as number
  if (staticConds.maximumFieldDon !== undefined) plan.fieldDonMax = staticConds.maximumFieldDon as number
  if (staticConds.whenOwnLifeAtMostOpponent) plan.ownLife = 3
  if (typeof staticConds.whenOwnNamed === 'string') { const m = matching({ category: 'CHARACTER', namesAny: [staticConds.whenOwnNamed] }, lead.colors, card.number); if (!m) return 'NO_NAMED_CARD'; extra.push(m); (plan.ownTargets ??= []).push({ number: m, rested: false }) }
  if (typeof staticConds.minimumTrashEvents === 'number') { const r = eventsFor(staticConds.minimumTrashEvents, lead.colors, card.number); if (!r) return 'NO_EVENTS_FOR_TRASH'; extra.push(...new Set(r)); plan.trashEvents = r }
  if (staticConds.maximumHandSize !== undefined) plan.ownHandMax = staticConds.maximumHandSize as number
  if (staticConds.minimumTrash !== undefined) plan.trashMin = staticConds.minimumTrash as number
  if (staticConds.maximumDeckSize !== undefined) plan.deckMax = staticConds.maximumDeckSize as number
  if (staticConds.minimumOpponentRestedCharacters !== undefined) plan.oppRested = staticConds.minimumOpponentRestedCharacters as number
  if (staticConds.minimumHandSize !== undefined) plan.handMin = staticConds.minimumHandSize as number
  if (staticConds.minimumRestedDon !== undefined) plan.restedDonMin = staticConds.minimumRestedDon as number
  if (staticConds.minimumOwnCharacters !== undefined) plan.ownCharsMin = staticConds.minimumOwnCharacters as number
  if (staticConds.whenOwnCharacterCostAtLeast !== undefined) plan.ownCostAtLeast = staticConds.whenOwnCharacterCostAtLeast as number
  // "a Character with a cost of N or more": an effect-less Character of that cost, in the deck and on Alice's field.
  if (plan.ownCostAtLeast !== undefined) {
    // An inert one (only an [On Play], not triggered when put on the field) when no effect-less Character costs that much.
    const big = defs().filter(v => inert(v) && v.number !== card.number && v.colors.every(x => lead.colors.includes(x)) && (v.cost ?? 0) >= plan.ownCostAtLeast!).sort((x, y) => Number(isVanilla(y)) - Number(isVanilla(x)) || (x.cost ?? 0) - (y.cost ?? 0))[0]
    if (!big) return 'NO_COSTLY_CHARACTER'; extra.push(big.number); (plan.ownTargets ??= []).push({ number: big.number, rested: false })
  }
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
  for (const e of p.trashEvents ?? []) put(s, 'alice', e, 'trash')
  // Printed counts: rested Characters on each side, cards in the trash, hand sizes (extra hand cards go to the deck bottom).
  const filler = (owner: string, colour: string) => vanillas(colour).find(v => v.category === 'CHARACTER')!.number
  for (let i = 0; i < (p.ownRested ?? 0); i++) put(s, 'alice', filler('alice', definitionOf(p.aliceLeader).colors[0]), 'characters', { playedEarlier: true, rested: true })
  for (let i = 0; i < (p.oppRested ?? 0); i++) put(s, 'bob', filler('bob', p.bobColour), 'characters', { playedEarlier: true, rested: true })
  for (const z = zones(s, 'alice'); z.trash.length < (p.trashMin ?? 0);) { const id = z.deck.pop()!; z.trash.push(id); s.instances[id].zone = 'trash'; s.instances[id].zoneGeneration++; s.instances[id].faceUp = true }
  // "N or less cards in your deck": the rest of the deck goes to the trash.
  for (const z = zones(s, 'alice'); z.deck.length > (p.deckMax ?? 99);) { const id = z.deck.pop()!; z.trash.push(id); s.instances[id].zone = 'trash'; s.instances[id].zoneGeneration++; s.instances[id].faceUp = true }
  const trimHand = (owner: string, n: number) => { const z = zones(s, owner); while (z.hand.length > n) { const id = z.hand.pop()!; z.deck.push(id); s.instances[id].zone = 'deck'; s.instances[id].zoneGeneration++ } }
  if (p.ownHandMax !== undefined) trimHand('alice', Math.max(0, p.ownHandMax - (p.seedHand ? 1 : 0)))
  if (p.oppHandMax !== undefined) trimHand('bob', p.oppHandMax)
  if (p.oppHandMin !== undefined && zones(s, 'bob').hand.length < p.oppHandMin) throw new Error('OPPONENT_HAND_TOO_SMALL')
  if (p.seedHandCost) put(s, 'alice', p.seedHandCost, 'hand')
  for (const t of p.ownTargets ?? []) put(s, 'alice', t.number, 'characters', { playedEarlier: true, rested: t.rested })
  const own = definitionOf(p.aliceLeader).colors[0]
  for (let i = 0; i < (p.ownCharsMin ?? 0); i++) put(s, 'alice', filler('alice', own), 'characters', { playedEarlier: true })
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
/** The option a "Choose one" MODE takes in the current scenario (each option is run in its own scenario). */
let modePick = 0
function answerAll(s: GameState, declineOptional = false): GameState {
  for (let n = 0; n < 12; n++) {
    const who = ['alice', 'bob'].find(o => pendingChoice(s, o))
    if (!who) {
      const t = legal(s, 'alice').find(a => a.type === 'ANSWER_TRIGGER') as { choiceId: string } | undefined
      if (t) { s = act(s, 'alice', { type: 'ANSWER_TRIGGER', choiceId: t.choiceId, activate: true }); continue }
      return s
    }
    const c = pendingChoice(s, who)!
    // Simultaneous triggers: the order chooser names the one that resolves first (one token).
    if (s.effects?.scheduler?.orderChoice) { s = act(s, who, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: [c.options[0].token] }); continue }
    if (s.effects?.choice?.modes !== undefined) { const o = c.options[Math.min(modePick, c.options.length - 1)]; s = act(s, who, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: [o.token] }); continue }
    const count = declineOptional && c.choiceType !== 'ORDER' ? c.min : c.choiceType === 'ORDER' ? c.options.length : c.allOrNone ? (c.options.length >= c.max ? c.max : 0) : Math.min(c.max, c.options.length)
    s = act(s, who, { type: 'ANSWER_CHOICE', choiceId: c.choiceId, tokens: c.options.slice(0, Math.max(count, c.min)).map(o => o.token) })
  }
  return s
}
type Snap = { lifeLocks: number; bobRestedDon: number; costIds: string[]; donAdds: number; restLocks: number; ev: Record<string, number>; blockerLocks: number; delayed: number; bobLife: number; aliceTrash: number; aliceLife: number; bobTrash: number; locks: number; battleMods: number; field: string[]; restedDonIds: string[]; aliceHand: number; bobHand: number; aliceChars: string[]; bobChars: string[]; trash: number; bobDeck: number; aliceDeck: number; cost: number; restedDon: number; attached: number; rested: Set<string>; power: Map<string, number>; costs: Map<string, number>; stage: number }
function snap(s: GameState): Snap {
  const a = zones(s, 'alice'), b = zones(s, 'bob'), field = [...a.leader, ...a.characters, ...a.stage, ...b.leader, ...b.characters]
  // Alice's public events by type: an effect may draw then place back, take a Life then add one (zone counts unchanged).
  const ev: Record<string, number> = {}; for (const e of s.events) if (e.actorId === 'alice') ev[e.type] = (ev[e.type] ?? 0) + 1
  return { lifeLocks: (s.effects?.lifeToHandLocks ?? []).length, bobRestedDon: b.cost.filter(id => s.instances[id].rested).length, costIds: [...a.cost], donAdds: 0, restLocks: (s.effects?.restLocks ?? []).length, ev, blockerLocks: (s.effects?.blockerRestrictions ?? []).length, delayed: (s.effects?.delayedTriggers ?? []).length, bobLife: b.life.length, aliceTrash: a.trash.length, aliceLife: a.life.length, bobTrash: b.trash.length, locks: (s.effects?.refreshLocks ?? []).length, battleMods: (s.battle?.counterModifiers ?? []).reduce((n, m) => n + m.amount, 0), field: [...a.characters, ...b.characters], restedDonIds: a.cost.filter(id => s.instances[id].rested), aliceHand: a.hand.length, bobHand: b.hand.length, aliceChars: [...a.characters], bobChars: [...b.characters], trash: b.trash.length, bobDeck: b.deck.length, aliceDeck: a.deck.length,
    cost: a.cost.length, restedDon: a.cost.filter(id => s.instances[id].rested).length, attached: a.attached.length, rested: new Set(field.filter(id => s.instances[id].rested)),
    power: new Map(field.map(id => [id, power(s, id)])), costs: new Map(field.map(id => [id, cost(s, id)])), stage: b.stage.length }
}
/** Checks every operation of `program` against the state change (before → after). */
function verify(full: Step[], before: Snap, after: Snap, s: GameState, sourceId: string | null): string[] | string {
  // "Choose one": only the steps of the option taken in this scenario.
  const modeBinds = full.flatMap(st => st.kind === 'MODE' ? [st.bind] : [])
  const program = full.filter(st => !('whenBindingNonempty' in st && st.whenBindingNonempty && modeBinds.some(m => st.whenBindingNonempty!.startsWith(`${m}.`) && st.whenBindingNonempty !== `${m}.${modePick}`)))
  const { ops, searches } = scan(program), checked: string[] = []
  const changedPower = (sign: number, amount: number) => [...before.power].some(([id, p]) => after.power.has(id) && (after.power.get(id)! - p) * sign >= amount)
  for (const op of ops) {
    const o = op as Record<string, unknown>
    switch (op.primitive) {
      case 'koCharacter': if (o.subjectBinding === 'paid') { if (!before.aliceChars.some(id => s.instances[id].zone === 'trash')) return 'OWN_KO_NOT_APPLIED'; checked.push('K.O. own'); break } { const gone = before.bobChars.filter(id => s.instances[id].zone === 'trash').length; if (!gone && before.stage <= after.stage) return 'KO_NOT_APPLIED'; checked.push('ko'); break }
      case 'restCard': if (o.subjectBinding === 'paid' ? after.restedDon <= before.restedDon && ![...after.rested].some(id => !before.rested.has(id)) : after.bobRestedDon <= before.bobRestedDon && ![...after.rested].some(id => !before.rested.has(id)) && !before.field.some(id => !before.rested.has(id) && s.instances[id].zone === 'trash')) return 'REST_NOT_APPLIED'; checked.push('rest'); break
      case 'addPower': if (!changedPower(Math.sign(o.amount as number), Math.abs(o.amount as number)) && !(o.duration === 'THIS_BATTLE' && (after.battleMods - before.battleMods) * Math.sign(o.amount as number) >= Math.abs(o.amount as number))) return 'POWER_NOT_APPLIED'; checked.push(`power ${o.amount}`); break
      case 'addCost': if (![...before.costs].some(([id, c]) => after.costs.has(id) && after.costs.get(id)! - c <= (o.amount as number) || (c > 0 && after.costs.get(id) === Math.max(0, c + (o.amount as number))))) return 'COST_NOT_APPLIED'; checked.push(`cost ${o.amount}`); break
      case 'returnToHand': if (![...before.field, ...(sourceId ? [sourceId] : [])].some(id => s.instances[id].zone === 'hand')) return 'RETURN_NOT_APPLIED'; checked.push('return'); break
      case 'moveToDeckBottom': if (![...before.field, ...(sourceId ? [sourceId] : [])].some(id => s.instances[id].zone === 'deck')) return 'BOTTOM_NOT_APPLIED'; checked.push('bottom'); break
      case 'drawCards': if (after.aliceDeck > before.aliceDeck - (o.amount as number) && (after.ev.DRAWN ?? 0) - (before.ev.DRAWN ?? 0) < (o.amount as number)) return 'DRAW_NOT_APPLIED'; checked.push(`draw ${o.amount}`); break
      case 'moveDon': if (after.cost + after.attached <= before.cost + before.attached && !after.costIds.some(id => !before.costIds.includes(id))) return 'DON_NOT_ADDED'; checked.push('add DON!!'); break
      case 'attachRestedDon': if (after.attached <= before.attached) return 'DON_NOT_GIVEN'; checked.push('give DON!!'); break
      case 'setActive': if (o.subjectBinding ? !before.restedDonIds.some(id => !s.instances[id].rested) && ![...before.rested].some(id => !after.rested.has(id)) : sourceId && s.instances[sourceId].rested) return 'NOT_SET_ACTIVE'; checked.push('set active'); break
      case 'playCard': if (after.aliceChars.length <= before.aliceChars.length && (after.ev.CARD_PLAYED ?? 0) <= (before.ev.CARD_PLAYED ?? 0)) return 'NOT_PLAYED'; checked.push('play'); break
      case 'grantKeyword': if (!(sourceId && hasCombatKeyword(s, sourceId, o.keyword as 'RUSH')) && !zones(s, 'alice').characters.some(id => hasCombatKeyword(s, id, o.keyword as 'RUSH'))) return 'KEYWORD_NOT_GRANTED'; checked.push(`keyword ${o.keyword}`); break
      case 'trashCharacter': if (!sourceId || s.instances[sourceId].zone !== 'trash') return 'NOT_TRASHED'; checked.push('trash this Character'); break
      case 'lockRefresh': if (after.locks <= before.locks) return 'REFRESH_NOT_LOCKED'; checked.push('refresh lock'); break
      case 'lockLifeToHand': if (after.lifeLocks <= before.lifeLocks) return 'LIFE_NOT_LOCKED'; checked.push('no Life to hand this turn'); break
      case 'preventRest': if (after.restLocks <= before.restLocks) return 'REST_NOT_PREVENTED'; checked.push('cannot be rested'); break
      case 'preventBlocker': if (after.blockerLocks <= before.blockerLocks) return 'BLOCKER_NOT_PREVENTED'; checked.push('no [Blocker]'); break
      case 'scheduleEndOfTurn': if (after.delayed <= before.delayed) return 'NOT_SCHEDULED'; checked.push('scheduled at end of turn'); break
      case 'lifeToHand': if (o.side === 'OPPONENT') { if (after.bobLife >= before.bobLife || after.bobHand <= before.bobHand) return 'OPPONENT_LIFE_NOT_TAKEN'; checked.push('opponent Life to hand'); break }
        if (after.aliceLife >= before.aliceLife && (after.ev.LIFE_TO_HAND ?? 0) <= (before.ev.LIFE_TO_HAND ?? 0)) return 'LIFE_NOT_TAKEN'; checked.push('Life to hand'); break
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

/** Ends Alice's turn up to Bob's Main Phase, resolving what is pending on the way ([End of Your Turn] of her Leader...). */
function endTurnAnswering(s: GameState): GameState {
  s = act(s, s.activePlayerId!, { type: 'END_MAIN' })
  // Optional costs of other cards (a Leader's [End of Your Turn]...) are declined: they are not part of the scenario.
  for (let n = 0; n < 60 && !(s.activePlayerId === 'bob' && s.phase === 'MAIN' && !['alice', 'bob'].some(o => pendingChoice(s, o))); n++) {
    s = answerAll(s, true)
    const who = s.activePlayerId!, acts = legal(s, who), alice = legal(s, 'alice')
    const start = [...alice, ...acts].find(x => x.type === 'START_EFFECT') as { effectId: string; donMinus?: { eligibleDonIds: string[]; amount: number } } | undefined
    if (acts.some(x => x.type === 'ADVANCE_PHASE')) s = act(s, who, { type: 'ADVANCE_PHASE' })
    else if (start) s = act(s, alice.includes(start as never) ? 'alice' : who, { type: 'START_EFFECT', effectId: start.effectId, ...(start.donMinus ? { donMinusIds: start.donMinus.eligibleDonIds.slice(0, start.donMinus.amount) } : {}) })
    else if (s.phase === 'MAIN') break
    else throw new Error(`END_TURN_STUCK ${s.phase} ${[...new Set([...acts, ...alice].map(x => x.type))].join(',')}`)
  }
  return s
}
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

/** "If this Character has N power or more": DON!! given to the source (+1000 each during its controller's turn) up to N. */
function powerUp(s: GameState, id: string | null, p: Plan) {
  if (!id || p.sourcePowerMin === undefined) return
  const need = Math.max(0, Math.ceil((p.sourcePowerMin - power(s, id)) / 1000))
  if (need && s.activePlayerId === 'alice') attachDon(s, 'alice', id, Math.min(need, zones(s, 'alice').cost.length))
}
/** Runs one compiled ability in a real game and checks its printed result. */
export function runAbility(card: CompiledCard, a: EffectDefinition, mode = 0): Outcome {
  modePick = mode
  // A delayed "at the end of this turn" part is run by the scenario of the ability that schedules it.
  if (a.source.kind === 'CARD_DEFINITION' && a.source.zone === 'delayed') {
    const parent = card.abilities.find(x => JSON.stringify(x.program).includes(`"definitionId":"${a.id}"`))
    if (!parent) return { ok: false, reason: 'DELAYED_WITHOUT_SCHEDULER' }
    const r = runAbility(card, parent, mode); return r.ok ? { ok: true, checked: [...r.checked, 'end of turn part'] } : r
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
        if (p.don) attachDon(s, 'alice', sourceId, p.don); powerUp(s, sourceId, p)
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
        if (p.don) attachDon(s, 'alice', sourceId, p.don); powerUp(s, sourceId, p)
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
      case 'ON_CHARACTER_PLAYED': {
        sourceId = d.category === 'LEADER' ? leaderOf(s, 'alice') : put(s, 'alice', card.number, 'characters', { playedEarlier: true })
        if (p.don) attachDon(s, 'alice', sourceId, p.don)
        if (condKinds.includes('OPPONENT_TURN')) {
          put(s, 'alice', p.triggerPlayer!, 'life'); s = endTurnAnswering(s); before = snap(s)
          const atk = put(s, 'bob', bigOf(p.bobColour), 'characters', { playedEarlier: true }); s = attack(s, atk, leaderOf(s, 'alice'))
          if (s.battle?.step === 'BLOCKER') s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle.id })
          if (s.battle?.step === 'COUNTER') s = act(s, 'alice', { type: 'PASS_COUNTER', battleId: s.battle.id })
          if (s.battle?.step === 'DAMAGE') s = act(s, 'bob', { type: 'RESOLVE_BATTLE', battleId: s.battle.id })
          // The [Trigger] plays the card; the damage then continues, and what it captured resolves.
          for (let n = 0; n < 6 && s.battle; n++) { s = answerAll(s); if (s.battle?.step === 'LIFE_CONTINUE' && legal(s, 'bob').some(x => x.type === 'CONTINUE_LIFE_DAMAGE')) s = act(s, 'bob', { type: 'CONTINUE_LIFE_DAMAGE', battleId: s.battle.id } as never); else break }
        } else { const id = put(s, 'alice', p.triggerPlayer!, 'hand'); for (const x of zones(s, 'alice').cost) s.instances[x].rested = false; before = snap(s); s = playCard(s, 'alice', id) }
        break
      }
      case 'ON_CHARACTER_KO': {
        sourceId = d.category === 'LEADER' ? leaderOf(s, 'alice') : put(s, 'alice', card.number, 'characters', { playedEarlier: true })
        if (p.don) attachDon(s, 'alice', sourceId, p.don)
        const victim = put(s, 'alice', p.koVictim!, 'characters', { playedEarlier: true, rested: true })
        s = endTurnAnswering(s); before = snap(s)
        const atk = put(s, 'bob', bigOf(p.bobColour), 'characters', { playedEarlier: true }); if (power(s, atk) <= power(s, victim)) return { ok: false, reason: 'ATTACKER_NOT_STRONGER' }
        s = attack(s, atk, victim)
        if (s.battle?.step === 'BLOCKER') s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle.id })
        if (s.battle?.step === 'COUNTER') s = act(s, 'alice', { type: 'PASS_COUNTER', battleId: s.battle.id })
        if (s.battle?.step === 'DAMAGE') s = act(s, 'bob', { type: 'RESOLVE_BATTLE', battleId: s.battle.id })
        if (s.instances[victim].zone !== 'trash') return { ok: false, reason: 'VICTIM_NOT_KOD' }
        break
      }
      case 'ON_DON_RETURNED': {
        sourceId = d.category === 'LEADER' ? leaderOf(s, 'alice') : put(s, 'alice', card.number, 'characters', { playedEarlier: true })
        if (p.triggerPlayer) {
          // Two DON!! back in the DON!! deck, so that "add up to 1 DON!!" can be observed.
          const z = zones(s, 'alice'); for (let i = 0; i < 2; i++) { const id = z.cost.pop()!; z.donDeck.push(id); s.instances[id].zone = 'donDeck'; s.instances[id].zoneGeneration++; s.instances[id].rested = false; s.instances[id].faceUp = false }
          put(s, 'alice', p.triggerPlayer, 'life'); s = endTurnAnswering(s); before = snap(s)
          const atk = put(s, 'bob', bigOf(p.bobColour), 'characters', { playedEarlier: true }); s = attack(s, atk, leaderOf(s, 'alice'))
          if (s.battle?.step === 'BLOCKER') s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle.id })
          if (s.battle?.step === 'COUNTER') s = act(s, 'alice', { type: 'PASS_COUNTER', battleId: s.battle.id })
          if (s.battle?.step === 'DAMAGE') s = act(s, 'bob', { type: 'RESOLVE_BATTLE', battleId: s.battle.id })
          for (let n = 0; n < 6 && s.battle; n++) { s = answerAll(s); if (s.battle?.step === 'LIFE_CONTINUE') s = act(s, 'bob', { type: 'CONTINUE_LIFE_DAMAGE', battleId: s.battle.id } as never); else break }
          break
        }
        const returner = put(s, 'alice', p.returner!.number, 'characters', { playedEarlier: true })
        for (const id of zones(s, 'alice').cost) s.instances[id].rested = false
        const offer = offeredEffects(s, 'alice', p.returner!.abilityId).find(o => o.effectId.includes(returner)); if (!offer?.donMinus) return { ok: false, reason: 'RETURNER_NOT_OFFERED' }
        before = snap(s)
        s = act(s, 'alice', { type: 'START_EFFECT', effectId: offer.effectId, donMinusIds: offer.donMinus.eligibleDonIds.slice(0, offer.donMinus.amount) })
        break
      }
      case 'END_OF_YOUR_TURN': { sourceId = d.category === 'LEADER' ? leaderOf(s, 'alice') : put(s, 'alice', card.number, 'characters', { playedEarlier: true }); if (p.don) attachDon(s, 'alice', sourceId, p.don); powerUp(s, sourceId, p); before = snap(s); s = act(s, 'alice', { type: 'END_MAIN' }); break }
      case 'COUNTER': case 'TRIGGER': case 'ON_KO': case 'ON_BLOCK': case 'ON_OPPONENT_ATTACK': {
        if (condKinds.includes('YOUR_TURN')) return { ok: false, reason: 'YOUR_TURN_ON_OPPONENT_TURN' }
        const ev = a.timing === 'COUNTER' ? put(s, 'alice', card.number, 'hand') : null
        if (a.timing === 'TRIGGER') put(s, 'alice', card.number, 'life')
        if (['ON_KO', 'ON_BLOCK', 'ON_OPPONENT_ATTACK'].includes(a.timing)) { sourceId = d.category === 'LEADER' ? leaderOf(s, 'alice') : put(s, 'alice', card.number, 'characters', { playedEarlier: true, rested: a.timing === 'ON_KO' }); if (p.don) attachDon(s, 'alice', sourceId, p.don); powerUp(s, sourceId, p) }
        s = endTurnAnswering(s)
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

/** Makes a printed zone-count condition false (contre-épreuve): more cards in hand, fewer in trash, more in deck, Bob's Characters active. */
function breakZoneCondition(s: GameState, m: Record<string, unknown>): boolean {
  const a = zones(s, 'alice'), move = (from: 'deck' | 'trash' | 'hand', to: 'deck' | 'trash' | 'hand') => { const id = a[from].pop()!; a[to].push(id); s.instances[id].zone = to; s.instances[id].zoneGeneration++; s.instances[id].faceUp = to === 'trash' }
  if (typeof m.maximumHandSize === 'number') { while (a.hand.length <= m.maximumHandSize && a.deck.length) move('deck', 'hand'); return true }
  if (typeof m.minimumTrash === 'number') { while (a.trash.length >= m.minimumTrash) move('trash', 'deck'); return true }
  if (typeof m.maximumDeckSize === 'number') { while (a.deck.length <= m.maximumDeckSize && a.trash.length) move('trash', 'deck'); return true }
  if (typeof m.minimumTrashEvents === 'number') { for (const id of [...a.trash]) if (s.catalog.definitions.find(d => d.definitionId === s.instances[id].definitionId)?.category === 'EVENT') { a.trash.splice(a.trash.indexOf(id), 1); a.deck.push(id); s.instances[id].zone = 'deck'; s.instances[id].zoneGeneration++; s.instances[id].faceUp = false }; return true }
  if (typeof m.minimumOpponentRestedCharacters === 'number') { for (const id of zones(s, 'bob').characters) s.instances[id].rested = false; return true }
  return false
}
/** A static modifier or conditional keyword: absent without its condition... present with it. */
export function runStatic(card: CompiledCard, item: CompiledCard['continuous'][number] | CompiledCard['conditionalKeywords'][number] | CompiledCard['attackProhibitions'][number] | CompiledCard['koProtections'][number]): Outcome {
  const p = plan(card, null, item as unknown as Record<string, unknown>)
  if (typeof p === 'string') return { ok: false, reason: p }
  try {
    let { s } = setup(card, p, 11)
    const d = definitionOf(card.number)
    // "cannot be K.O.'d in battle": attacked by a stronger Character of Bob, it stays; without its DON!! it is K.O.'d (contre-épreuve).
    if ('from' in item) {
      if (item.from !== 'BATTLE') return { ok: false, reason: 'KO_BY_EFFECT_UNTESTED' }
      const survives = (withDon: boolean) => {
        let g = setup(card, p, 11).s
        const id = put(g, 'alice', card.number, 'characters', { playedEarlier: true, rested: true })
        if (withDon && item.minimumAttachedDon) attachDon(g, 'alice', id, item.minimumAttachedDon)
        g = endTurnAnswering(g)
        const atk = put(g, 'bob', bigOf(p.bobColour), 'characters', { playedEarlier: true })
        if (power(g, atk) <= power(g, id)) throw new Error('ATTACKER_NOT_STRONGER')
        g = attack(g, atk, id); g = answerAll(g, true)
        if (g.battle?.step === 'BLOCKER') g = act(g, 'alice', { type: 'PASS_BLOCKER', battleId: g.battle.id })
        if (g.battle?.step === 'COUNTER') g = act(g, 'alice', { type: 'PASS_COUNTER', battleId: g.battle.id })
        if (g.battle?.step === 'DAMAGE') g = act(g, 'bob', { type: 'RESOLVE_BATTLE', battleId: g.battle.id })
        g = answerAll(g, true)
        return g.instances[id].zone === 'characters'
      }
      if (!survives(true)) return { ok: false, reason: 'KO_NOT_PREVENTED' }
      if (item.minimumAttachedDon && survives(false)) return { ok: false, reason: 'PROTECTED_WITHOUT_DON' }
      return { ok: true, checked: ['cannot be K.O.d in battle'] }
    }
    // "cannot attack": never offered as an attacker, while another active card of the same player is.
    if ('self' in item) {
      const id = d.category === 'LEADER' ? leaderOf(s, 'alice') : put(s, 'alice', card.number, 'characters', { playedEarlier: true })
      const other = d.category === 'LEADER' ? put(s, 'alice', vanillas(definitionOf(p.aliceLeader).colors[0])[0].number, 'characters', { playedEarlier: true }) : leaderOf(s, 'alice')
      const attackers = legal(s, 'alice').flatMap(a => a.type === 'DECLARE_ATTACK' ? a.attackerIds : [])
      if (!attackers.includes(other)) return { ok: false, reason: 'NO_ATTACK_OFFERED' }
      if (attackers.includes(id)) return { ok: false, reason: 'ATTACK_NOT_PROHIBITED' }
      try { attack(s, id, leaderOf(s, 'bob')); return { ok: false, reason: 'ATTACK_ACCEPTED' } } catch { return { ok: true, checked: ['cannot attack'] } }
    }
    if ('characteristic' in item && item.zone === 'hand') {
      const id = put(s, 'alice', card.number, 'hand')
      if (item.whenCharacter) { const big = defs().filter(x => isVanilla(x) && (x.power ?? 0) >= item.whenCharacter!.minPower && x.colors.every(c => definitionOf(bobLeaderOf(p.bobColour)!).colors.includes(c)))[0]; if (!big) return { ok: false, reason: 'NO_OPPOSING_POWER' }
        const before = evaluateCharacteristics(s, id).cost.current; if (before !== (d.cost ?? 0)) return { ok: false, reason: 'HAND_COST_WITHOUT_CONDITION' }
        s = toBobField(s, big.number) }
      const now = evaluateCharacteristics(s, id).cost.current
      return now === (d.cost ?? 0) + item.amount ? { ok: true, checked: [`hand cost ${item.amount}`] } : { ok: false, reason: `HAND_COST ${now}` }
    }
    if ('duringOpponentTurn' in item && item.duringOpponentTurn) s = endTurn(s)
    const id = d.category === 'LEADER' ? leaderOf(s, 'alice') : put(s, 'alice', card.number, 'characters', { playedEarlier: true })
    // An aura over your {X} type Characters: one of them gains the amount, a Character without the type does not.
    if ('characteristic' in item && item.targets) {
      const t = p.aura!.target, plain = definitionOf(p.aura!.plain)
      const tid = put(s, 'alice', t, 'characters', { playedEarlier: true }), pid = put(s, 'alice', plain.number, 'characters', { playedEarlier: true })
      if (item.minimumAttachedDon) attachDon(s, 'alice', id, item.minimumAttachedDon)
      if (power(s, tid) !== (definitionOf(t).power ?? 0) + item.amount) return { ok: false, reason: `AURA ${power(s, tid)}` }
      if (power(s, pid) !== (plain.power ?? 0)) return { ok: false, reason: 'AURA_ON_OTHER_TYPE' }
      return { ok: true, checked: [`aura +${item.amount}`] }
    }
    if ('characteristic' in item) {
      const printed = item.characteristic === 'POWER' ? (d.power ?? 0) : (d.cost ?? 0), read = () => item.characteristic === 'POWER' ? power(s, id) : cost(s, id)
      const donBonus = (n: number) => item.characteristic === 'POWER' && s.activePlayerId === 'alice' ? 1000 * n : 0
      if (item.minimumAttachedDon) { if (read() !== printed) return { ok: false, reason: 'ACTIVE_WITHOUT_DON' }; attachDon(s, 'alice', id, item.minimumAttachedDon) }
      const want = printed + item.amount + donBonus(item.minimumAttachedDon)
      if (read() !== want) return { ok: false, reason: `STATIC ${read()} != ${want}` }
      if (breakZoneCondition(s, item as unknown as Record<string, unknown>) && read() !== printed + donBonus(item.minimumAttachedDon)) return { ok: false, reason: 'STATIC_WITHOUT_CONDITION' }
      return { ok: true, checked: [`${item.characteristic} ${item.amount}`] }
    }
    if (item.minimumAttachedDon) { if (hasCombatKeyword(s, id, item.keyword)) return { ok: false, reason: 'KEYWORD_WITHOUT_DON' }; attachDon(s, 'alice', id, item.minimumAttachedDon) }
    if (!hasCombatKeyword(s, id, item.keyword)) return { ok: false, reason: 'KEYWORD_ABSENT' }
    if (breakZoneCondition(s, item as unknown as Record<string, unknown>) && hasCombatKeyword(s, id, item.keyword)) return { ok: false, reason: 'KEYWORD_WITHOUT_CONDITION' }
    return { ok: true, checked: [`keyword ${item.keyword}`] }
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

/** A Character played by its own [Trigger] during Bob's attack: its [On Play] activates (resolution history of the scheduler). */
export function triggerPlayActivatesOnPlay(card: CompiledCard): Outcome {
  const p = plan(card, null, {})
  if (typeof p === 'string') return { ok: false, reason: p }
  try {
    let { s } = setup(card, p, 11)
    put(s, 'alice', card.number, 'life'); s = endTurnAnswering(s)
    const atk = put(s, 'bob', bigOf(p.bobColour), 'characters', { playedEarlier: true }); s = attack(s, atk, leaderOf(s, 'alice'))
    if (s.battle?.step === 'BLOCKER') s = act(s, 'alice', { type: 'PASS_BLOCKER', battleId: s.battle.id })
    if (s.battle?.step === 'COUNTER') s = act(s, 'alice', { type: 'PASS_COUNTER', battleId: s.battle.id })
    if (s.battle?.step === 'DAMAGE') s = act(s, 'bob', { type: 'RESOLVE_BATTLE', battleId: s.battle.id })
    for (let n = 0; n < 6 && s.battle; n++) { s = answerAll(s); if (s.battle?.step === 'LIFE_CONTINUE') s = act(s, 'bob', { type: 'CONTINUE_LIFE_DAMAGE', battleId: s.battle.id } as never); else break }
    s = answerAll(s)
    const onPlay = card.abilities.find(a => a.timing === 'ON_PLAY')!
    const ran = (s.effects?.scheduler?.history ?? []).some(t => t.definitionId === onPlay.id && t.timing === 'ON_PLAY')
    return ran ? { ok: true, checked: ['[On Play] after [Trigger] play'] } : { ok: false, reason: 'ON_PLAY_NOT_ACTIVATED' }
  } catch (e) { return { ok: false, reason: `ERROR ${(e as Error).message.slice(0, 160)}` } }
}
