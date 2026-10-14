import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { after, ability, check, draw, drawThenTrash, playChosen, rest, toDeckBottom, trashFromHand, upTo } from './dsl'

// M6 ST-25 (BLUE Buggy) and the cards it reprints (OP09, P-084). Texts are the official English card list (series 569025) archived
// with the ST-25 snapshot; the ST-23-28 FAQ (ST25-003), the OP-09 and promotion FAQ and the errata snapshot are in
// docs/game/evidence/m6/sources/. No runtime branch depends on a card number.
type Step = EffectDefinition['program'][number]
type Condition = NonNullable<Extract<Step, { kind: 'OPERATION' }>['whenCondition']>
const L = 'ST-25'
const crossGuild = ['Cross Guild']
const leaderBuggy = { kind: 'LEADER_NAME_IS' as const, name: 'Buggy' }
const twoBigCharacters = { count: 2, minCost: 5 }
/** "You may trash 1 card from your hand:" — `paid` holds the trashed card. */
const mayTrash1: Step[] = [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE', allOrNone: true }, trashFromHand('paid', 'paid')]
/** The first choice of a program fragment also requires `condition` ("If your Leader is [Buggy], play ..."). */
const when = (steps: Step[], condition: Condition): Step[] => steps.map((step, index) => index === 0 && step.kind === 'CHOICE' ? { ...step, whenCondition: condition } as Step : step)
const crossGuildSearch = (amount: number): Step[] => [{ kind: 'SEARCH_TOP_DECK', amount, traitsAny: crossGuild, maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }]

const abilities: EffectDefinition[] = [
  // OP09-042 Leader Buggy: [Activate: Main] You may rest 5 of your DON!! cards and trash 1 card from your hand: Play up to 1
  // {Cross Guild} type Character card from your hand.
  ability('OP09-042.activate-main-play', def('OP09-042'), 'leader', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'cost', rested: false }, optional: true, min: 0, max: 5, bind: 'dons', visibility: 'PUBLIC', allOrNone: true,
      whenCondition: { kind: 'HAND_AT_LEAST', player: 'CONTROLLER', minimum: 1 } },
    rest('dons'),
    ...after('dons', [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: false, min: 1, max: 1, bind: 'discard', visibility: 'PRIVATE' }, trashFromHand('discard')]),
    ...playChosen('target', 'hand', { categories: ['CHARACTER'], traitsAny: crossGuild }, { whenBindingNonempty: 'dons' })]),
  // ST25-001 Alvida: [On Play] If your Leader is [Buggy], draw 3 cards and trash 2 cards from your hand (cost +1 below).
  ability('ST25-001.on-play-draw', def('ST25-001'), 'characters', 'ON_PLAY', drawThenTrash(3, 2), { condition: leaderBuggy }),
  // ST25-003 Crocodile & Mihawk: [On Play] Draw 2 cards and trash 1 card from your hand. Then, play up to 1 {Cross Guild} type
  // Character card with a cost of 4 or less from your hand (removal replacement below).
  ability('ST25-003.on-play-draw-play', def('ST25-003'), 'characters', 'ON_PLAY', [...drawThenTrash(2, 1), ...playChosen('target', 'hand', { categories: ['CHARACTER'], traitsAny: crossGuild, maxCost: 4 })]),
  // ST25-004 Buggy: [Activate: Main] You may trash 1 card from your hand and trash this Character: If your Leader is [Buggy], play
  // up to 1 {Cross Guild} type Character card with a cost of 6 or less from your hand.
  ability('ST25-004.activate-main-play', def('ST25-004'), 'characters', 'ACTIVATE_MAIN', [...mayTrash1, check('self', { kind: 'ALWAYS' }),
    { kind: 'OPERATION', operation: { primitive: 'trashCharacter', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'self' }, whenBindingNonempty: 'paid' },
    ...when(playChosen('target', 'hand', { categories: ['CHARACTER'], traitsAny: crossGuild, maxCost: 6 }, { whenBindingNonempty: 'paid' }), leaderBuggy)]),
  // ST25-005 Mohji: [On K.O.] If your Leader is [Buggy] and you have 3 or less cards in your hand, draw 1 card.
  ability('ST25-005.on-ko-draw', def('ST25-005'), 'characters', 'ON_KO', [draw(1)], { condition: { kind: 'ALL_OF', conditions: [leaderBuggy, { kind: 'HAND_AT_MOST', player: 'CONTROLLER', maximum: 3 }] } }),
  // OP09-043 Alvida: [On K.O.] If your Leader has the {Cross Guild} type, play up to 1 Character card with a cost of 5 or less
  // other than [Alvida] from your hand.
  ability('OP09-043.on-ko-play', def('OP09-043'), 'characters', 'ON_KO', playChosen('target', 'hand', { categories: ['CHARACTER'], maxCost: 5, nameNot: 'Alvida' }), { condition: { kind: 'LEADER_HAS_TRAIT', trait: 'Cross Guild' } }),
  // OP09-051 Buggy: [On Play] Place up to 1 of your opponent's Characters at the bottom of the owner's deck. Then, if you do not
  // have 5 Characters with a cost of 5 or more, place this Character at the bottom of the owner's deck.
  ability('OP09-051.on-play-bottom', def('OP09-051'), 'characters', 'ON_PLAY', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), toDeckBottom('target'),
    check('self', { kind: 'OWN_CHARACTER_COUNT', minCost: 5, atMost: 4 }), toDeckBottom('self')]),
  // OP09-053 Mohji: [On Play] Look at 5 cards from the top of your deck; reveal up to 1 [Richie] and add it to your hand. Then,
  // place the rest at the bottom of your deck in any order and play up to 1 [Richie] from your hand.
  ability('OP09-053.on-play-richie', def('OP09-053'), 'characters', 'ON_PLAY', [{ kind: 'SEARCH_TOP_DECK', amount: 5, namesAny: ['Richie'], maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' },
    ...playChosen('richie', 'hand', { categories: ['CHARACTER'], nameIs: 'Richie' })]),
  // OP09-056 Mr.3(Galdino): [On Play] Look at 4 cards; reveal up to 1 {Cross Guild} type card or card with a type including
  // "Baroque Works" other than [Mr.3(Galdino)] and add it to your hand. Then, place the rest at the bottom in any order.
  ability('OP09-056.on-play-search', def('OP09-056'), 'characters', 'ON_PLAY', [{ kind: 'SEARCH_TOP_DECK', amount: 4, traitsAny: crossGuild, traitIncludesAny: ['Baroque Works'], excludeRulesName: 'Mr.3(Galdino)', maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }]),
  // P-084 Buggy: [On Play] Play up to 1 {Cross Guild} type Character card with a cost of 6 or less from your hand (attack
  // prohibitions below).
  ability('P-084.on-play-play', def('P-084'), 'characters', 'ON_PLAY', playChosen('target', 'hand', { categories: ['CHARACTER'], traitsAny: crossGuild, maxCost: 6 })),
  // OP09-057 Cross Guild: [Main] Look at 4 cards; reveal up to 1 {Cross Guild} type card and add it to your hand. Then, place the
  // rest at the bottom in any order. [Trigger] Activate this card's [Main] effect.
  ability('OP09-057.main-search', def('OP09-057'), 'hand', 'MAIN', crossGuildSearch(4)),
  ability('OP09-057.trigger-search', def('OP09-057'), 'temporary', 'TRIGGER', crossGuildSearch(4)),
]
export const ST25_OFFICIAL_CONTINUOUS = [
  // ST25-001 / ST25-002 / ST25-005: If you have 2 or more Characters with a base cost of 5 or more, this Character gains +1 cost.
  ...['ST25-001', 'ST25-002', 'ST25-005'].map(n => ({ id: `${n}.base-cost-plus-one`, definitionId: def(n), zone: 'characters' as const, characteristic: 'COST' as const, amount: 1, minimumAttachedDon: 0, minimumBaseCostCharacters: twoBigCharacters })),
  // ST25-002 Cabaji: [Opponent's Turn] This Character gains +5000 power.
  { id: 'ST25-002.opponent-turn-power', definitionId: def('ST25-002'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 5000, minimumAttachedDon: 0, duringOpponentTurn: true as const },
]
export const ST25_OFFICIAL_CONDITIONAL_KEYWORDS = ['ST25-002', 'ST25-005'].map(n => ({ id: `${n}.conditional-blocker`, definitionId: def(n), zone: 'characters' as const, keyword: 'BLOCKER' as const, minimumAttachedDon: 0, minimumBaseCostCharacters: twoBigCharacters }))
// OP09-045 Cabaji: If you have a [Buggy] or [Mohji] Character, this Character cannot be K.O.'d in battle.
export const ST25_OFFICIAL_KO_PROTECTIONS = [{ id: 'OP09-045.no-battle-ko', definitionId: def('OP09-045'), zone: 'characters' as const, from: 'BATTLE' as const, whenOwnCharacterNamed: ['Buggy', 'Mohji'] }]
// ST25-003: [Once Per Turn] If your {Cross Guild} type Character would be removed from the field by your opponent's effect, you may
// trash 1 card from your hand instead (FAQ ST25-003: one card protects every Character removed at the same time).
export const ST25_OFFICIAL_REPLACEMENTS = [{ id: 'ST25-003.guard-cross-guild', definitionId: def('ST25-003'), zone: 'characters' as const, match: 'GUARD' as const, event: 'REMOVAL' as const, cause: 'OPPONENT_EFFECT' as const,
  protects: { traitsAny: crossGuild }, action: 'TRASH_HAND' as const, usage: 'ONCE_PER_TURN' as const }]
// P-084 Buggy: This Character cannot attack. If your Leader is [Buggy], all Characters with a cost of 3 or 4 cannot attack.
export const ST25_OFFICIAL_ATTACK_PROHIBITIONS = [
  { id: 'P-084.cannot-attack', definitionId: def('P-084'), zone: 'characters' as const, self: true as const },
  { id: 'P-084.cost-3-4-cannot-attack', definitionId: def('P-084'), zone: 'characters' as const, all: { minCost: 3, maxCost: 4 }, leaderName: 'Buggy' },
]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST25_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'OP09-042', { abilityIds: ids('OP09-042') }),
  officialCard(L, 'ST25-001', { abilityIds: ids('ST25-001', ['ST25-001.base-cost-plus-one']) }),
  officialCard(L, 'ST25-002', { abilityIds: ids('ST25-002', ['ST25-002.base-cost-plus-one', 'ST25-002.conditional-blocker', 'ST25-002.opponent-turn-power']) }),
  officialCard(L, 'ST25-003', { abilityIds: ids('ST25-003', ['ST25-003.guard-cross-guild']) }),
  officialCard(L, 'ST25-004', { abilityIds: ids('ST25-004') }),
  officialCard(L, 'ST25-005', { abilityIds: ids('ST25-005', ['ST25-005.base-cost-plus-one', 'ST25-005.conditional-blocker']) }),
  officialCard(L, 'OP09-043', { abilityIds: ids('OP09-043') }),
  officialCard(L, 'OP09-045', { abilityIds: ['OP09-045.no-battle-ko'] }),
  officialCard(L, 'OP09-051', { abilityIds: ids('OP09-051') }),
  officialCard(L, 'OP09-053', { abilityIds: ids('OP09-053') }),
  officialCard(L, 'OP09-056', { abilityIds: ids('OP09-056') }),
  officialCard(L, 'P-084', { abilityIds: ids('P-084', ['P-084.cannot-attack', 'P-084.cost-3-4-cannot-attack']) }),
  officialCard(L, 'OP09-057', { abilityIds: ids('OP09-057') }),
]
export const ST25_OFFICIAL_ABILITY_DEFINITIONS = abilities
