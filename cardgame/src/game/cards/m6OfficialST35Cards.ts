import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { addCost, after, ability, bindAll, draw, giveRestedDon, ko, lifeToHand, opponentPower, opponentTrashesFromHand, ownLeaderOrCharacter, playChosen, power, upTo } from './dsl'

// M6 ST-35 (RED/BLACK Sabo) and its OP12/OP13/P-105 reprints. Texts are the official English card list (series 569035) archived
// with the ST-35 snapshot; the ST-35 FAQ (ST35-003) and the errata snapshot are in docs/game/evidence/m6/sources/. No runtime
// branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-35'
const once = { kind: 'ONCE_PER_TURN' as const }
const ra = ['Revolutionary Army']
const raLeader = 'Revolutionary Army'
/** "You may trash N cards from the top of your deck:" — all or nothing, only with N cards in the deck; `paid` holds them. */
const millCost = (n: number): Step[] => [
  { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'deck', topN: n }, optional: true, min: 0, max: n, bind: 'paid', visibility: 'PRIVATE', conceal: true, allOrNone: true, whenCondition: { kind: 'DECK_AT_LEAST', minimum: n } },
  { kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'paid', from: 'deck', to: 'trash' }, whenBindingNonempty: 'paid' }]
const donToLeader = (): Step[] => [bindAll('leader', { side: 'OWN', zone: 'leader' }), ...giveRestedDon('leader')]
/** "Give up to 1 rested DON!! card to your Leader. Then, play up to 1 Character card with 4000 power or less and the {Revolutionary
 * Army} type from your hand or trash." */
const donThenPlay = (): Step[] => [...donToLeader(), ...playChosen('play', 'handOrTrash', { categories: ['CHARACTER'], maxPower: 4000, traitsAny: ra })]

