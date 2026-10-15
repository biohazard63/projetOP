import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { addCost, after, ability, bindAll, check, draw, ko, koAny, moveFromTrashToHand, playChosen, power, rest, trashFromHand, upTo } from './dsl'

// M6 ST-27 (BLACK Marshall.D.Teach) and its OP09/OP10 reprints. Texts are the official English card list (series 569027) archived
// with the ST-27 snapshot; the ST-23-28 FAQ (ST27-002, 004, 005), the OP-09 FAQ (OP09-081, 086, 089) and the errata snapshot are in
// docs/game/evidence/m6/sources/. The composition gate (OP10-084 corroborated by Bandai) is in scripts/starterAudit/. No runtime
// branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-27'
const once = { kind: 'ONCE_PER_TURN' as const }
const bb = ['Blackbeard Pirates']
const bbLeader = { kind: 'LEADER_HAS_TRAIT' as const, trait: 'Blackbeard Pirates' }
const drawOnKO = (number: string) => ability(`${number}.on-ko-draw`, def(number), 'characters', 'ON_KO', [draw(1)])
/** "You may trash this Character:" — `paid` holds it (not a K.O., FAQ ST27-002). */
const trashSelf = (): Step[] => [
  { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters', isSource: true }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC' },
  { kind: 'OPERATION', operation: { primitive: 'trashCharacter', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'paid' }, whenBindingNonempty: 'paid' }]
