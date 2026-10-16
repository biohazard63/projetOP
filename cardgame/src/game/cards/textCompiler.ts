import type { EffectDefinition } from '../effects/contracts'
import type { LocalProfile } from './localCards'
import { addCost, addDon, after, bindAll, check, donMinus, draw, drawThenTrash, lookTopAndPlace, giveRestedDon, grantKeyword, ko, opponentPower, ownLeaderOrCharacter, playChosen, playThisCardSteps, power, rest, returnToHand, setActive, toDeckBottom, trashFromHand, upTo, ability } from './dsl'

// M7 — compiler of official English card texts into the declarative DSL, for the recurring wordings only. A card is compiled
// only when every word of its text is recognised by one of the templates below; any other word leaves it to a manual review
// (`unparsed`), never to a guess. Each template emits the same steps as the hand-written, already certified cards. The runtime
// never sees a card number: this file only assembles declarative definitions from the printed text.
type Step = EffectDefinition['program'][number]
type Timing = EffectDefinition['timing']
type Zone = Extract<EffectDefinition['source'], { kind: 'CARD_DEFINITION' }>['zone']
type Condition = EffectDefinition['condition']
type BaseCondition = Exclude<Condition, { kind: 'ALL_OF' | 'ANY_OF' }>
type Filter = Parameters<typeof upTo>[2]
type Category = 'LEADER' | 'CHARACTER' | 'EVENT' | 'STAGE'
export type Continuous = { id: string; definitionId: string; zone: 'characters' | 'leader' | 'hand'; characteristic: 'POWER' | 'COST'; amount: number; minimumAttachedDon: number; duringYourTurn?: true; duringOpponentTurn?: true; whenLeaderHasTrait?: string; maximumOwnLife?: number; minimumOwnLife?: number; whenCharacter?: { side: 'OWN' | 'OPPONENT'; minPower: number; powerBasis: 'CURRENT' | 'BASE' } }
export type ConditionalKeyword = { id: string; definitionId: string; zone: 'characters' | 'leader'; keyword: 'RUSH' | 'DOUBLE_ATTACK' | 'BANISH' | 'BLOCKER'; minimumAttachedDon: number; leaderHasTrait?: string }
export const COMPILER_VERSION = 'm7-text-compiler-1'

export type CompiledCard = {
  number: string
  profile: LocalProfile
  abilities: EffectDefinition[]
  /** Static modifiers (power/cost auras of the card itself, cost of the card in hand) and conditional keywords. */
  continuous: Continuous[]
  conditionalKeywords: ConditionalKeyword[]
  /** Template names used, one per recognised action (the certification tests are grouped by template). */
  templates: string[]
  /** Text the compiler could not recognise: the card must then be reviewed by hand. */
  unparsed: string[]
}

const REMINDER: Record<string, RegExp> = {
  BLOCKER: /\(After your opponent declares an attack, you may rest this card to make it the new target of the attack\.\)/g,
  RUSH: /\(This card can attack on the turn in which it is played\.\)/g,
  DOUBLE_ATTACK: /\(This card deals 2 damage\.\)/g,
  BANISH: /\(When this card deals damage, the target card is trashed without activating its Trigger\.\)/g,
  DON_MINUS: /\(You may return the specified number of DON!! cards from your field to your DON!! deck\.\)/g,
  REST_DON: /\(You may rest the specified number of DON!! cards in your cost area\.\)/g,
}
const CIRCLED: Record<string, number> = { '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6, '➀': 1, '➁': 2, '➂': 3, '➃': 4, '➄': 5, '➅': 6 }
const clean = (s: string) => s.replace(/[’‘]/g, "'").replace(/[−–]/g, '-').replace(/＜/g, '<').replace(/＞/g, '>').replace(/\s+/g, ' ').trim()

const TIMINGS: Record<string, Timing> = { 'On Play': 'ON_PLAY', 'When Attacking': 'WHEN_ATTACKING', 'On K.O.': 'ON_KO', Main: 'MAIN', Counter: 'COUNTER', 'Activate: Main': 'ACTIVATE_MAIN', 'Activate:Main': 'ACTIVATE_MAIN', 'End of Your Turn': 'END_OF_YOUR_TURN', 'On Block': 'ON_BLOCK', "On Your Opponent's Attack": 'ON_OPPONENT_ATTACK', Trigger: 'TRIGGER' }
const PREFIX = /^\[(On Play|When Attacking|On K\.O\.|Main|Counter|Activate: ?Main|End of Your Turn|On Block|On Your Opponent's Attack|Trigger|Once Per Turn|Your Turn|Opponent's Turn|DON!! x\d)\]\s*/

/** "with a cost of 3 or less", "with 4000 power or less", "with 5000 base power or less", "with a cost of 0". */
function parseFilter(text: string): Partial<Filter> | null {
  const t = text.trim()
  if (!t) return {}
  let m = /^with a (base )?cost of (\d+)( or less)?$/.exec(t)
  if (m) return { maxCost: Number(m[2]), ...(m[3] ? {} : { minCost: Number(m[2]) }), ...(m[1] ? { costBasis: 'BASE' as const } : {}) }
  if ((m = /^with (\d+) (base )?power or less$/.exec(t))) return { maxPower: Number(m[1]), ...(m[2] ? { powerBasis: 'BASE' as const } : {}) }
  return null
}
/** "{A} type", "{A} or {B} type", "red", "{A} type Character" ... the qualifiers of a card to search or play. */
function parseQualifier(text: string): { filter: Record<string, unknown>; rest: string } | null {
  let t = text.trim()
  const filter: Record<string, unknown> = {}
  const colour = /^(red|green|blue|purple|black|yellow)(?: |$)/.exec(t)
  if (colour) { filter.colorsAny = [colour[1].toUpperCase()]; t = t.slice(colour[0].length) }
  const types = /^((?:\{[^}]+\}(?:, | or |, or )?)+) type(?: |$)/.exec(t)
  if (types) { filter.traitsAny = [...types[1].matchAll(/\{([^}]+)\}/g)].map(x => x[1]); t = t.slice(types[0].length) }
  return { filter, rest: t }
}

