import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { addDon, after, ability, bindAll, donMinus, draw, ko, opponentPower, ownLeaderOrCharacter, power, rest, returnToHand, trashFromHand, upTo } from './dsl'

// M6 ST-26 (PURPLE/BLACK Monkey.D.Luffy) and its OP05/OP09 reprints. Texts are the official English card list (series 569026)
// archived with the ST-26 snapshot; the ST-23-28 FAQ (ST26-001, ST26-005), the OP-09 FAQ (OP09-061) and the errata snapshot are
// in docs/game/evidence/m6/sources/. No runtime branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-26'
const once = { kind: 'ONCE_PER_TURN' as const }
/** "You may return 1 or more DON!! cards from your field to your DON!! deck:" — `bind` holds the returned DON!! cards. */
const returnSomeDon = (bind = 'paid'): Step[] => [
  { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'fieldDon' }, optional: true, min: 0, max: 10, bind, visibility: 'PUBLIC' },
  { kind: 'OPERATION', operation: { primitive: 'returnDon', version: '1.0.0', audience: 'PUBLIC', subjectBinding: bind }, whenBindingNonempty: bind }]
const strawHatLeader = { kind: 'LEADER_HAS_TRAIT' as const, trait: 'Straw Hat Crew' }
/** ST26-005: "If your Leader is multicolored and your opponent has 5 or more DON!! cards on their field, your {Straw Hat Crew} type
 * Leader's base power becomes 7000 until the end of your opponent's next End Phase." */
const luffy = (): Step[] => [...donMinus(2),
  { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'leader', traitsAny: ['Straw Hat Crew'] }, optional: false, min: 1, max: 1, bind: 'leader', visibility: 'PUBLIC', skipIfNone: true,
    whenBindingNonempty: 'donMinus', whenCondition: { kind: 'ALL_OF', conditions: [{ kind: 'LEADER_MULTICOLORED' }, { kind: 'FIELD_DON_AT_LEAST', minimum: 5, player: 'OPPONENT' }] } },
  { kind: 'OPERATION', operation: { primitive: 'setBasePower', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'leader', value: 7000, duration: 'UNTIL_END_OF_OPPONENT_NEXT_END_PHASE' }, whenBindingNonempty: 'leader' }]

