import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { after, ability, draw, drawThenTrash, opponentTrashesFromHand, ownLeaderOrCharacter, playChosen, power, returnToHand, toDeckBottom, trashFromHand, upTo } from './dsl'

// M6 ST-33 (BLUE Kuzan) and its OP12/EB04 reprints. Texts are the official English card list (series 569033) archived with the
// ST-33 snapshot; the ST-33 FAQ (ST33-001..004), the OP-12 FAQ (OP12-040, OP12-046, OP12-057) and the errata snapshot are in
// docs/game/evidence/m6/sources/. No runtime branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-33'
const navy = ['Navy']
const navyLeader = { kind: 'LEADER_HAS_TRAIT' as const, trait: 'Navy' }
/** "You may trash N cards from your hand:" — all or nothing (FAQ ST33-001/003: not without the card). */
const mayTrash = (n = 1, bind = 'paid'): Step[] => [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: n, bind, visibility: 'PRIVATE', allOrNone: true }, trashFromHand(bind, bind)]
/** "Trash N cards from your hand" (mandatory, as many as possible, FAQ OP12-046). */
const mustTrash = (n: number, bind = 'discard'): Step[] => [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: false, min: n, max: n, bind, visibility: 'PRIVATE', clampMin: true }, trashFromHand(bind)]
const preventAttack = (bind: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'preventAttack', version: '1.0.0', audience: 'PUBLIC', subjectBinding: bind, duration: 'UNTIL_END_OF_OPPONENT_NEXT_TURN' } })
const bounceCost5 = (): Step[] => [upTo(1, 'target', { side: 'ANY', zone: 'characters', maxCost: 5 }), returnToHand('target')]