type Ctx = { n: number; templates: string[] }
const fresh = (ctx: Ctx, base: string) => `${base}${++ctx.n}`
const OPP = (filter: Partial<Filter> = {}): Filter => ({ side: 'OPPONENT', zone: 'characters', ...filter } as Filter)

/** One action sentence (no trailing period) → steps, or null when no template recognises it. */
function action(text: string, ctx: Ctx, category: Category, timing: Timing): Step[] | null {
  const t = text.trim()
  let m: RegExpExecArray | null
  const emit = (name: string, steps: Step[]) => { ctx.templates.push(name); return steps }
  // K.O. / rest up to N of your opponent's (rested) Characters (with ...)
  if ((m = /^(K\.O\.|Rest) up to (\d) of your opponent's (rested )?Characters?(?: (.*))?$/.exec(t))) {
    const filter = parseFilter(m[4] ?? ''); if (!filter) return null
    const b = fresh(ctx, 'target')
    return emit(m[1] === 'Rest' ? 'rest-opponent' : 'ko-opponent', [upTo(Number(m[2]), b, OPP({ ...filter, ...(m[3] ? { rested: true } : {}) })), m[1] === 'Rest' ? rest(b) : ko(b)])
  }
  // Give up to N of your opponent's Characters -X power / cost during this turn
  if ((m = /^Give up to (\d) of your opponent's (Leader or Character(?: card)?s|(?:rested )?Characters?) -(\d+) (power|cost) during this turn$/.exec(t))) {
    const b = fresh(ctx, 'target'), zone = m[2].startsWith('Leader') ? 'leaderOrCharacters' : 'characters', rested = m[2].startsWith('rested') ? { rested: true } : {}
    if (m[4] === 'power') return emit('power-opponent', [upTo(Number(m[1]), b, { side: 'OPPONENT', zone, ...rested } as Filter), opponentPower(-Number(m[3]), b)])
    if (m[2].startsWith('rested')) return null
    if (zone !== 'characters') return null
    return emit('cost-opponent', [upTo(Number(m[1]), b, OPP()), addCost(b, -Number(m[3]))])
  }
  // Return up to N (of your opponent's) Character(s) (with ...) to the owner's hand / place ... at the bottom of the owner's deck
  if ((m = /^(Return|Place) up to (\d) (of your opponent's )?Characters?(?: (with [^]*?))? (to the owner's hand|at the bottom of the owner's deck)$/.exec(t))) {
    if ((m[1] === 'Return') !== m[5].startsWith('to')) return null
    const filter = parseFilter(m[4] ?? ''); if (!filter) return null
    const b = fresh(ctx, 'target'), sel = { side: m[3] ? 'OPPONENT' : 'ANY', zone: 'characters', ...filter } as Filter
    return emit(m[1] === 'Return' ? 'return-hand' : 'deck-bottom', [upTo(Number(m[2]), b, sel), m[1] === 'Return' ? returnToHand(b) : toDeckBottom(b)])
  }
  // [Trigger] Play this card (a Character or Stage; with 5 Characters one is trashed first, CR 1.2.1 §3-7-6-1).
  if (/^Play this card$/.test(t)) return timing === 'TRIGGER' && category !== 'EVENT' && category !== 'LEADER' ? emit('trigger-play', playThisCardSteps()) : null
  if ((m = /^Look at (\d) cards from the top of your deck and place them at the top or bottom of the deck in any order$/.exec(t))) return emit('look-place', lookTopAndPlace(Number(m[1])))
  // Up to N of your [Name] cards gains +X power during this turn/battle
  if ((m = /^Up to (\d) of your \[([^\]]+)\](?: cards)? gains? \+(\d+) power during this (turn|battle)$/.exec(t))) {
    const b = fresh(ctx, 'boosted')
    return emit('power-named', [upTo(Number(m[1]), b, { side: 'OWN', zone: 'leaderOrCharacters', nameIs: m[2] } as Filter), power(b, Number(m[3]), m[4] === 'turn' ? 'THIS_TURN' : 'THIS_BATTLE')])
  }
  if ((m = /^Draw (\d) cards?$/.exec(t))) return emit('draw', [draw(Number(m[1]))])
  if ((m = /^Draw (\d) cards? and trash (\d) cards? from your hand$/.exec(t))) return emit('draw-trash', drawThenTrash(Number(m[1]), Number(m[2])))
  // Up to N of your Leader or Character cards gains +X power during this turn / battle
  if ((m = /^Up to (\d) of your Leader or Character(?: card)?s gains? \+(\d+) power during this (turn|battle)$/.exec(t))) {
    const b = fresh(ctx, 'boosted')
    return emit('power-own', [ownLeaderOrCharacter(Number(m[1]), b), power(b, Number(m[2]), m[3] === 'turn' ? 'THIS_TURN' : 'THIS_BATTLE')])
  }
  if ((m = /^(This Character|This Leader|Your Leader) gains \+(\d+) power during this (turn|battle)$/.exec(t))) {
    if (m[1] === 'This Character' && category !== 'CHARACTER') return null
    if (m[1] === 'This Leader' && category !== 'LEADER') return null
    const b = fresh(ctx, 'self'), sel = m[1] === 'Your Leader' ? { side: 'OWN', zone: 'leader' } : { side: 'OWN', zone: category === 'LEADER' ? 'leader' : 'characters', isSource: true }
    return emit(m[1] === 'Your Leader' ? 'power-leader' : 'power-self', [bindAll(b, sel as Filter), power(b, Number(m[2]), m[3] === 'turn' ? 'THIS_TURN' : 'THIS_BATTLE')])
  }
  if ((m = /^This Character gains \[(Rush|Double Attack|Banish)\] during this turn$/.exec(t))) {
    if (category !== 'CHARACTER') return null
    const b = fresh(ctx, 'self'), kw = { Rush: 'RUSH', 'Double Attack': 'DOUBLE_ATTACK', Banish: 'BANISH' }[m[1]] as 'RUSH'
    return emit('keyword-self', [bindAll(b, { side: 'OWN', zone: 'characters', isSource: true } as Filter), grantKeyword(kw, 'THIS_TURN', b)])
  }
  if ((m = /^Add up to 1 DON!! card from your DON!! deck and (rest it|set it as active)$/.exec(t))) return emit('add-don', [addDon(m[1] === 'rest it')])
  if (/^Give up to 1 rested DON!! card to your Leader or 1 of your Characters$/.test(t)) {
    const b = fresh(ctx, 'donTarget')
    return emit('give-don', [ownLeaderOrCharacter(1, b), ...giveRestedDon(b)])
  }
  if ((m = /^Set up to (\d) of your DON!! cards as active$/.exec(t))) {
    const b = fresh(ctx, 'don')
    return emit('don-active', [upTo(Number(m[1]), b, { side: 'OWN', zone: 'cost', rested: true } as Filter), setActive(b)])
  }
  if (/^Set this Character as active$/.test(t) && category === 'CHARACTER') return emit('self-active', [setActive()])
  // Look at N cards from the top of your deck; reveal up to 1 <qualifier> card (other than [X]) and add it to your hand. (rest)
  if ((m = /^Look at (\d+) cards from the top of your deck; reveal up to 1 (.*?) ?(card|Character card|Event|Event card|Stage card)( with a type including "[^"]+")?(?: other than \[([^\]]+)\])? and add it to your hand §(BOTTOM|TRASH)$/.exec(t))) {
    const q = parseQualifier(m[2] ? m[2] + ' ' : ''); if (!q || q.rest.trim()) return null
    if (m[4]) q.filter.traitIncludesAny = [/"([^"]+)"/.exec(m[4])![1]]
    const remainder = m[6] === 'TRASH' ? 'TRASH' : 'BOTTOM_ANY_ORDER'
    if (!q.filter.traitsAny && !q.filter.colorsAny && !q.filter.traitIncludesAny && m[3] === 'card') return null
    const category = m[3].startsWith('Character') ? 'CHARACTER' : m[3].startsWith('Event') ? 'EVENT' : m[3].startsWith('Stage') ? 'STAGE' : undefined
    return emit('search', [{ kind: 'SEARCH_TOP_DECK', amount: Number(m[1]), ...q.filter, ...(category ? { category } : {}), ...(m[5] ? { excludeRulesName: m[5] } : {}), maxSelected: 1, bind: fresh(ctx, 'found'), revealSelected: true, destination: 'hand', remainder } as Step])
  }
  if ((m = /^Look at (\d+) cards from the top of your deck; reveal up to 1 \[([^\]]+)\](?: or (\{[^}]+\}) type card)?(?: other than \[([^\]]+)\])? and add it to your hand §(BOTTOM|TRASH)$/.exec(t))) {
    if (m[4] && !m[3]) return null
    return emit('search', [{ kind: 'SEARCH_TOP_DECK', amount: Number(m[1]), namesAny: [m[2]], ...(m[3] ? { traitsAny: [m[3].slice(1, -1)] } : {}), ...(m[4] ? { excludeRulesName: m[4] } : {}), maxSelected: 1, bind: fresh(ctx, 'found'), revealSelected: true, destination: 'hand', remainder: m[5] === 'TRASH' ? 'TRASH' : 'BOTTOM_ANY_ORDER' } as Step])
  }
  // Play up to 1 <qualifier> Character card (other than [X]) with a cost of N or less from your hand (rested)
  if ((m = /^Play up to 1 (.*?)Character card(?: other than \[([^\]]+)\])?(?: (with (?:a cost of \d+(?: or less)?|\d+ power or less)))? from your hand( rested)?$/.exec(t))) {
    const q = parseQualifier(m[1]); if (!q || q.rest.trim()) return null
    const filter = parseFilter(m[3] ?? ''); if (!filter) return null
    return emit('play-hand', playChosen(fresh(ctx, 'play'), 'hand', { categories: ['CHARACTER'], ...q.filter, ...filter, ...(m[2] ? { nameNot: m[2] } : {}) } as never, { rested: Boolean(m[4]) }))
  }
  // K.O. up to N of your opponent's Stages (with a cost of N or less)
  if ((m = /^K\.O\. up to (\d) of your opponent's Stages?(?: (.*))?$/.exec(t))) {
    const filter = parseFilter(m[2] ?? ''); if (!filter) return null
    const b = fresh(ctx, 'target')
    return emit('ko-stage', [upTo(Number(m[1]), b, { side: 'OPPONENT', zone: 'stage', ...filter } as Filter), { kind: 'OPERATION', operation: { primitive: 'koCharacter', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: b } } as Step])
  }
  // "X and Y": two actions of one sentence ("Draw 1 card and rest up to 1 of your opponent's Characters").
  const and = t.split(' and ')
  for (let i = 1; i < and.length; i++) {
    const left = and.slice(0, i).join(' and '), right = and.slice(i).join(' and ')
    const probe: Ctx = { n: ctx.n, templates: [] }
    const a = action(left, probe, category, timing), b = a && action(right.charAt(0).toUpperCase() + right.slice(1), probe, category, timing)
    if (a && b) { ctx.n = probe.n; ctx.templates.push(...probe.templates); return [...a, ...b] }
  }
  return null
}