const abilities: EffectDefinition[] = [
  // OP09-061 Leader Monkey.D.Luffy: [DON!! x1] All of your Characters gain +1 cost (aura below). [Your Turn] [Once Per Turn] When 2
  // or more DON!! cards on your field are returned to your DON!! deck, add up to 1 DON!! card from your DON!! deck and set it as
  // active, and add up to 1 additional DON!! card and rest it (FAQ OP09-061: only 2 or more returned at the same time).
  ability('OP09-061.don-returned-add', def('OP09-061'), 'leader', 'ON_DON_RETURNED', [addDon(false), addDon(true)],
    { condition: { kind: 'ALL_OF', conditions: [{ kind: 'YOUR_TURN' }, { kind: 'DON_RETURNED_TOGETHER_AT_LEAST', minimum: 2 }] }, usage: once }),
  // OP09-070 Nami: [On Play] You may return 1 or more DON!! cards from your field to your DON!! deck: Give up to 2 rested DON!!
  // cards to your Leader or 1 of your Characters.
  ability('OP09-070.on-play-don', def('OP09-070'), 'characters', 'ON_PLAY', [...returnSomeDon(), ...after('paid', [ownLeaderOrCharacter(1, 'donTarget'),
    upTo(2, 'restedDon', { side: 'OWN', zone: 'cost', rested: true }),
    { kind: 'OPERATION', operation: { primitive: 'attachRestedDon', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'restedDon', targetBinding: 'donTarget' } }])]),
  // OP09-076 Roronoa Zoro: [On Play] You may return 1 or more DON!! cards from your field to your DON!! deck: Add up to 1 DON!!
  // card from your DON!! deck and set it as active.
  ability('OP09-076.on-play-don', def('OP09-076'), 'characters', 'ON_PLAY', [...returnSomeDon(), addDon(false, { whenBindingNonempty: 'paid' })]),
  // OP09-077 Gum-Gum Lightning: [Main] DON!! −2: K.O. up to 1 opposing Character with 6000 power or less. [Trigger] Add up to 1
  // DON!! card from your DON!! deck and set it as active.
  ability('OP09-077.main-ko', def('OP09-077'), 'hand', 'MAIN', [...donMinus(2), ...after('donMinus', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxPower: 6000 }), ko('target')])]),
  ability('OP09-077.trigger-don', def('OP09-077'), 'temporary', 'TRIGGER', [addDon(false)]),
  // OP09-078 Gum-Gum Giant: [Counter] DON!! −2, You may trash 1 card from your hand: If your Leader has the {Straw Hat Crew} type,
  // up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, draw 2 cards (FAQ EB03-017/OP14-112:
  // without the Leader condition the "Then," part is not applied either).
  ability('OP09-078.counter', def('OP09-078'), 'hand', 'COUNTER', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE', whenCondition: { kind: 'FIELD_DON_AT_LEAST', minimum: 2 } },
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'fieldDon' }, optional: false, min: 2, max: 2, bind: 'donMinus', visibility: 'PUBLIC', whenBindingNonempty: 'paid' },
    { kind: 'OPERATION', operation: { primitive: 'returnDon', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'donMinus' }, whenBindingNonempty: 'donMinus' },
    trashFromHand('paid', 'paid'),
    { ...ownLeaderOrCharacter(1, 'boosted'), whenBindingNonempty: 'paid', whenCondition: strawHatLeader } as Step, power('boosted', 4000, 'THIS_BATTLE'),
    { ...draw(2), whenBindingNonempty: 'paid', whenCondition: strawHatLeader } as Step]),
  // ST26-001 Soba Mask: (hand cost below); [On Play] Return all of your [San-Gorou] and [Sanji] Characters to the owner's hand.
  ability('ST26-001.on-play-return', def('ST26-001'), 'characters', 'ON_PLAY', [bindAll('sangorou', { side: 'OWN', zone: 'characters', nameIs: 'San-Gorou' }), returnToHand('sangorou'),
    bindAll('sanji', { side: 'OWN', zone: 'characters', nameIs: 'Sanji' }), returnToHand('sanji')]),
  // ST26-002 Tony Tony.Chopper: [Blocker]; [On Play] DON!! −2: Rest up to 1 of your opponent's DON!! cards or Characters with a
  // cost of 1 or less (one card in all: a Character is offered only when no DON!! card was chosen).
  ability('ST26-002.on-play-rest', def('ST26-002'), 'characters', 'ON_PLAY', [...donMinus(2), ...after('donMinus', [upTo(1, 'don', { side: 'OPPONENT', zone: 'cost' }), rest('don'),
    { ...upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 1 }), whenBindingEmpty: 'don' } as Step, rest('target')])]),
  // ST26-003 Nico Robin: [On Play] DON!! −2: Add up to 1 DON!! card from your DON!! deck and set it as active.
  ability('ST26-003.on-play-don', def('ST26-003'), 'characters', 'ON_PLAY', [...donMinus(2), addDon(false, { whenBindingNonempty: 'donMinus' })]),
  // ST26-004 General Franky: [On Play] DON!! −2: Give up to 2 of your opponent's Characters −2000 power during this turn.
  ability('ST26-004.on-play-power', def('ST26-004'), 'characters', 'ON_PLAY', [...donMinus(2), ...after('donMinus', [upTo(2, 'target', { side: 'OPPONENT', zone: 'characters' }), opponentPower(-2000)])]),
  // ST26-005 Monkey.D.Luffy: [On Play]/[When Attacking] DON!! −2: (above).
  ability('ST26-005.on-play-base-power', def('ST26-005'), 'characters', 'ON_PLAY', luffy()),
  ability('ST26-005.when-attacking-base-power', def('ST26-005'), 'characters', 'WHEN_ATTACKING', luffy()),
]
export const ST26_OFFICIAL_CONTINUOUS = [
  { id: 'OP09-061.don-cost-aura', definitionId: def('OP09-061'), zone: 'leader' as const, characteristic: 'COST' as const, amount: 1, minimumAttachedDon: 1, targets: { charactersOnly: true as const } },
  // ST26-001: If you have a [San-Gorou] or [Sanji] Character with 7000 base power or more, give this card in your hand −5 cost
  // (FAQ ST26-001: base power; one such Character is enough, the reduction does not stack).
  { id: 'ST26-001.hand-cost', definitionId: def('ST26-001'), zone: 'hand' as const, characteristic: 'COST' as const, amount: -5, minimumAttachedDon: 0, whenCharacter: { side: 'OWN' as const, namesAny: ['San-Gorou', 'Sanji'], minPower: 7000, powerBasis: 'BASE' as const } },
]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST26_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'OP09-061', { abilityIds: ids('OP09-061', ['OP09-061.don-cost-aura']) }),
  officialCard(L, 'OP09-070', { abilityIds: ids('OP09-070') }),
  officialCard(L, 'OP09-076', { abilityIds: ids('OP09-076') }),
  officialCard(L, 'OP09-077', { abilityIds: ids('OP09-077') }),
  officialCard(L, 'OP09-078', { abilityIds: ids('OP09-078'), counterEvent: { abilityId: 'OP09-078.counter' } }),
  officialCard(L, 'ST26-001', { abilityIds: ids('ST26-001', ['ST26-001.hand-cost']) }),
  officialCard(L, 'ST26-002', { blocker: true, abilityIds: ids('ST26-002') }),
  officialCard(L, 'ST26-003', { abilityIds: ids('ST26-003') }),
  officialCard(L, 'ST26-004', { abilityIds: ids('ST26-004') }),
  officialCard(L, 'ST26-005', { abilityIds: ids('ST26-005') }),
]
export const ST26_OFFICIAL_ABILITY_DEFINITIONS = abilities
