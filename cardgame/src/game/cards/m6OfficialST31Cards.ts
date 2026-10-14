import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { after, ability, bindAll, draw, giveRestedDon, ownLeaderOrCharacter, playChosen, power, trashFromHand, upTo } from './dsl'

// M6 ST-31 (RED Monkey.D.Luffy) and its reprints (OP04, OP11, OP13, OP14, P-101). Texts are the official English card list
// (series 569031) archived with the ST-31 snapshot; the ST-31 FAQ, the OP-04/OP-11 FAQ and the errata snapshot are in
// docs/game/evidence/m6/sources/. OP04-016's cost is read on its official card image (sources/images/IMAGES.json): the card list
// prints "-". No runtime branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-31'
const once = { kind: 'ONCE_PER_TURN' as const }
const shc = ['Straw Hat Crew']
const oppPower = (amount: number, bind: string, duration: 'THIS_TURN' | 'UNTIL_END_OF_OPPONENT_NEXT_TURN', perBinding?: string): Step =>
  ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: bind, amount, duration, ...(perBinding ? { perBinding } : {}) } })
/** "Give up to 1 rested DON!! card to 1 of your [Monkey.D.Luffy] cards". */
const donToLuffy = (): Step[] => [upTo(1, 'luffy', { side: 'OWN', zone: 'leaderOrCharacters', nameIs: 'Monkey.D.Luffy' }), ...giveRestedDon('luffy')]
const minusTarget = (amount: number): Step[] => [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), oppPower(amount, 'target', 'THIS_TURN')]