/** "If your Leader has the {X} type, ", "If you have N or less Life cards, " ... → a condition checked before the actions. */
function leadingCondition(text: string): { condition: BaseCondition; rest: string } | null {
  let m: RegExpExecArray | null
  if ((m = /^If your Leader has the \{([^}]+)\} type, (.*)$/.exec(text))) return { condition: { kind: 'LEADER_HAS_TRAIT', trait: m[1] }, rest: m[2] }
  if ((m = /^If your Leader is \[([^\]]+)\], (.*)$/.exec(text))) return { condition: { kind: 'LEADER_NAME_IS', name: m[1] }, rest: m[2] }
  if ((m = /^If you have (\d+) or less Life cards, (.*)$/.exec(text))) return { condition: { kind: 'LIFE_AT_MOST', player: 'CONTROLLER', maximum: Number(m[1]) }, rest: m[2] }
  if ((m = /^If you have (\d+) or more Life cards, (.*)$/.exec(text))) return { condition: { kind: 'LIFE_AT_LEAST', player: 'CONTROLLER', minimum: Number(m[1]) }, rest: m[2] }
  if ((m = /^If your opponent has (\d+) or less Life cards, (.*)$/.exec(text))) return { condition: { kind: 'LIFE_AT_MOST', player: 'OPPONENT', maximum: Number(m[1]) }, rest: m[2] }
  if ((m = /^If your opponent has (\d+) or more Life cards, (.*)$/.exec(text))) return { condition: { kind: 'LIFE_AT_LEAST', player: 'OPPONENT', minimum: Number(m[1]) }, rest: m[2] }
  if ((m = /^If you have (\d+) or more DON!! cards on your field, (.*)$/.exec(text))) return { condition: { kind: 'FIELD_DON_AT_LEAST', minimum: Number(m[1]) }, rest: m[2] }
  return null
}