const abilities: EffectDefinition[] = [
  // OP12-040 Leader Kuzan: When a card is trashed from your hand by your {Navy} type card's effect, draw cards equal to the number
  // of cards trashed (FAQ OP12-040: also a card trashed instead of a removal).
  ability('OP12-040.hand-trashed-draw', def('OP12-040'), 'leader', 'ON_OWN_HAND_TRASHED',
    [{ kind: 'OPERATION', operation: { primitive: 'drawCards', version: '1.0.0', player: 'CONTROLLER', audience: 'CONTROLLER', amount: 0, amountFromTrigger: 'HAND_TRASHED' } }],
    { condition: { kind: 'HAND_TRASH_SOURCE_HAS_TRAIT', trait: 'Navy' } }),
  // EB04-026 Bluegrass: [On Play] Place up to 1 of your opponent's Characters with a cost of 1 or less at the bottom of the owner's
  // deck. [When Attacking] Draw 1 card and trash 1 card from your hand.
  ability('EB04-026.on-play-bottom', def('EB04-026'), 'characters', 'ON_PLAY', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 1 }), toDeckBottom('target')]),
  ability('EB04-026.when-attacking-draw', def('EB04-026'), 'characters', 'WHEN_ATTACKING', drawThenTrash(1, 1)),
  // EB04-028 Ice Time: [Main] You may trash 1 card from your hand: If your Leader has the {Navy} type, up to 2 of your opponent's
  // Characters with 10000 power or less cannot attack until the end of your opponent's next End Phase. [Trigger] Return up to 1
  // Character with a cost of 5 or less to the owner's hand.
  ability('EB04-028.main-prevent', def('EB04-028'), 'hand', 'MAIN', [...mayTrash(), { ...upTo(2, 'target', { side: 'OPPONENT', zone: 'characters', maxPower: 10000 }, { whenBindingNonempty: 'paid' }), whenCondition: navyLeader } as Step, preventAttack('target')]),
  ability('EB04-028.trigger-bounce', def('EB04-028'), 'temporary', 'TRIGGER', bounceCost5()),
  // OP12-043 Kuzan: (+1 cost with 5 or more cards in hand, below); [On Play] You may trash 1 card from your hand: Up to 1 of your
  // opponent's Characters cannot attack until the end of your opponent's next End Phase.
  ability('OP12-043.on-play-prevent', def('OP12-043'), 'characters', 'ON_PLAY', [...mayTrash(), ...after('paid', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), preventAttack('target')])]),
  // OP12-046 Zephyr (Navy): [On Play] Trash 2 cards from your hand (FAQ OP12-046: the only remaining card is trashed). [Activate:
  // Main] You may trash this Character: Return up to 1 Character with a cost of 5 or less to the owner's hand.
  ability('OP12-046.on-play-trash', def('OP12-046'), 'characters', 'ON_PLAY', mustTrash(2)),
  ability('OP12-046.activate-main-bounce', def('OP12-046'), 'characters', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters', isSource: true }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC' },
    { kind: 'OPERATION', operation: { primitive: 'trashCharacter', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'paid' }, whenBindingNonempty: 'paid' },
    ...after('paid', bounceCost5())]),
  // OP12-047 Sengoku: [On Play] You may trash 1 card from your hand: Look at 5 cards from the top of your deck; reveal up to 2 {Navy}
  // type cards other than [Sengoku] and add them to your hand. Then, place the rest at the bottom of your deck in any order.
  ability('OP12-047.on-play-search', def('OP12-047'), 'characters', 'ON_PLAY', [...mayTrash(),
    { kind: 'SEARCH_TOP_DECK', amount: 5, traitsAny: navy, excludeRulesName: 'Sengoku', maxSelected: 2, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER', whenBindingNonempty: 'paid' }]),
  // OP12-057 Ice Block Pheasant Peck: [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then,
  // trash 1 card from your hand (FAQ OP12-057: playable as the only card in hand). [Trigger] You may trash 1 card: Draw 1 card.
  ability('OP12-057.counter', def('OP12-057'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 4000, 'THIS_BATTLE'), ...mustTrash(1)]),
  ability('OP12-057.trigger-draw', def('OP12-057'), 'temporary', 'TRIGGER', [...mayTrash(), { ...draw(1), whenBindingNonempty: 'paid' } as Step]),
  // ST33-001 Koby: [Blocker]; [On Play] You may trash 1 card from your hand: Draw 1 card.
  ability('ST33-001.on-play-draw', def('ST33-001'), 'characters', 'ON_PLAY', [...mayTrash(), { ...draw(1), whenBindingNonempty: 'paid' } as Step]),
  // ST33-002 Sakazuki: [When Attacking] You may trash 1 card from your hand: If your opponent has 6 or more cards in their hand, your
  // opponent trashes 1 card from their hand (FAQ ST33-002). [On K.O.] Play up to 1 {Navy} type Character card with a cost of 4 or
  // less from your hand.
  ability('ST33-002.when-attacking-discard', def('ST33-002'), 'characters', 'WHEN_ATTACKING', [...mayTrash(),
    ...opponentTrashesFromHand().map(step => ({ ...step, whenBindingNonempty: 'paid', ...(step.kind === 'CHOICE' ? { whenCondition: { kind: 'HAND_AT_LEAST' as const, player: 'OPPONENT' as const, minimum: 6 } } : {}) }) as Step)]),
  ability('ST33-002.on-ko-play', def('ST33-002'), 'characters', 'ON_KO', playChosen('play', 'hand', { categories: ['CHARACTER'], traitsAny: navy, maxCost: 4 })),
  // ST33-003 Smoker: [On Play] You may trash 1 card from your hand: Place up to 2 of your opponent's Characters with a cost of 2 or
  // less at the bottom of the owner's deck.
  ability('ST33-003.on-play-bottom', def('ST33-003'), 'characters', 'ON_PLAY', [...mayTrash(), ...after('paid', [upTo(2, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 2 }), toDeckBottom('target')])]),
  // ST33-005 Monkey.D.Garp: [On Play] If your Leader has the {Navy} type, play up to 1 blue {Navy} type Character card with 8000 power
  // or less other than [Monkey.D.Garp] from your hand.
  ability('ST33-005.on-play-play', def('ST33-005'), 'characters', 'ON_PLAY', playChosen('play', 'hand', { categories: ['CHARACTER'], colorsAny: ['BLUE'], traitsAny: navy, maxPower: 8000, nameNot: 'Monkey.D.Garp' }),
    { condition: navyLeader }),
]
export const ST33_OFFICIAL_CONTINUOUS = [
  // OP12-043 Kuzan: If you have 5 or more cards in your hand, this Character gains +1 cost.
  { id: 'OP12-043.hand-cost', definitionId: def('OP12-043'), zone: 'characters' as const, characteristic: 'COST' as const, amount: 1, minimumAttachedDon: 0, minimumHandSize: 5 },
  // ST33-004 Borsalino: During the turn in which a card in your hand is trashed by an effect, give this card in your hand -3 cost
  // (FAQ ST33-004: also by an opponent's effect).
  { id: 'ST33-004.hand-cost', definitionId: def('ST33-004'), zone: 'hand' as const, characteristic: 'COST' as const, amount: -3, minimumAttachedDon: 0, whenOwnHandTrashedThisTurn: true as const },
]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST33_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'OP12-040', { abilityIds: ids('OP12-040') }),
  officialCard(L, 'EB04-026', { abilityIds: ids('EB04-026') }),
  officialCard(L, 'EB04-028', { abilityIds: ids('EB04-028') }),
  officialCard(L, 'OP12-043', { abilityIds: ids('OP12-043', ['OP12-043.hand-cost']) }),
  officialCard(L, 'OP12-046', { abilityIds: ids('OP12-046') }),
  officialCard(L, 'OP12-047', { abilityIds: ids('OP12-047') }),
  officialCard(L, 'OP12-057', { abilityIds: ids('OP12-057'), counterEvent: { abilityId: 'OP12-057.counter' } }),
  officialCard(L, 'ST33-001', { blocker: true, abilityIds: ids('ST33-001') }),
  officialCard(L, 'ST33-002', { abilityIds: ids('ST33-002') }),
  officialCard(L, 'ST33-003', { abilityIds: ids('ST33-003') }),
  officialCard(L, 'ST33-004', { blocker: true, abilityIds: ['ST33-004.hand-cost'] }),
  officialCard(L, 'ST33-005', { abilityIds: ids('ST33-005') }),
]
export const ST33_OFFICIAL_ABILITY_DEFINITIONS = abilities