const bbSearch = (amount: number, whenBindingNonempty?: string): Step => ({ kind: 'SEARCH_TOP_DECK', amount, traitsAny: bb, maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER', ...(whenBindingNonempty ? { whenBindingNonempty } : {}) })

const abilities: EffectDefinition[] = [
  // OP09-081 Leader Marshall.D.Teach: Your [On Play] effects are negated (rule below). [Activate: Main] You may trash 1 card from your
  // hand: Your opponent's [On Play] effects are negated until the end of your opponent's next turn (FAQ OP09-081: [When Attacking]
  // effects are not; a [Trigger] activating an [On Play] does nothing).
  ability('OP09-081.activate-main-negate', def('OP09-081'), 'leader', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE' }, trashFromHand('paid', 'paid'),
    { kind: 'OPERATION', operation: { primitive: 'negateOnPlay', version: '1.0.0', audience: 'PUBLIC', player: 'OPPONENT', duration: 'UNTIL_END_OF_OPPONENT_NEXT_TURN' }, whenBindingNonempty: 'paid' }]),
  // OP09-083 Van Augur: [Activate: Main] You may rest this Character: If your Leader has the {Blackbeard Pirates} type, give up to 1 of
  // your opponent's Characters -3 cost during this turn. [On K.O.] Draw 1 card.
  ability('OP09-083.activate-main-cost', def('OP09-083'), 'characters', 'ACTIVATE_MAIN', [check('bb', bbLeader), ...after('bb', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), addCost('target', -3)])], { cost: { kind: 'REST_SOURCE' } }),
  drawOnKO('OP09-083'),
  // OP09-088 Shiryu: [DON!! x1] [When Attacking] You may trash 2 cards from your hand: Draw 2 cards.
  ability('OP09-088.when-attacking-draw', def('OP09-088'), 'characters', 'WHEN_ATTACKING', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 2, bind: 'paid', visibility: 'PRIVATE', allOrNone: true, whenCondition: { kind: 'HAND_AT_LEAST', player: 'CONTROLLER', minimum: 2 } },
    trashFromHand('paid', 'paid'), { ...draw(2), whenBindingNonempty: 'paid' } as Step], { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 1 } }),
  // OP09-089 Stronger: [Activate: Main] You may trash 1 card from your hand and trash this Character: If your Leader has the {Blackbeard
  // Pirates} type, draw 1 card. Then, give up to 1 of your opponent's Characters -2 cost during this turn (FAQ OP09-089: the drawn
  // card may be looked at first; FAQ EB03-017/OP14-112: the "Then," part follows the Leader condition).
  ability('OP09-089.activate-main-draw', def('OP09-089'), 'characters', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE' }, trashFromHand('paid', 'paid'),
    bindAll('self', { side: 'OWN', zone: 'characters', isSource: true }),
    { kind: 'OPERATION', operation: { primitive: 'trashCharacter', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'self' }, whenBindingNonempty: 'paid' },
    { ...draw(1), whenBindingNonempty: 'paid', whenCondition: bbLeader } as Step,
    { ...upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }, { whenBindingNonempty: 'paid' }), whenCondition: bbLeader } as Step, addCost('target', -2)]),
  // OP09-090 Doc Q: [Activate: Main] You may rest this Character: If your Leader has the {Blackbeard Pirates} type, K.O. up to 1 of
  // your opponent's Characters with a cost of 1 or less. [On K.O.] Draw 1 card.
  ability('OP09-090.activate-main-ko', def('OP09-090'), 'characters', 'ACTIVATE_MAIN', [check('bb', bbLeader), ...after('bb', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 1 }), ko('target')])], { cost: { kind: 'REST_SOURCE' } }),
  drawOnKO('OP09-090'),
  // OP09-095 Laffitte: [Activate: Main] You may rest 1 of your DON!! cards and this Character: Look at 5; reveal up to 1 {Blackbeard
  // Pirates} card to hand, the rest at the bottom in any order.
  ability('OP09-095.activate-main-search', def('OP09-095'), 'characters', 'ACTIVATE_MAIN', [bbSearch(5)], { cost: { kind: 'SEQUENCE', parts: [{ kind: 'REST_DON', amount: 1 }, { kind: 'REST_SOURCE' }] } }),
  // OP09-099 Fullalead: [Activate: Main] You may trash 1 card from your hand and rest this Stage: Look at 3; reveal up to 1 {Blackbeard
  // Pirates} card to hand, the rest at the bottom in any order.
  ability('OP09-099.activate-main-search', def('OP09-099'), 'stage', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'stage', isSource: true, rested: false }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC', skipIfNone: true, whenCondition: { kind: 'HAND_AT_LEAST', player: 'CONTROLLER', minimum: 1 } },
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: false, min: 1, max: 1, bind: 'discard', visibility: 'PRIVATE', whenBindingNonempty: 'paid' },
    rest('paid'), trashFromHand('discard', 'discard'), bbSearch(3, 'paid')]),
  // ST27-001 Avalo Pizarro: [Activate: Main] [Once Per Turn] You may rest 1 of your [Fullalead] cards: If your Leader has the
  // {Blackbeard Pirates} type, this Character gains +4000 power during this turn. [On K.O.] Draw 1 card.
  ability('ST27-001.activate-main-power', def('ST27-001'), 'characters', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'stage', nameIs: 'Fullalead', rested: false }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC' },
    rest('paid'), bindAll('self', { side: 'OWN', zone: 'characters', isSource: true }), { ...power('self', 4000, 'THIS_TURN'), whenBindingNonempty: 'paid', whenCondition: bbLeader } as Step], { usage: once }),
  drawOnKO('ST27-001'),
  // ST27-002 Catarina Devon: [Activate: Main] You may trash this Character: If your Leader has the {Blackbeard Pirates} type, give up to
  // 1 opposing Character -1 cost during this turn. [On K.O.] Draw 1 card (FAQ ST27-002: trashing it is not a K.O.).
  ability('ST27-002.activate-main-cost', def('ST27-002'), 'characters', 'ACTIVATE_MAIN', [...trashSelf(),
    { ...upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }, { whenBindingNonempty: 'paid' }), whenCondition: bbLeader } as Step, addCost('target', -1)]),
  drawOnKO('ST27-002'),
  // ST27-003 Kuzan: [Blocker]; [On K.O.] Play up to 1 {Blackbeard Pirates} type Character card with a cost of 5 or less from your trash rested.
  ability('ST27-003.on-ko-play', def('ST27-003'), 'characters', 'ON_KO', playChosen('play', 'trash', { categories: ['CHARACTER'], traitsAny: bb, maxCost: 5 }, { rested: true })),
  // ST27-004 Sanjuan.Wolf: (with a {Blackbeard Pirates} Leader: [Blocker] and +1 cost for every 4 trash cards, below); [On Play] Trash
  // 1 card from your hand.
  ability('ST27-004.on-play-trash', def('ST27-004'), 'characters', 'ON_PLAY', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: false, min: 1, max: 1, bind: 'discard', visibility: 'PRIVATE', clampMin: true }, trashFromHand('discard')]),
  // ST27-005 Marshall.D.Teach: [Activate: Main] You may rest this Character: K.O. up to 1 Character with a cost of 3 or less (FAQ ST27-005:
  // yours too). [On K.O.] Add up to 1 black card from your trash to your hand (FAQ ST27-005: this card too).
  ability('ST27-005.activate-main-ko', def('ST27-005'), 'characters', 'ACTIVATE_MAIN', [upTo(1, 'target', { side: 'ANY', zone: 'characters', maxCost: 3 }), koAny('target')], { cost: { kind: 'REST_SOURCE' } }),
  ability('ST27-005.on-ko-return', def('ST27-005'), 'characters', 'ON_KO', [upTo(1, 'back', { side: 'OWN', zone: 'trash', colorsAny: ['BLACK'] }), moveFromTrashToHand('back')]),
]
export const ST27_OFFICIAL_CONTINUOUS = [
  // OP09-086 Jesus Burgess: If your Leader has the {Blackbeard Pirates} type, +1000 power for every 4 cards in your trash (FAQ OP09-086:
  // counted continuously).
  { id: 'OP09-086.trash-power', definitionId: def('OP09-086'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 1000, minimumAttachedDon: 0, whenLeaderHasTrait: 'Blackbeard Pirates', perTrashCards: 4 },
  // ST27-004 Sanjuan.Wolf: +1 cost for every 4 cards in your trash with a {Blackbeard Pirates} Leader (FAQ ST27-004: 11 or more possible).
  { id: 'ST27-004.trash-cost', definitionId: def('ST27-004'), zone: 'characters' as const, characteristic: 'COST' as const, amount: 1, minimumAttachedDon: 0, whenLeaderHasTrait: 'Blackbeard Pirates', perTrashCards: 4 },
]
export const ST27_OFFICIAL_CONDITIONAL_KEYWORDS = [
  { id: 'ST27-004.conditional-blocker', definitionId: def('ST27-004'), zone: 'characters' as const, keyword: 'BLOCKER' as const, minimumAttachedDon: 0, leaderHasTrait: 'Blackbeard Pirates' },
]
// OP09-086 Jesus Burgess: This Character cannot be K.O.'d by your opponent's effects.
export const ST27_OFFICIAL_KO_PROTECTIONS = [{ id: 'OP09-086.no-opponent-effect-ko', definitionId: def('OP09-086'), zone: 'characters' as const, from: 'EFFECT' as const, opponentEffectsOnly: true as const }]
// OP09-081 Leader Marshall.D.Teach: Your [On Play] effects are negated.
export const ST27_OFFICIAL_LEADER_RULES = [{ id: 'OP09-081.negate-own-on-play', definitionId: def('OP09-081'), zone: 'leader' as const, rule: 'NEGATE_OWN_ON_PLAY' as const }]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST27_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'OP09-081', { abilityIds: ids('OP09-081', ['OP09-081.negate-own-on-play']) }),
  officialCard(L, 'OP09-083', { abilityIds: ids('OP09-083') }),
  officialCard(L, 'OP09-086', { abilityIds: ['OP09-086.trash-power', 'OP09-086.no-opponent-effect-ko'] }),
  officialCard(L, 'OP09-088', { abilityIds: ids('OP09-088') }),
  officialCard(L, 'OP09-089', { abilityIds: ids('OP09-089') }),
  officialCard(L, 'OP09-090', { abilityIds: ids('OP09-090') }),
  officialCard(L, 'OP09-095', { abilityIds: ids('OP09-095') }),
  officialCard(L, 'OP09-099', { abilityIds: ids('OP09-099') }),
  officialCard(L, 'ST27-001', { abilityIds: ids('ST27-001') }),
  officialCard(L, 'ST27-002', { abilityIds: ids('ST27-002') }),
  officialCard(L, 'ST27-003', { blocker: true, abilityIds: ids('ST27-003') }),
  officialCard(L, 'ST27-004', { abilityIds: ids('ST27-004', ['ST27-004.trash-cost', 'ST27-004.conditional-blocker']) }),
  officialCard(L, 'ST27-005', { abilityIds: ids('ST27-005') }),
]
export const ST27_OFFICIAL_ABILITY_DEFINITIONS = abilities