/** The body of one ability (after its bracket prefixes): optional cost, optional condition, actions joined by "Then,". */
function body(text: string, ctx: Ctx, category: Category, timing: Timing): { program: Step[]; cost?: EffectDefinition['cost'] } | null {
  let t = clean(text).replace(/\.$/, '').replace(/ and add it to your hand\. Then, place the rest at the bottom of your deck in any order/g, ' and add it to your hand §BOTTOM').replace(/ and add it to your hand\. Then, trash the rest/g, ' and add it to your hand §TRASH')
  // "You may rest N of your DON!! cards:" is the current wording of ➀..➅.
  t = t.replace(REMINDER.DON_MINUS, '').replace(REMINDER.REST_DON, '').replace(/ +:/g, ':').replace(/ {2,}/g, ' ')
  t = t.replace(/^You may rest (\d) of your DON!! cards: /, (_, n) => `${'①②③④⑤⑥'[Number(n) - 1]}: `)
  let cost: EffectDefinition['cost'] | undefined
  const prefix: Step[] = []
  let paid: string | undefined
  // Activation costs printed before ":" (only for abilities the player starts: [Activate: Main] and [Main]).
  const costMatch = /^((?:[①-⑥➀-➅] ?)?(?:DON!! -\d+ ?)?(?:You may rest this (?:Character|Stage|Leader))?) ?: (.*)$/.exec(t)
  if (costMatch && costMatch[1].trim()) {
    const parts: Exclude<EffectDefinition['cost'], { kind: 'SEQUENCE' | 'NONE' }>[] = []
    const c = costMatch[1]
    const circled = [...c].find(ch => ch in CIRCLED)
    if (circled) parts.push({ kind: 'REST_DON', amount: CIRCLED[circled] })
    const dm = /DON!! -(\d+)/.exec(c); if (dm) parts.push({ kind: 'DON_MINUS', amount: Number(dm[1]) })
    if (/You may rest this/.test(c)) parts.push({ kind: 'REST_SOURCE' })
    if (!parts.length) return null
    if (['ACTIVATE_MAIN', 'MAIN'].includes(timing)) cost = parts.length === 1 ? parts[0] : { kind: 'SEQUENCE', parts } as EffectDefinition['cost']
    else if (parts.length === 1 && parts[0].kind === 'DON_MINUS') {
      // "DON!! −X:" inside an automatic ability: pay exactly X field DON!! or nothing (then the rest is skipped).
      paid = 'paid'; prefix.push(...donMinus(parts[0].amount, paid)); ctx.templates.push('don-minus-cost')
    } else if (parts.length === 1 && parts[0].kind === 'REST_DON') {
      // An optional ➁ inside an automatic ability: all or nothing, only with that many active DON!! (as ST-17).
      const n = parts[0].amount
      paid = 'paid'
      prefix.push({ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'cost', rested: false }, optional: true, min: 0, max: n, bind: paid, visibility: 'PUBLIC', allOrNone: true, whenCondition: { kind: 'ACTIVE_DON_AT_LEAST', minimum: n } } as Step, rest(paid))
      ctx.templates.push('rest-don-cost')
    } else return null
    t = costMatch[2]
  } else {
    // "You may trash N card(s) from your hand:" — an optional cost inside the program; the rest happens only when paid.
    const trash = /^You may trash (\d) cards? from your hand: (.*)$/.exec(t)
    if (trash) {
      paid = 'paid'
      const n = Number(trash[1])
      prefix.push({ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: n, bind: paid, visibility: 'PRIVATE', allOrNone: true, whenCondition: { kind: 'HAND_AT_LEAST', player: 'CONTROLLER', minimum: n } } as Step, trashFromHand(paid, paid))
      ctx.templates.push('trash-cost')
      t = trash[2]
    }
  }
  let gate: string | undefined = paid
  const cond = leadingCondition(t)
  if (cond) { const b = fresh(ctx, 'cond'); prefix.push(paid ? { ...check(b, cond.condition), whenBindingNonempty: paid } as Step : check(b, cond.condition)); gate = b; ctx.templates.push('condition'); t = cond.rest }
  const sentences = t.split(/\. Then, |, then /).map(s => s.trim()).filter(Boolean)
  const steps: Step[] = []
  for (const s of sentences) {
    const a = action(s.charAt(0).toUpperCase() + s.slice(1), ctx, category, timing)
    if (!a) return null
    steps.push(...a)
  }
  return { program: [...prefix, ...(gate ? after(gate, steps) : steps)], ...(cost ? { cost } : {}) }
}

