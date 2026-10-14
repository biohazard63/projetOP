import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { ability, addDon, donMinus, draw, ko, lifeToHand, opponentPower, playChosen, rest, setActive, trashFromHand, upTo } from './dsl'

// M6 ST-18 (Purple Monkey.D.Luffy). Texts are the official English card list (series 569018) archived with the ST-18
// snapshot; the OP-05 and ST-15-20 FAQ (FAQ ST18-002) and the errata snapshot are in docs/game/evidence/m6/sources/.
type Step = EffectDefinition['program'][number]
const L = 'ST-18'
const don8 = { kind: 'FIELD_DON_AT_LEAST' as const, minimum: 8 }
const purpleStrawHat = { colorsAny: ['PURPLE' as const], traitsAny: ['Straw Hat Crew'] }
const search = (amount: number, filter: { traitsAny: string[]; colorsAny?: ('PURPLE')[] }): Step => ({ kind: 'SEARCH_TOP_DECK', amount, ...filter, maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' })

const abilities: EffectDefinition[] = [
  // OP05-060 Leader: [Activate: Main] [Once Per Turn] You may add 1 card from the top of your Life cards to your hand: If you
  // have 0 or 3 or more DON!! cards on your field, add up to 1 DON!! card from your DON!! deck and set it as active.
  ability('OP05-060.activate-main-don', def('OP05-060'), 'leader', 'ACTIVATE_MAIN', [...lifeToHand('lifeCost', { lifeEnd: 'TOP' }),
    addDon(false, { whenBindingNonempty: 'lifeCost', whenCondition: { kind: 'ANY_OF', conditions: [{ kind: 'FIELD_DON_AT_MOST', maximum: 0 }, { kind: 'FIELD_DON_AT_LEAST', minimum: 3 }] } })], { usage: { kind: 'ONCE_PER_TURN' } }),
  // ST18-001 Uso-Hachi: [On Play] If you have 8 or more DON!! cards on your field, rest up to 1 opposing Character cost 5 or less.
  ability('ST18-001.on-play-rest', def('ST18-001'), 'characters', 'ON_PLAY', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 5 }), rest('target')], { condition: don8 }),
  // ST18-002 O-Nami: [Blocker]; [On Play] with 8 or more field DON!!, trash 1 card from your hand and draw 2 cards (FAQ ST18-002:
  // with 0 cards in hand, the 2 cards are still drawn).
  ability('ST18-002.on-play-draw', def('ST18-002'), 'characters', 'ON_PLAY', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: false, min: 1, max: 1, bind: 'discard', visibility: 'PRIVATE', clampMin: true, skipIfNone: true }, trashFromHand('discard'), draw(2)], { condition: don8 }),
  // ST18-003 San-Gorou: [When Attacking] [Once Per Turn] If you have 8 or more DON!! cards on your field, draw 1 card.
  ability('ST18-003.when-attacking-draw', def('ST18-003'), 'characters', 'WHEN_ATTACKING', [draw(1)], { condition: don8, usage: { kind: 'ONCE_PER_TURN' } }),
  // ST18-004 Zoro-Juurou: [On Play] Look at 5; reveal up to 1 purple {Straw Hat Crew} type card and add it to your hand; the rest
  // at the bottom in any order.
  ability('ST18-004.on-play-search', def('ST18-004'), 'characters', 'ON_PLAY', [search(5, { traitsAny: ['Straw Hat Crew'], colorsAny: ['PURPLE'] })]),
  // ST18-005 Luffy-Tarou: [On Play] DON!! −1: Play up to 1 purple {Straw Hat Crew} type Character card with a cost of 5 or less
  // from your hand.
  ability('ST18-005.on-play-play', def('ST18-005'), 'characters', 'ON_PLAY', [...donMinus(1), ...playChosen('target', 'hand', { categories: ['CHARACTER'], maxCost: 5, ...purpleStrawHat }, { whenBindingNonempty: 'donMinus' })]),
  // OP05-061 Uso-Hachi: [DON!! x1] [When Attacking] with 8 or more field DON!!, rest up to 1 opposing Character cost 4 or less.
  ability('OP05-061.when-attacking-rest', def('OP05-061'), 'characters', 'WHEN_ATTACKING', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 4 }), rest('target')],
    { condition: { kind: 'ALL_OF', conditions: [{ kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 1 }, don8] } }),
  // OP05-063 O-Robi: [On Play] with 8 or more field DON!!, K.O. up to 1 opposing Character cost 3 or less.
  ability('OP05-063.on-play-ko', def('OP05-063'), 'characters', 'ON_PLAY', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 3 }), ko('target')], { condition: don8 }),
  // OP05-067 Zoro-Juurou: [When Attacking] If you have 3 or less Life cards, add up to 1 DON!! card from your DON!! deck and set
  // it as active.
  ability('OP05-067.when-attacking-don', def('OP05-067'), 'characters', 'WHEN_ATTACKING', [addDon(false)], { condition: { kind: 'LIFE_AT_MOST', player: 'CONTROLLER', maximum: 3 } }),
  // OP05-068 Chopa-Emon: [On Play] with 8 or more field DON!!, set up to 1 purple {Straw Hat Crew} Character with 6000 power or
  // less as active.
  ability('OP05-068.on-play-set-active', def('OP05-068'), 'characters', 'ON_PLAY', [upTo(1, 'target', { side: 'OWN', zone: 'characters', maxPower: 6000, ...purpleStrawHat }), setActive('target')], { condition: don8 }),
  // OP05-072 Hone-Kichi: [On Play] with 8 or more field DON!!, give up to 2 opposing Characters −2000 power during this turn.
  ability('OP05-072.on-play-power', def('OP05-072'), 'characters', 'ON_PLAY', [upTo(2, 'target', { side: 'OPPONENT', zone: 'characters' }), opponentPower(-2000)], { condition: don8 }),
  // OP05-076 When You're at Sea...: [Main] Look at 3; reveal up to 1 {Straw Hat Crew}, {Kid Pirates} or {Heart Pirates} type card
  // and add it to your hand; the rest at the bottom in any order. [Trigger] Activate this card's [Main] effect.
  ability('OP05-076.main-search', def('OP05-076'), 'hand', 'MAIN', [search(3, { traitsAny: ['Straw Hat Crew', 'Kid Pirates', 'Heart Pirates'] })]),
  ability('OP05-076.trigger-search', def('OP05-076'), 'temporary', 'TRIGGER', [search(3, { traitsAny: ['Straw Hat Crew', 'Kid Pirates', 'Heart Pirates'] })]),
]
export const ST18_OFFICIAL_CONTINUOUS = [
  // OP05-066 Jinbe: [Opponent's Turn] If you have 10 DON!! cards on your field, this Character gains +1000 power.
  { id: 'OP05-066.opponent-turn-power', definitionId: def('OP05-066'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 1000, minimumAttachedDon: 0, duringOpponentTurn: true as const, minimumFieldDon: 10 },
]
export const ST18_OFFICIAL_CONDITIONAL_KEYWORDS = [
  // OP05-070 Fra-Nosuke: [DON!! x1] If you have 8 or more DON!! cards on your field, this Character gains [Rush].
  { id: 'OP05-070.conditional-rush', definitionId: def('OP05-070'), zone: 'characters' as const, keyword: 'RUSH' as const, minimumAttachedDon: 1, minimumFieldDon: 8 },
]
const ids = (number: string) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id),
  ...[...ST18_OFFICIAL_CONTINUOUS, ...ST18_OFFICIAL_CONDITIONAL_KEYWORDS].filter(e => e.definitionId === def(number)).map(e => e.id)]
export const ST18_OFFICIAL_CARDS: CardInput[] = [
  ...['OP05-060', 'ST18-001', 'ST18-003', 'ST18-004', 'ST18-005', 'OP05-061', 'OP05-063', 'OP05-067', 'OP05-068', 'OP05-070', 'OP05-072', 'OP05-076'].map(n => officialCard(L, n, { abilityIds: ids(n) })),
  officialCard(L, 'ST18-002', { blocker: true, abilityIds: ids('ST18-002') }),
  officialCard(L, 'OP05-066', { blocker: true, abilityIds: ids('OP05-066') }),
]
export const ST18_OFFICIAL_ABILITY_DEFINITIONS = abilities
