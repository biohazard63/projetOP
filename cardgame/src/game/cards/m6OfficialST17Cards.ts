import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { ability, after, bindAll, draw, lookTopAndPlace, ownLeaderOrCharacter, playChosen, power, rest, returnToHand, toDeckBottom, upTo, giveRestedDon } from './dsl'

// M6 ST-17 (Blue Donquixote Doflamingo). Texts are the official English card list (series 569017) archived with the ST-17
// snapshot; the OP-01/OP-02/promotion/ST-15-20 FAQ and the errata snapshot are in docs/game/evidence/m6/sources/.
// OP02-054 (no ability) is the M5 recognised definition.
type Step = EffectDefinition['program'][number]
const L = 'ST-17'
const warlord = ['The Seven Warlords of the Sea']
const don2 = { kind: 'SOURCE_ATTACHED_DON_AT_LEAST' as const, minimum: 2 }
const payDon = (n: number): Step[] => [
  { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'cost', rested: false }, optional: true, min: 0, max: n, bind: 'paid', visibility: 'PUBLIC', allOrNone: true, whenCondition: { kind: 'ACTIVE_DON_AT_LEAST', minimum: n } },
  rest('paid')]
const toDeckTop = (bind: string, whenBindingNonempty?: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'CONTROLLER', audience: 'CONTROLLER', subjectBinding: bind, from: 'hand', to: 'deck', deckPosition: 'TOP' }, ...(whenBindingNonempty ? { whenBindingNonempty } : {}) })
const moveDeckToHand = (bind: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'CONTROLLER', audience: 'CONTROLLER', subjectBinding: bind, from: 'deck', to: 'hand' } })