/** A static sentence (no timing): a power/cost modifier of the card itself, a cost of the card in hand, or a keyword it gains. */
function staticAbility(text: string, conds: BaseCondition[], number: string, definitionId: string, category: Category, out: CompiledCard, ctx: Ctx): boolean {
  let t = clean(text).replace(/\.$/, '')
  for (const r of [REMINDER.BLOCKER, REMINDER.RUSH, REMINDER.DOUBLE_ATTACK, REMINDER.BANISH]) t = t.replace(r, '').trim().replace(/\.$/, '')
  const don = conds.find(c => c.kind === 'SOURCE_ATTACHED_DON_AT_LEAST') as { minimum: number } | undefined
  const yourTurn = conds.some(c => c.kind === 'YOUR_TURN'), oppTurn = conds.some(c => c.kind === 'OPPONENT_TURN')
  const self = category === 'LEADER' ? 'This Leader' : 'This Character'
  const zone = category === 'LEADER' ? 'leader' as const : 'characters' as const
  if (category === 'EVENT' || category === 'STAGE') return false
  const k = out.continuous.length + out.conditionalKeywords.length + 1
  let m: RegExpExecArray | null
  const extra: Partial<Continuous> = {}
  // Card in hand: "If ..., give this card in your hand -N cost" (no other printed condition).
  if ((m = /^If (you have (\d+) or less Life cards|your opponent has a Character with (\d+) power or more), give this card in your hand -(\d+) cost$/.exec(t))) {
    if (conds.length) return false
    out.continuous.push({ id: `${number}.s${k}-hand-cost`, definitionId, zone: 'hand', characteristic: 'COST', amount: -Number(m[4]), minimumAttachedDon: 0,
      ...(m[2] ? { maximumOwnLife: Number(m[2]) } : { whenCharacter: { side: 'OPPONENT' as const, minPower: Number(m[3]), powerBasis: 'CURRENT' as const } }) })
    ctx.templates.push('hand-cost'); return true
  }
  if ((m = /^If your Leader has the \{([^}]+)\} type, (.*)$/.exec(t))) { extra.whenLeaderHasTrait = m[1]; t = m[2].charAt(0).toUpperCase() + m[2].slice(1) }
  else if ((m = /^If you have (\d+) or less Life cards, (.*)$/.exec(t))) { extra.maximumOwnLife = Number(m[1]); t = m[2].charAt(0).toUpperCase() + m[2].slice(1) }
  if ((m = new RegExp(`^${self} gains \\+(\\d+) (power|cost)$`).exec(t))) {
    if (m[2] === 'cost' && (yourTurn || oppTurn || extra.maximumOwnLife !== undefined)) return false
    out.continuous.push({ id: `${number}.s${k}-${m[2]}`, definitionId, zone, characteristic: m[2] === 'cost' ? 'COST' : 'POWER', amount: Number(m[1]), minimumAttachedDon: don?.minimum ?? 0,
      ...(yourTurn ? { duringYourTurn: true as const } : {}), ...(oppTurn ? { duringOpponentTurn: true as const } : {}), ...extra })
    ctx.templates.push(m[2] === 'cost' ? 'static-cost' : 'static-power'); return true
  }
  if ((m = new RegExp(`^${self} gains \\[(Rush|Double Attack|Banish|Blocker)\\]$`).exec(t))) {
    if (yourTurn || oppTurn || extra.maximumOwnLife !== undefined || (!don && !extra.whenLeaderHasTrait)) return false
    const keyword = ({ Rush: 'RUSH', 'Double Attack': 'DOUBLE_ATTACK', Banish: 'BANISH', Blocker: 'BLOCKER' } as const)[m[1] as 'Rush']
    out.conditionalKeywords.push({ id: `${number}.s${k}-keyword`, definitionId, zone, keyword, minimumAttachedDon: don?.minimum ?? 0, ...(extra.whenLeaderHasTrait ? { leaderHasTrait: extra.whenLeaderHasTrait } : {}) })
    ctx.templates.push('conditional-keyword'); return true
  }
  return false
}

