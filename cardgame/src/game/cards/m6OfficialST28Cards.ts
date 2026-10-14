import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { after, ability, bindAll, check, deckTopToLife, grantRush, ko, ownLeaderOrCharacter, playThisCardSteps, power, rest, trashFromHand, upTo } from './dsl'

// M6 ST-28 (GREEN/YELLOW Yamato) and the cards it reprints (OP06, OP07-116, OP09-035, ST13-016). Texts are the official English
// card list (series 569028) archived with the ST-28 snapshot; the FAQ (ST28-004, OP06-103, ST13-016) and the errata snapshot are
// in docs/game/evidence/m6/sources/. No runtime branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-28'
const once = { kind: 'ONCE_PER_TURN' as const }
const don2 = { kind: 'SOURCE_ATTACHED_DON_AT_LEAST' as const, minimum: 2 }
const wano = { kind: 'LEADER_HAS_TRAIT' as const, trait: 'Land of Wano' }
const oppLifeAtMost = (maximum: number) => ({ kind: 'LIFE_AT_MOST' as const, player: 'OPPONENT' as const, maximum })
/** "[Trigger] If <condition>, play this card." The condition is checked in the program: when it fails the card is trashed. */
const triggerPlayIf = (condition: NonNullable<Extract<Step, { kind: 'OPERATION' }>['whenCondition']>): Step[] => [check('ok', condition), ...after('ok', playThisCardSteps())]
/** "Give up to N rested DON!! cards to <bound card>". */
const giveDon = (n: number, target: string): Step[] => [upTo(n, 'restedDon', { side: 'OWN', zone: 'cost', rested: true }),
  { kind: 'OPERATION', operation: { primitive: 'attachRestedDon', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'restedDon', targetBinding: target } }]
/** "You may trash N cards from your hand:" — all or nothing; `bind` holds the trashed cards. */
const mayTrash = (n: number, bind = 'paid'): Step[] => [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: n, bind, visibility: 'PRIVATE', allOrNone: true }, trashFromHand(bind, bind)]
const blazeSlice = (): Step[] => [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 1000, 'THIS_TURN'),
  { ...upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 4 }), whenCondition: oppLifeAtMost(2) } as Step, rest('target')]