const abilities: EffectDefinition[] = [
  // OP01-060 Leader: [DON!! x2] [When Attacking] ➀: Reveal 1 card from the top of your deck. If that card is a {The Seven
  // Warlords of the Sea} type Character card with a cost of 4 or less, you may play that card rested (FAQ OP01-060: otherwise
  // it returns face-down to the top of the deck).
  ability('OP01-060.when-attacking-reveal', def('OP01-060'), 'leader', 'WHEN_ATTACKING', [...payDon(1), ...after('paid', [bindAll('revealed', { side: 'OWN', zone: 'deck', topN: 1 }), { kind: 'REVEAL_BINDING', bind: 'revealed' }]),
    ...playChosen('revealed.play', 'deck', { topN: 1, inBinding: 'revealed', categories: ['CHARACTER'], maxCost: 4, traitsAny: warlord }, { rested: true, skipIfNone: true, whenBindingNonempty: 'paid' })], { condition: don2 }),
  // ST17-001 Crocodile: [On Play] Reveal 1 card from the top of your deck. If that card is a {The Seven Warlords of the Sea}
  // type card, draw 2 cards and place 1 card from your hand at the top of your deck (FAQ ST17-001: the revealed card is one of
  // the 2 drawn; otherwise it returns face-down to the top).
  ability('ST17-001.on-play-reveal', def('ST17-001'), 'characters', 'ON_PLAY', [bindAll('revealed', { side: 'OWN', zone: 'deck', topN: 1 }), { kind: 'REVEAL_BINDING', bind: 'revealed' },
    bindAll('hit', { side: 'OWN', zone: 'deck', topN: 1, inBinding: 'revealed', traitsAny: warlord }), { ...draw(2), whenBindingNonempty: 'hit' } as Step,
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: false, min: 1, max: 1, bind: 'placed', visibility: 'PRIVATE', clampMin: true, whenBindingNonempty: 'hit' }, toDeckTop('placed', 'placed')]),
  // ST17-002 Trafalgar Law: [On Play] You may return 1 of your Characters to the owner's hand: If your Leader has the {The Seven
  // Warlords of the Sea} type, return up to 1 Character with a cost of 4 or less to the owner's hand (FAQ ST17-002).
  ability('ST17-002.on-play-return', def('ST17-002'), 'characters', 'ON_PLAY', [upTo(1, 'paid', { side: 'OWN', zone: 'characters' }), returnToHand('paid'),
    ...after('paid', [{ ...upTo(1, 'target', { side: 'ANY', zone: 'characters', maxCost: 4 }), whenCondition: { kind: 'LEADER_HAS_TRAIT', trait: warlord[0] } } as Step, returnToHand('target')])]),
  // ST17-003 Buggy: [On Play] Look at 3 cards from the top of your deck and place them at the top of your deck in any order.
  ability('ST17-003.on-play-order', def('ST17-003'), 'characters', 'ON_PLAY', [
    { kind: 'CHOICE', choiceType: 'ORDER', selector: { kind: 'CARDS', side: 'OWN', zone: 'deck', topN: 3 }, optional: false, min: 0, max: 3, bind: 'look.order', visibility: 'PRIVATE' },
    { kind: 'OPERATION', operation: { primitive: 'arrangeTopDeck', version: '1.0.0', audience: 'CONTROLLER', orderBinding: 'look.order' } }]),
  // ST17-004 Boa Hancock: [Blocker]; [On Play] look at 3 and place them top or bottom in any order. Then, give up to 1 rested
  // DON!! card to 1 of your {The Seven Warlords of the Sea} type Leader or Character cards.
  ability('ST17-004.on-play-look-don', def('ST17-004'), 'characters', 'ON_PLAY', [...lookTopAndPlace(3), upTo(1, 'donTarget', { side: 'OWN', zone: 'leaderOrCharacters', traitsAny: warlord }), ...giveRestedDon('donTarget')]),
  // ST17-005 Marshall.D.Teach: [Activate: Main] [Once Per Turn] You may place 1 card from your hand at the top of your deck:
  // Give up to 2 rested DON!! cards to your Leader or 1 of your Characters.
  ability('ST17-005.activate-main-don', def('ST17-005'), 'characters', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE' }, toDeckTop('paid'),
    ...after('paid', [ownLeaderOrCharacter(1, 'donTarget'), upTo(2, 'restedDon', { side: 'OWN', zone: 'cost', rested: true }),
      { kind: 'OPERATION', operation: { primitive: 'attachRestedDon', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'restedDon', targetBinding: 'donTarget' } }])], { usage: { kind: 'ONCE_PER_TURN' } }),
  // OP01-073 Donquixote Doflamingo: [Blocker]; [On Play] look at 5 and place them top or bottom in any order (FAQ OP01-073).
  ability('OP01-073.on-play-look', def('OP01-073'), 'characters', 'ON_PLAY', lookTopAndPlace(5)),
  // OP02-057 Bartholomew Kuma: [On Play] Look at 2 cards from the top of your deck; reveal up to 1 {The Seven Warlords of the
  // Sea} type card and add it to your hand. Then, place the rest at the top or bottom of the deck in any order.
  ability('OP02-057.on-play-search', def('OP02-057'), 'characters', 'ON_PLAY', [bindAll('look', { side: 'OWN', zone: 'deck', topN: 2 }),
    upTo(1, 'taken', { side: 'OWN', zone: 'deck', topN: 2, inBinding: 'look', traitsAny: warlord }), { kind: 'REVEAL_BINDING', bind: 'taken' }, moveDeckToHand('taken'),
    { kind: 'CHOICE', choiceType: 'ORDER', selector: { kind: 'CARDS', side: 'OWN', zone: 'deck', topN: 2, inBinding: 'look' }, optional: false, min: 0, max: 2, bind: 'look.order', visibility: 'PRIVATE' },
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'deck', topN: 2, inBinding: 'look' }, optional: true, min: 0, max: 2, bind: 'look.bottom', visibility: 'PRIVATE', allOrNone: true, skipIfNone: true },
    { kind: 'OPERATION', operation: { primitive: 'arrangeTopDeck', version: '1.0.0', audience: 'CONTROLLER', orderBinding: 'look.order', bottomBinding: 'look.bottom' } }]),
  // P-030 Jinbe: [On K.O.] Place up to 1 Character with a cost of 3 or less at the bottom of the owner's deck (FAQ P-030: own
  // Characters too).
  ability('P-030.on-ko-bottom', def('P-030'), 'characters', 'ON_KO', [upTo(1, 'target', { side: 'ANY', zone: 'characters', maxCost: 3 }), toDeckBottom('target')]),
  // OP01-086 Overheat (errata 2023-02-17): [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this
  // battle. Then, return up to 1 active Character with a cost of 3 or less to the owner's hand. [Trigger] Return up to 1
  // Character with a cost of 4 or less to the owner's hand (FAQ OP01-086: own Characters too).
  ability('OP01-086.counter', def('OP01-086'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'target'), power('target', 4000, 'THIS_BATTLE'),
    upTo(1, 'returned', { side: 'ANY', zone: 'characters', maxCost: 3, rested: false }), returnToHand('returned')]),
  ability('OP01-086.trigger-return', def('OP01-086'), 'temporary', 'TRIGGER', [upTo(1, 'returned', { side: 'ANY', zone: 'characters', maxCost: 4 }), returnToHand('returned')]),
]
const ids = (number: string) => abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id)

export const ST17_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'OP01-060', { abilityIds: ids('OP01-060') }),
  ...['ST17-001', 'ST17-002', 'ST17-003', 'OP02-057', 'P-030'].map(n => officialCard(L, n, { abilityIds: ids(n) })),
  officialCard(L, 'ST17-004', { blocker: true, abilityIds: ids('ST17-004') }),
  officialCard(L, 'ST17-005', { abilityIds: ids('ST17-005') }),
  officialCard(L, 'OP01-073', { blocker: true, abilityIds: ids('OP01-073') }),
  officialCard(L, 'OP01-086', { abilityIds: ids('OP01-086'), counterEvent: { abilityId: 'OP01-086.counter' } }),
]
export const ST17_OFFICIAL_ABILITY_DEFINITIONS = abilities