const abilities: EffectDefinition[] = [
  // OP12-090 Belo Betty: [When Attacking] You may trash 2 cards from the top of your deck: Give up to 1 of your opponent's Characters
  // -2 cost during this turn.
  ability('OP12-090.when-attacking-cost', def('OP12-090'), 'characters', 'WHEN_ATTACKING', [...millCost(2), ...after('paid', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), addCost('target', -2)])]),
  // OP12-098 Hair Removal Fist: [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if you
  // have a {Revolutionary Army} type Character with a cost of 8 or more, that card gains an additional +2000 power during this
  // battle. [Trigger] Draw 1 card and trash 1 card from the top of your deck.
  ability('OP12-098.counter', def('OP12-098'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 2000, 'THIS_BATTLE'),
    { ...power('boosted', 2000, 'THIS_BATTLE'), whenCondition: { kind: 'OWN_CHARACTER_COUNT', minCost: 8, atLeast: 1, traitsAny: ra } } as Step]),
  ability('OP12-098.trigger-draw', def('OP12-098'), 'temporary', 'TRIGGER', [draw(1), bindAll('top', { side: 'OWN', zone: 'deck', topN: 1 }),
    { kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'top', from: 'deck', to: 'trash' } }]),
  // OP13-005 Inazuma: [On Play] Give up to 1 rested DON!! card to your Leader.
  ability('OP13-005.on-play-don', def('OP13-005'), 'characters', 'ON_PLAY', donToLeader()),
  // OP13-019 But Ace Here Said You Deserved It!!: [Main] You may rest 4 of your DON!! cards: Give up to 1 of your opponent's
  // Characters -3000 power during this turn. Then, K.O. up to 1 of your opponent's Characters with 3000 power or less. [Counter]
  // Your Leader gains +3000 power during this battle.
  ability('OP13-019.main-power-ko', def('OP13-019'), 'hand', 'MAIN', [upTo(1, 'minus', { side: 'OPPONENT', zone: 'characters' }), opponentPower(-3000, 'minus'),
    upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxPower: 3000 }), ko('target')], { cost: { kind: 'REST_DON', amount: 4 } }),
  ability('OP13-019.counter', def('OP13-019'), 'hand', 'COUNTER', [bindAll('leader', { side: 'OWN', zone: 'leader' }), power('leader', 3000, 'THIS_BATTLE')]),
  // OP13-081 Koala: (+3 cost with a {Revolutionary Army} Leader, below); [Activate: Main] [Once Per Turn] You may place 1 card from
  // your trash at the bottom of your deck: Give up to 1 rested DON!! card to your Leader or 1 of your Characters.
  ability('OP13-081.activate-main-don', def('OP13-081'), 'characters', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'trash' }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC' },
    { kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'CONTROLLER', audience: 'CONTROLLER', subjectBinding: 'paid', from: 'trash', to: 'deck' }, whenBindingNonempty: 'paid' },
    ...after('paid', [ownLeaderOrCharacter(1, 'donTarget'), ...giveRestedDon('donTarget')])], { usage: once }),
  // P-105 Sabo: (with a {Revolutionary Army} Leader [Blocker] and +4 cost, below); [On Play] You may add 1 card from the top or bottom
  // of your Life cards to your hand: Give up to 1 rested DON!! card to your Leader or 1 of your Characters.
  ability('P-105.on-play-don', def('P-105'), 'characters', 'ON_PLAY', [...lifeToHand('paid'), ...after('paid', [ownLeaderOrCharacter(1, 'donTarget'), ...giveRestedDon('donTarget')])]),
  // ST35-001 Hack: [Blocker]; [On Play] K.O. up to 1 of your opponent's Characters with 2000 base power or less.
  ability('ST35-001.on-play-ko', def('ST35-001'), 'characters', 'ON_PLAY', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxPower: 2000, powerBasis: 'BASE' }), ko('target')]),
  // ST35-002 Lindbergh: [On Play] Give up to 1 of your opponent's Characters -3000 power during this turn.
  ability('ST35-002.on-play-power', def('ST35-002'), 'characters', 'ON_PLAY', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), opponentPower(-3000)]),
  // ST35-003 Karasu: [When Attacking] You may trash 2 cards from the top of your deck: If your opponent has 7 or more cards in their
  // hand, your opponent trashes 1 card from their hand (FAQ ST35-003: the opponent chooses; with 6 or less, nothing more).
  ability('ST35-003.when-attacking-discard', def('ST35-003'), 'characters', 'WHEN_ATTACKING', [...millCost(2),
    ...opponentTrashesFromHand().map(step => ({ ...step, whenBindingNonempty: 'paid', ...(step.kind === 'CHOICE' ? { whenCondition: { kind: 'HAND_AT_LEAST' as const, player: 'OPPONENT' as const, minimum: 7 } } : {}) }) as Step)]),
  // ST35-004 Koala: This Character gains [Blocker] and +1 cost. [On Play] (donThenPlay above).
  ability('ST35-004.on-play-don-play', def('ST35-004'), 'characters', 'ON_PLAY', donThenPlay()),
  // ST35-005 Bartholomew Kuma: This Character gains +3 cost. [On Play] (donThenPlay above).
  ability('ST35-005.on-play-don-play', def('ST35-005'), 'characters', 'ON_PLAY', donThenPlay()),
]
const selfCost = (number: string, amount: number, leaderTrait?: string) => ({ id: `${number}.self-cost`, definitionId: def(number), zone: 'characters' as const, characteristic: 'COST' as const, amount, minimumAttachedDon: 0, ...(leaderTrait ? { whenLeaderHasTrait: leaderTrait } : {}) })
export const ST35_OFFICIAL_CONTINUOUS = [
  // OP13-004 Leader Sabo: If you have 4 or more Life cards, give this Leader -1000 power. [DON!! x1] If you have a Character with a
  // cost of 8 or more, your Leader and all of your Characters gain +1000 power.
  { id: 'OP13-004.life-penalty', definitionId: def('OP13-004'), zone: 'leader' as const, characteristic: 'POWER' as const, amount: -1000, minimumAttachedDon: 0, minimumOwnLife: 4 },
  { id: 'OP13-004.cost-8-aura', definitionId: def('OP13-004'), zone: 'leader' as const, characteristic: 'POWER' as const, amount: 1000, minimumAttachedDon: 1, whenOwnCharacterCostAtLeast: 8, targets: {} },
  selfCost('OP12-093', 4, raLeader), selfCost('OP13-081', 3, raLeader), selfCost('P-105', 4, raLeader), selfCost('ST35-004', 1), selfCost('ST35-005', 3),
]
export const ST35_OFFICIAL_CONDITIONAL_KEYWORDS = [
  { id: 'P-105.conditional-blocker', definitionId: def('P-105'), zone: 'characters' as const, keyword: 'BLOCKER' as const, minimumAttachedDon: 0, leaderHasTrait: raLeader },
]
export const ST35_OFFICIAL_REPLACEMENTS = [
  // OP13-008 Emporio.Ivankov: If your {Revolutionary Army} type Character would be K.O.'d by your opponent's effect, you may trash this
  // Character instead.
  { id: 'OP13-008.guard-trash', definitionId: def('OP13-008'), zone: 'characters' as const, match: 'GUARD' as const, event: 'KO' as const, cause: 'OPPONENT_EFFECT' as const, protects: { traitsAny: ra }, action: 'TRASH_SOURCE' as const, usage: 'UNLIMITED' as const },
  // OP13-017 Monkey.D.Dragon: [Once Per Turn] If your {Revolutionary Army} type Character would be removed from the field by your
  // opponent's effect, you may give this Character -2000 power during this turn instead.
  { id: 'OP13-017.guard-power', definitionId: def('OP13-017'), zone: 'characters' as const, match: 'GUARD' as const, event: 'REMOVAL' as const, cause: 'OPPONENT_EFFECT' as const, protects: { traitsAny: ra }, action: 'POWER_SOURCE_THIS_TURN' as const, amount: -2000, usage: 'ONCE_PER_TURN' as const },
]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST35_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'OP13-004', { abilityIds: ['OP13-004.life-penalty', 'OP13-004.cost-8-aura'] }),
  officialCard(L, 'OP12-090', { abilityIds: ids('OP12-090') }),
  officialCard(L, 'OP12-093', { abilityIds: ['OP12-093.self-cost'] }),
  officialCard(L, 'OP12-098', { abilityIds: ids('OP12-098'), counterEvent: { abilityId: 'OP12-098.counter' } }),
  officialCard(L, 'OP13-005', { abilityIds: ids('OP13-005') }),
  officialCard(L, 'OP13-008', { abilityIds: ['OP13-008.guard-trash'] }),
  officialCard(L, 'OP13-017', { abilityIds: ['OP13-017.guard-power'] }),
  officialCard(L, 'OP13-019', { abilityIds: ids('OP13-019'), counterEvent: { abilityId: 'OP13-019.counter' } }),
  officialCard(L, 'OP13-081', { abilityIds: ids('OP13-081', ['OP13-081.self-cost']) }),
  officialCard(L, 'P-105', { abilityIds: ids('P-105', ['P-105.self-cost', 'P-105.conditional-blocker']) }),
  officialCard(L, 'ST35-001', { blocker: true, abilityIds: ids('ST35-001') }),
  officialCard(L, 'ST35-002', { abilityIds: ids('ST35-002') }),
  officialCard(L, 'ST35-003', { abilityIds: ids('ST35-003') }),
  officialCard(L, 'ST35-004', { blocker: true, abilityIds: ids('ST35-004', ['ST35-004.self-cost']) }),
  officialCard(L, 'ST35-005', { abilityIds: ids('ST35-005', ['ST35-005.self-cost']) }),
]
export const ST35_OFFICIAL_ABILITY_DEFINITIONS = abilities