/** [Once Per Turn]: an automatic ability that starts with an optional choice is used only once that choice names a card — declining
 * it keeps it available for a later occasion of the same turn (FAQ OP17-072, as OP09-001). An activated ability is used when started. */
const onceUsage = (timing: Timing, program: Step[]): EffectDefinition['usage'] =>
  timing !== 'ACTIVATE_MAIN' && program[0]?.kind === 'CHOICE' && program[0].optional ? { kind: 'ONCE_PER_TURN_WHEN_CHOSEN' } : { kind: 'ONCE_PER_TURN' }
const zoneFor = (category: Category, timing: Timing): Zone => timing === 'TRIGGER' ? 'temporary' : ['MAIN', 'COUNTER'].includes(timing) ? 'hand' : category === 'LEADER' ? 'leader' : category === 'STAGE' ? 'stage' : 'characters'

/** Compiles the effect and trigger texts of one official card list row. */
export function compileCardText(row: { code: string; type: string; effect: string; trigger: string }, definitionId: string): CompiledCard {
  const number = row.code.replace(/(?:_[pr]\d+)+$/i, '').toUpperCase()
  const category = row.type.trim().toUpperCase() as Category
  const ctx: Ctx = { n: 0, templates: [] }
  const profile: LocalProfile = {}, abilities: EffectDefinition[] = [], unparsed: string[] = []
  const out: CompiledCard = { number, profile, abilities, continuous: [], conditionalKeywords: [], templates: ctx.templates, unparsed }
  let effect = clean(row.effect === '-' ? '' : row.effect)
  // Printed keywords with their reminder text.
  effect = effect.replace(/\[Blocker\] ?/g, () => { profile.blocker = true; ctx.templates.push('blocker'); return '' }).replace(REMINDER.BLOCKER, '')
  for (const [kw, label] of [['RUSH', 'Rush'], ['DOUBLE_ATTACK', 'Double Attack'], ['BANISH', 'Banish']] as const) {
    const re = new RegExp(`^\\[${label}\\] ?(?:${REMINDER[kw].source.replace(/\\\./g, '\\.')})?`)
    if (re.test(effect)) { effect = effect.replace(re, '').trim(); (profile.keywords ??= []).push(kw as never); ctx.templates.push('keyword') }
  }
  // Split into abilities: a new ability starts at a bracket prefix that follows the start of the text or the end of a sentence.
  const chunks = effect.split(/(?<=^|[.)])\s*(?=\[(?:On Play|When Attacking|On K\.O\.|Main|Counter|Activate: ?Main|End of Your Turn|On Block|On Your Opponent's Attack|Once Per Turn|Your Turn|Opponent's Turn|DON!! x\d)\])/).map(s => s.trim()).filter(Boolean)
  const add = (source: string, isTrigger: boolean) => {
    let s = source, timing: Timing | undefined
    const conds: BaseCondition[] = []
    let once = false, m: RegExpExecArray | null
    while ((m = PREFIX.exec(s))) {
      const tag = m[1]
      if (TIMINGS[tag]) { if (timing) return unparsed.push(source); timing = TIMINGS[tag] }
      else if (tag === 'Once Per Turn') once = true
      else if (tag === 'Your Turn') conds.push({ kind: 'YOUR_TURN' })
      else if (tag === "Opponent's Turn") conds.push({ kind: 'OPPONENT_TURN' })
      else conds.push({ kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: Number(tag.slice(-1)) })
      s = s.slice(m[0].length)
    }
    if (isTrigger) { if (timing && timing !== 'TRIGGER') return unparsed.push(source); timing = 'TRIGGER' }
    if (!timing && !isTrigger && !once) { if (!staticAbility(s, conds, number, definitionId, category, out, ctx)) unparsed.push(source); return }
    if (!timing || (timing === 'TRIGGER') !== isTrigger) return unparsed.push(source)
    if (['MAIN', 'COUNTER'].includes(timing) !== (category === 'EVENT') && timing !== 'TRIGGER') return unparsed.push(source)
    if (timing === 'COUNTER' && (conds.length || once)) return unparsed.push(source)
    // [Trigger] Play this card / Activate this card's [Main] effect.
    // [Trigger] Activate this card's [Main] / [Counter] / [On Play] effect: the same program, run from the Trigger (no cost).
    const copy = timing === 'TRIGGER' ? /^Activate this card's \[(Main|Counter|On Play)\] effect\.?$/.exec(clean(s)) : null
    if (copy) {
      const from = abilities.find(a => a.timing === ({ Main: 'MAIN', Counter: 'COUNTER', 'On Play': 'ON_PLAY' } as const)[copy[1] as 'Main'])
      if (!from || from.cost.kind !== 'NONE' || from.condition.kind !== 'ALWAYS' || from.usage.kind !== 'UNLIMITED') return unparsed.push(source)
      // A [Counter] program boosts "during this battle": from a Trigger there is no battle of its own to refer to (FAQ needed).
      if (copy[1] === 'Counter') return unparsed.push(source)
      ctx.templates.push(`trigger-copy-${copy[1].toLowerCase().replace(' ', '-')}`)
      abilities.push(ability(`${number}.c-trigger`, definitionId, 'temporary', 'TRIGGER', structuredClone(from.program)))
      return
    }
    const b = body(s, ctx, category, timing)
    if (!b) return unparsed.push(source)
    const condition: Condition = conds.length === 0 ? { kind: 'ALWAYS' } : conds.length === 1 ? conds[0] : { kind: 'ALL_OF', conditions: conds }
    const id = `${number}.c${abilities.length + 1}-${timing.toLowerCase().replace(/_/g, '-')}`
    abilities.push(ability(id, definitionId, zoneFor(category, timing), timing, b.program, { condition, ...(b.cost ? { cost: b.cost } : {}), ...(once ? { usage: onceUsage(timing, b.program) } : {}) }))
    if (timing === 'COUNTER') profile.counterEvent = { abilityId: id }
  }
  for (const chunk of chunks) add(chunk, false)
  const trigger = clean(row.trigger === '-' ? '' : row.trigger ?? '')
  if (trigger) add(trigger.replace(/^\[Trigger\]\s*/, '[Trigger] '), true)
  const ids = [...abilities.map(a => a.id), ...out.continuous.map(c => c.id), ...out.conditionalKeywords.map(c => c.id)]
  if (ids.length) profile.abilityIds = ids
  return out
}