const abilities: EffectDefinition[] = [
  // OP04-016 Bad Manners Kick Course: [Counter] You may trash 1 card from your hand: Up to 1 of your Leader or Character cards
  // gains +3000 power during this battle (FAQ OP04-016: without trashing, no power). [Trigger] Give up to 1 of your opponent's
  // Leader or Character cards -3000 power during this turn.
  ability('OP04-016.counter', def('OP04-016'), 'hand', 'COUNTER', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE' },
    trashFromHand('paid', 'paid'), ...after('paid', [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 3000, 'THIS_BATTLE')])]),
  ability('OP04-016.trigger-power', def('OP04-016'), 'temporary', 'TRIGGER', [upTo(1, 'target', { side: 'OPPONENT', zone: 'leaderOrCharacters' }), oppPower(-3000, 'target', 'THIS_TURN')]),
  // OP11-009 Nico Robin: [DON!! x2] [When Attacking] Give up to 1 of your opponent's Characters -2000 power until the end of your
  // opponent's next turn.
  ability('OP11-009.when-attacking-power', def('OP11-009'), 'characters', 'WHEN_ATTACKING', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), oppPower(-2000, 'target', 'UNTIL_END_OF_OPPONENT_NEXT_TURN')],
    { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 2 } }),
  // OP11-012 Franky: [Your Turn] [Once Per Turn] When your opponent activates an Event, all of your Characters gain +2000 power
  // during this turn (FAQ OP11-012: not for a [Trigger]; the Event resolves first).
  ability('OP11-012.opponent-event-power', def('OP11-012'), 'characters', 'ON_OPPONENT_EVENT', [bindAll('all', { side: 'OWN', zone: 'characters' }), power('all', 2000, 'THIS_TURN')],
    { condition: { kind: 'YOUR_TURN' }, usage: once }),
  // OP13-021 Gum-Gum Gatling Gun: [Main] Give up to 1 rested DON!! card to 1 of your [Monkey.D.Luffy] cards. Then, give up to 1 of
  // your opponent's Characters -2000 power during this turn. [Trigger] Give up to 1 opposing Character -2000 this turn.
  ability('OP13-021.main-don-power', def('OP13-021'), 'hand', 'MAIN', [...donToLuffy(), ...minusTarget(-2000)]),
  ability('OP13-021.trigger-power', def('OP13-021'), 'temporary', 'TRIGGER', minusTarget(-2000)),
  // OP14-015 Roronoa Zoro: [Rush]; [When Attacking] Give up to 1 of your opponent's Characters -1000 power during this turn.
  ability('OP14-015.when-attacking-power', def('OP14-015'), 'characters', 'WHEN_ATTACKING', minusTarget(-1000)),
  // P-101 Tony Tony.Chopper: [Blocker]; [On Play] Give up to 1 rested DON!! card to your Leader.
  ability('P-101.on-play-don', def('P-101'), 'characters', 'ON_PLAY', [bindAll('leader', { side: 'OWN', zone: 'leader' }), ...giveRestedDon('leader')]),
  // ST31-001 Sanji: [DON!! x2] [Rush] (keyword below); [On Play] Draw 1 card and play up to 1 {Straw Hat Crew} type Character card
  // with a cost of 5 or less other than [Sanji] from your hand.
  ability('ST31-001.on-play-draw-play', def('ST31-001'), 'characters', 'ON_PLAY', [draw(1), ...playChosen('play', 'hand', { categories: ['CHARACTER'], traitsAny: shc, maxCost: 5, nameNot: 'Sanji' })]),
  // ST31-002 Jinbe: [Blocker]; [On Play] Draw 1 card and play up to 1 {Straw Hat Crew} type card with a cost of 1 from your hand
  // (FAQ ST31-002: a Stage such as ST31-005 too).
  ability('ST31-002.on-play-draw-play', def('ST31-002'), 'characters', 'ON_PLAY', [draw(1), ...playChosen('play', 'hand', { traitsAny: shc, minCost: 1, maxCost: 1 })]),
  // ST31-004 Monkey.D.Luffy: (Rush below); [On Play] For every {Straw Hat Crew} type card on your field, give up to 1 of your
  // opponent's Characters -1000 power during this turn (Leader, Characters and Stage; this Character included).
  ability('ST31-004.on-play-power', def('ST31-004'), 'characters', 'ON_PLAY', [bindAll('crew', { side: 'OWN', zone: 'leaderOrCharacters', traitsAny: shc }), bindAll('crewStage', { side: 'OWN', zone: 'stage', traitsAny: shc }),
    upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), oppPower(-1000, 'target', 'THIS_TURN', 'crew'), oppPower(-1000, 'target', 'THIS_TURN', 'crewStage')]),
  // ST31-005 Thousand Sunny: [On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card and add
  // it to your hand. Then, place the rest at the bottom of your deck in any order. [Activate: Main] You may rest this Stage: Give up
  // to 1 rested DON!! card to 1 of your [Monkey.D.Luffy] cards.
  ability('ST31-005.on-play-search', def('ST31-005'), 'stage', 'ON_PLAY', [{ kind: 'SEARCH_TOP_DECK', amount: 5, traitsAny: shc, maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }]),
  ability('ST31-005.activate-main-don', def('ST31-005'), 'stage', 'ACTIVATE_MAIN', donToLuffy(), { cost: { kind: 'REST_SOURCE' } }),
]
export const ST31_OFFICIAL_CONTINUOUS = [
  // ST31-003 Brook: [Opponent's Turn] If you have a total of 3 or more given DON!! cards, +3000 power (and [Blocker] below).
  { id: 'ST31-003.opponent-turn-power', definitionId: def('ST31-003'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 3000, minimumAttachedDon: 0, duringOpponentTurn: true as const, minimumGivenDon: 3 },
]
export const ST31_OFFICIAL_CONDITIONAL_KEYWORDS = [
  { id: 'ST31-001.conditional-rush', definitionId: def('ST31-001'), zone: 'characters' as const, keyword: 'RUSH' as const, minimumAttachedDon: 2 },
  // FAQ ST31-003: checked when the Blocker would be activated (not with 2 or less given DON!! at that time).
  { id: 'ST31-003.conditional-blocker', definitionId: def('ST31-003'), zone: 'characters' as const, keyword: 'BLOCKER' as const, minimumAttachedDon: 0, duringOpponentTurn: true as const, minimumGivenDon: 3 },
  { id: 'ST31-004.conditional-rush', definitionId: def('ST31-004'), zone: 'characters' as const, keyword: 'RUSH' as const, minimumAttachedDon: 0, minimumGivenDon: 3 },
]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST31_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'OP04-016', { abilityIds: ids('OP04-016'), counterEvent: { abilityId: 'OP04-016.counter' },
    printedCostFromImage: { value: 0, source: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP04-016_p3.png', checkedAt: '2026-10-14' } }),
  officialCard(L, 'OP11-009', { abilityIds: ids('OP11-009') }),
  officialCard(L, 'OP11-012', { abilityIds: ids('OP11-012') }),
  officialCard(L, 'OP13-021', { abilityIds: ids('OP13-021') }),
  officialCard(L, 'OP14-015', { keywords: ['RUSH'], abilityIds: ids('OP14-015') }),
  officialCard(L, 'P-101', { blocker: true, abilityIds: ids('P-101') }),
  officialCard(L, 'ST31-001', { abilityIds: ids('ST31-001', ['ST31-001.conditional-rush']) }),
  officialCard(L, 'ST31-002', { blocker: true, abilityIds: ids('ST31-002') }),
  officialCard(L, 'ST31-003', { abilityIds: ['ST31-003.opponent-turn-power', 'ST31-003.conditional-blocker'] }),
  officialCard(L, 'ST31-004', { abilityIds: ids('ST31-004', ['ST31-004.conditional-rush']) }),
  officialCard(L, 'ST31-005', { abilityIds: ids('ST31-005') }),
]
export const ST31_OFFICIAL_ABILITY_DEFINITIONS = abilities