const abilities: EffectDefinition[] = [
  // OP06-022 Leader Yamato: [Double Attack]; [Activate: Main] [Once Per Turn] If your opponent has 3 or less Life cards, give up
  // to 2 rested DON!! cards to 1 of your Characters.
  ability('OP06-022.activate-main-don', def('OP06-022'), 'leader', 'ACTIVATE_MAIN', [upTo(1, 'donTarget', { side: 'OWN', zone: 'characters' }), ...giveDon(2, 'donTarget')],
    { condition: oppLifeAtMost(3), usage: once }),
  // ST28-001 Ashura Doji: [On Play] If your Leader has the {Land of Wano} type and your opponent has 3 or more Life cards, K.O.
  // up to 1 of your opponent's Characters with a base cost of 5 or less.
  ability('ST28-001.on-play-ko', def('ST28-001'), 'characters', 'ON_PLAY', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 5, costBasis: 'BASE' }), ko('target')],
    { condition: { kind: 'ALL_OF', conditions: [wano, { kind: 'LIFE_AT_LEAST', player: 'OPPONENT', minimum: 3 }] } }),
  // ST28-002 Izo: [DON!! x2] [Blocker] (conditional keyword below); [On Play] Your {Land of Wano} type Leader gains [Banish]
  // during this turn.
  ability('ST28-002.on-play-banish', def('ST28-002'), 'characters', 'ON_PLAY', [bindAll('leader', { side: 'OWN', zone: 'leader', traitsAny: ['Land of Wano'] }),
    { kind: 'OPERATION', operation: { primitive: 'grantKeyword', version: '1.0.0', audience: 'PUBLIC', keyword: 'BANISH', duration: 'THIS_TURN', subjectBinding: 'leader' } }]),
  // ST28-003 Kin'emon: [Trigger] If your Leader has the {Land of Wano} type and your opponent has 3 or less Life cards, play this card.
  ability('ST28-003.trigger-play', def('ST28-003'), 'temporary', 'TRIGGER', triggerPlayIf({ kind: 'ALL_OF', conditions: [wano, oppLifeAtMost(3)] })),
  // ST28-004 Kouzuki Momonosuke: [Activate: Main] [Once Per Turn] You may return 2 total of your currently given DON!! cards to
  // your cost area rested (FAQ ST28-004: from different cards allowed): this Character gains [Rush] and +1000 power this turn.
  ability('ST28-004.activate-main-rush', def('ST28-004'), 'characters', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'givenDon' }, optional: true, min: 0, max: 2, bind: 'paid', visibility: 'PUBLIC', allOrNone: true },
    { kind: 'OPERATION', operation: { primitive: 'returnGivenDon', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'paid' } },
    ...after('paid', [grantRush(), { kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', amount: 1000, duration: 'THIS_TURN' } }])], { usage: once }),
  // ST28-005 Yamato: [On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Land of Wano} type card with a cost of 2
  // or more and add it to your hand. Then, place the rest at the bottom of your deck in any order.
  ability('ST28-005.on-play-search', def('ST28-005'), 'characters', 'ON_PLAY', [{ kind: 'SEARCH_TOP_DECK', amount: 5, traitsAny: ['Land of Wano'], minCost: 2, maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }]),
  // OP06-100 Inuarashi: [DON!! x2] [When Attacking] You may trash 1 card from your hand: K.O. up to 1 of your opponent's Characters
  // with a cost equal to or less than the number of your opponent's Life cards. [Trigger] If your opponent has 3 or less Life
  // cards, play this card.
  ability('OP06-100.when-attacking-ko', def('OP06-100'), 'characters', 'WHEN_ATTACKING', [...mayTrash(1), ...after('paid', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCostFromLife: 'OPPONENT' }), ko('target')])], { condition: don2 }),
  ability('OP06-100.trigger-play', def('OP06-100'), 'temporary', 'TRIGGER', triggerPlayIf(oppLifeAtMost(3))),
  // OP06-103 Kawamatsu: [When Attacking] You may trash 2 cards from your hand: Add up to 1 of your Characters with 0 power to the
  // top or bottom of the owner's Life cards face-up (FAQ OP06-103: exactly 0, not below). [Trigger] If your opponent has 3 or
  // less Life cards, play this card.
  ability('OP06-103.when-attacking-life', def('OP06-103'), 'characters', 'WHEN_ATTACKING', [...mayTrash(2), ...after('paid', [upTo(1, 'target', { side: 'OWN', zone: 'characters', minPower: 0, maxPower: 0 })]),
    { kind: 'MODE', modes: 2, bind: 'end', whenBindingNonempty: 'target' },
    { kind: 'OPERATION', operation: { primitive: 'addToLife', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'target', from: 'characters', faceUp: true, bottomBinding: 'end.1' }, whenBindingNonempty: 'target' }]),
  ability('OP06-103.trigger-play', def('OP06-103'), 'temporary', 'TRIGGER', triggerPlayIf(oppLifeAtMost(3))),
  // OP06-104 Kikunojo: [On K.O.] If your opponent has 3 or less Life cards, add up to 1 card from the top of your deck to the top
  // of your Life cards. [Trigger] If your opponent has 3 or less Life cards, play this card.
  ability('OP06-104.on-ko-life', def('OP06-104'), 'characters', 'ON_KO', deckTopToLife(), { condition: oppLifeAtMost(3) }),
  ability('OP06-104.trigger-play', def('OP06-104'), 'temporary', 'TRIGGER', triggerPlayIf(oppLifeAtMost(3))),
  // OP06-109 Denjiro: [DON!! x2] cannot be K.O.'d by effects with 3 or less opposing Life (protection below). [Trigger] same play.
  ability('OP06-109.trigger-play', def('OP06-109'), 'temporary', 'TRIGGER', triggerPlayIf(oppLifeAtMost(3))),
  // OP06-110 Nekomamushi: [DON!! x2] can also attack your opponent's active Characters (keyword below). [Trigger] same play.
  ability('OP06-110.trigger-play', def('OP06-110'), 'temporary', 'TRIGGER', triggerPlayIf(oppLifeAtMost(3))),
  // OP06-112 Raizo: [When Attacking] You may trash 1 card from your hand: Rest up to 1 of your opponent's DON!! cards. [Trigger]
  // If your opponent has 3 or less Life cards, play this card.
  ability('OP06-112.when-attacking-rest-don', def('OP06-112'), 'characters', 'WHEN_ATTACKING', [...mayTrash(1), ...after('paid', [upTo(1, 'don', { side: 'OPPONENT', zone: 'cost' }), rest('don')])]),
  ability('OP06-112.trigger-play', def('OP06-112'), 'temporary', 'TRIGGER', triggerPlayIf(oppLifeAtMost(3))),
  // OP09-035 Portgas.D.Ace: [On Play] If you have 2 or more rested Characters, rest up to 1 opposing Character cost 5 or less.
  ability('OP09-035.on-play-rest', def('OP09-035'), 'characters', 'ON_PLAY', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 5 }), rest('target')],
    { condition: { kind: 'OWN_RESTED_CHARACTERS_AT_LEAST', minimum: 2 } }),
  // ST13-016 Yamato: [Rush]; [On Play] Look at all your Life cards; place 1 at the top of your deck and place the rest back in
  // your Life area in any order (FAQ ST13-016: face-up cards stay face-up).
  ability('ST13-016.on-play-life', def('ST13-016'), 'characters', 'ON_PLAY', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'life', lifeEnd: 'ALL' }, optional: false, min: 1, max: 1, bind: 'toDeck', visibility: 'PRIVATE', reveal: 'CHOOSER', skipIfNone: true },
    { kind: 'OPERATION', operation: { primitive: 'lifeToDeckTop', version: '1.0.0', audience: 'CONTROLLER', subjectBinding: 'toDeck' } },
    { kind: 'CHOICE', choiceType: 'ORDER', selector: { kind: 'CARDS', side: 'OWN', zone: 'life', lifeEnd: 'ALL' }, optional: false, min: 0, max: 5, bind: 'lifeOrder', visibility: 'PRIVATE', reveal: 'CHOOSER', skipIfNone: true },
    { kind: 'OPERATION', operation: { primitive: 'arrangeLife', version: '1.0.0', audience: 'CONTROLLER', orderBinding: 'lifeOrder' } }]),
  // OP07-116 Blaze Slice: [Main]/[Counter] Up to 1 of your Leader or Character cards gains +1000 power during this turn. Then, if
  // your opponent has 2 or less Life cards, rest up to 1 opposing Character cost 4 or less. [Trigger] Rest up to 1 opposing
  // Character cost 4 or less.
  ability('OP07-116.main-power-rest', def('OP07-116'), 'hand', 'MAIN', blazeSlice()),
  ability('OP07-116.counter', def('OP07-116'), 'hand', 'COUNTER', blazeSlice()),
  ability('OP07-116.trigger-rest', def('OP07-116'), 'temporary', 'TRIGGER', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 4 }), rest('target')]),
]
export const ST28_OFFICIAL_CONTINUOUS = [
  // ST28-004 Kouzuki Momonosuke: [Your Turn] If you have 2 or less Life cards, your Leader gains +1000 power.
  { id: 'ST28-004.your-turn-leader-power', definitionId: def('ST28-004'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 1000, minimumAttachedDon: 0, duringYourTurn: true as const, maximumOwnLife: 2, targets: { leaderOnly: true as const } },
  // ST28-005 Yamato: [DON!! x2] [Your Turn] This Character gains +3000 power.
  { id: 'ST28-005.your-turn-power', definitionId: def('ST28-005'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 3000, minimumAttachedDon: 2, duringYourTurn: true as const },
]
export const ST28_OFFICIAL_CONDITIONAL_KEYWORDS = [
  { id: 'ST28-002.conditional-blocker', definitionId: def('ST28-002'), zone: 'characters' as const, keyword: 'BLOCKER' as const, minimumAttachedDon: 2 },
  { id: 'OP06-110.attack-active', definitionId: def('OP06-110'), zone: 'characters' as const, keyword: 'ATTACK_ACTIVE_CHARACTERS' as const, minimumAttachedDon: 2 },
]
export const ST28_OFFICIAL_KO_PROTECTIONS = [
  { id: 'OP06-109.no-effect-ko', definitionId: def('OP06-109'), zone: 'characters' as const, from: 'EFFECT' as const, minimumAttachedDon: 2, maximumOpponentLife: 3 },
]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST28_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'OP06-022', { keywords: ['DOUBLE_ATTACK'], abilityIds: ids('OP06-022') }),
  officialCard(L, 'ST28-001', { abilityIds: ids('ST28-001') }),
  officialCard(L, 'ST28-002', { abilityIds: ids('ST28-002', ['ST28-002.conditional-blocker']) }),
  officialCard(L, 'ST28-003', { abilityIds: ids('ST28-003') }),
  officialCard(L, 'ST28-004', { abilityIds: ids('ST28-004', ['ST28-004.your-turn-leader-power']) }),
  officialCard(L, 'ST28-005', { abilityIds: ids('ST28-005', ['ST28-005.your-turn-power']) }),
  officialCard(L, 'OP06-100', { abilityIds: ids('OP06-100') }),
  officialCard(L, 'OP06-103', { abilityIds: ids('OP06-103') }),
  officialCard(L, 'OP06-104', { abilityIds: ids('OP06-104') }),
  officialCard(L, 'OP06-109', { abilityIds: ids('OP06-109', ['OP06-109.no-effect-ko']) }),
  officialCard(L, 'OP06-110', { abilityIds: ids('OP06-110', ['OP06-110.attack-active']) }),
  officialCard(L, 'OP06-112', { abilityIds: ids('OP06-112') }),
  officialCard(L, 'OP09-035', { abilityIds: ids('OP09-035') }),
  officialCard(L, 'ST13-016', { keywords: ['RUSH'], abilityIds: ids('ST13-016') }),
  officialCard(L, 'OP07-116', { abilityIds: ids('OP07-116'), counterEvent: { abilityId: 'OP07-116.counter' } }),
]
export const ST28_OFFICIAL_ABILITY_DEFINITIONS = abilities