/**
 * M7 analysis only (never used to build a definition): splits an ability text into its pieces — bracket prefixes, cost before
 * ":", leading condition, actions — and returns the pieces no template recognises, each tagged with its role.
 */
export function unknownFragments(text: string, category: Category): { role: 'timing' | 'cost' | 'condition' | 'action'; text: string }[] {
  const out: { role: 'timing' | 'cost' | 'condition' | 'action'; text: string }[] = []
  let s = clean(text), m: RegExpExecArray | null, timing: Timing | undefined
  while ((m = PREFIX.exec(s))) { if (TIMINGS[m[1]]) timing = TIMINGS[m[1]]; s = s.slice(m[0].length) }
  const unknownTag = /^\[[^\]]+\]/.exec(s)
  if (unknownTag && !/^\[(Blocker|Rush|Double Attack|Banish)\]/.test(unknownTag[0])) { out.push({ role: 'timing', text: unknownTag[0] }); s = s.slice(unknownTag[0].length).trim() }
  s = s.replace(/\.$/, '').replace(REMINDER.DON_MINUS, '').replace(REMINDER.REST_DON, '').replace(/ +:/g, ':')
    .replace(/ and add it to your hand\. Then, place the rest at the bottom of your deck in any order/g, ' and add it to your hand §BOTTOM').replace(/ and add it to your hand\. Then, trash the rest/g, ' and add it to your hand §TRASH')
  const colon = s.indexOf(': ')
  if (colon > 0 && colon < 120 && !/^If /.test(s)) {
    const c = s.slice(0, colon), known = /^(?:[①-⑥➀-➅] ?)?(?:DON!! -\d+ ?)?(?:You may rest this (?:Character|Stage|Leader))?$/.test(c) || /^You may trash \d cards? from your hand$/.test(c) || /^You may rest \d of your DON!! cards$/.test(c)
    if (!known) out.push({ role: 'cost', text: c })
    s = s.slice(colon + 2)
  }
  const cond = leadingCondition(s)
  if (cond) s = cond.rest
  else { const ifm = /^(If [^,]+), (.*)$/.exec(s); if (ifm) { out.push({ role: 'condition', text: ifm[1] }); s = ifm[2] } }
  for (const piece of s.split(/\. Then, |, then |\. /).map(x => x.trim()).filter(Boolean)) {
    const sentence = piece.charAt(0).toUpperCase() + piece.slice(1)
    if (!action(sentence, { n: 0, templates: [] }, category, timing ?? 'ON_PLAY')) out.push({ role: 'action', text: sentence })
  }
  return out
}
