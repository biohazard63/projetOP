import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { addDon, after, ability, check, deckTopToLife, donMinus, draw, ko, ownLeaderOrCharacter, playChosen, power, trashFromHand, upTo } from './dsl'
import { officialCard, officialDefinitionId as def } from './officialCards'

// M6 ST-34 (PURPLE Charlotte Katakuri) and its OP11/EB03/P-090 reprints. Texts are the official English card list (series 569034)
// archived with the ST-34 snapshot; the ST-34 FAQ (ST34-001, 002, 004), the OP-11 FAQ (OP11-066) and the errata snapshot are in
// docs/game/evidence/m6/sources/. No runtime branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-34'
const once = { kind: 'ONCE_PER_TURN' as const }
const bigMom = ['Big Mom Pirates']
const bigMomLeader = { kind: 'LEADER_HAS_TRAIT' as const, trait: 'Big Mom Pirates' }
/** "Choose a cost and reveal 1 card from the top of your opponent's deck. If the revealed card has the chosen cost, ..." — `hit`
 * is non-empty on a match; the steps after it (the "Then," part included) need the match (FAQ OP11-066). */
const chooseCostReveal = (whenBindingNonempty?: string): Step[] => [
  { kind: 'MODE', modes: 11, bind: 'cost', chooseValue: 'COST', ...(whenBindingNonempty ? { whenBindingNonempty } : {}) },
  { kind: 'OPERATION', operation: { primitive: 'revealDeckTopCostMatch', version: '1.0.0', audience: 'PUBLIC', player: 'OPPONENT', modeBinding: 'cost', resultBinding: 'hit' }, ...(whenBindingNonempty ? { whenBindingNonempty } : {}) }]
const thisBattle = (amount: number): Step => ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', amount, duration: 'THIS_BATTLE' } })
/** OP11-062: "DON!! −1: Look at 1 card from the top of your opponent's deck. Then, this Leader gains +1000 power during this battle." */
const leaderLook = (): Step[] => [...donMinus(1),
  { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OPPONENT', zone: 'deck', topN: 1 }, optional: false, min: 1, max: 1, bind: 'look', visibility: 'PRIVATE', reveal: 'CHOOSER', skipIfNone: true, whenBindingNonempty: 'donMinus' },
  { ...thisBattle(1000), whenBindingNonempty: 'donMinus' } as Step]

const abilities: EffectDefinition[] = [
  // OP11-062 Leader Charlotte Katakuri: [When Attacking]/[On Your Opponent's Attack] [Once Per Turn] DON!! −1: Look at 1 card from
  // the top of your opponent's deck. Then, this Leader gains +1000 power during this battle.
  ability('OP11-062.when-attacking-look', def('OP11-062'), 'leader', 'WHEN_ATTACKING', leaderLook(), { usage: once }),
  ability('OP11-062.opponent-attack-look', def('OP11-062'), 'leader', 'ON_OPPONENT_ATTACK', leaderLook(), { usage: once }),
  // EB03-032 Charlotte Flampe: [Your Turn] [On Play] Up to 1 of your [Charlotte Katakuri] cards gains +2000 power during this turn.
  ability('EB03-032.on-play-power', def('EB03-032'), 'characters', 'ON_PLAY', [upTo(1, 'katakuri', { side: 'OWN', zone: 'leaderOrCharacters', nameIs: 'Charlotte Katakuri' }), power('katakuri', 2000, 'THIS_TURN')],
    { condition: { kind: 'YOUR_TURN' } }),
  // EB03-035 Charlotte Pudding: [Blocker]; [On Play] If the number of DON!! cards on your field is equal to or less than the number
  // on your opponent's field, add up to 1 DON!! card from your DON!! deck and rest it.
  ability('EB03-035.on-play-don', def('EB03-035'), 'characters', 'ON_PLAY', [addDon(true)], { condition: { kind: 'FIELD_DON_AT_MOST_OPPONENT' } }),
  // OP11-066 Charlotte Oven: [Activate: Main] You may rest this Character: Choose a cost and reveal ... If the revealed card has the
  // chosen cost, K.O. up to 1 of your opponent's Characters with a base cost of 3 or less. Then, add up to 1 DON!! card from your
  // DON!! deck and rest it (FAQ OP11-066: neither without a match).
  ability('OP11-066.activate-main-reveal', def('OP11-066'), 'characters', 'ACTIVATE_MAIN', [...chooseCostReveal(),
    ...after('hit', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 3, costBasis: 'BASE' }), ko('target'), addDon(true)])], { cost: { kind: 'REST_SOURCE' } }),
  // OP11-071 Charlotte Perospero: [Activate: Main] [Once Per Turn] You may trash 1 card from your hand: Choose a cost and reveal ... If
  // the revealed card has the chosen cost, draw 1 card and add up to 1 DON!! card from your DON!! deck and set it as active.
  ability('OP11-071.activate-main-reveal', def('OP11-071'), 'characters', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE' }, trashFromHand('paid', 'paid'),
    ...chooseCostReveal('paid'), ...after('hit', [draw(1), addDon(false)])], { usage: once }),
  // OP11-079 When Two Men Are Fighting...: [Counter] Choose a cost and reveal ... If the revealed card has the chosen cost, up to 1 of
  // your Leader or Character cards gains +5000 power during this battle. [Trigger] Draw 1 card.
  ability('OP11-079.counter', def('OP11-079'), 'hand', 'COUNTER', [...chooseCostReveal(), ...after('hit', [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 5000, 'THIS_BATTLE')])]),
  ability('OP11-079.trigger-draw', def('OP11-079'), 'temporary', 'TRIGGER', [draw(1)]),
  // OP11-081 Cognac Mama-Mash: [Main] Choose a cost and reveal ... If the revealed card has the chosen cost, K.O. up to 1 of your
  // opponent's Characters with a base cost of 8 or less. [Trigger] Add up to 1 DON!! card from your DON!! deck and set it as active.
  ability('OP11-081.main-reveal', def('OP11-081'), 'hand', 'MAIN', [...chooseCostReveal(), ...after('hit', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 8, costBasis: 'BASE' }), ko('target')])]),
  ability('OP11-081.trigger-don', def('OP11-081'), 'temporary', 'TRIGGER', [addDon(false)]),
  // P-090 Charlotte Smoothie: [Opponent's Turn] [On K.O.] DON!! −1: Play up to 1 {Big Mom Pirates} type Character card with a cost
  // equal to or less than the number of DON!! cards on your opponent's field other than [Charlotte Smoothie] from your hand.
  ability('P-090.on-ko-play', def('P-090'), 'characters', 'ON_KO', [...donMinus(1), ...playChosen('play', 'hand', { categories: ['CHARACTER'], traitsAny: bigMom, maxCostFromFieldDon: 'OPPONENT', nameNot: 'Charlotte Smoothie' }, { whenBindingNonempty: 'donMinus' })],
    { condition: { kind: 'OPPONENT_TURN' } }),
  // ST34-001 Charlotte Katakuri: [Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, if your
  // Leader has the {Big Mom Pirates} type, add up to 2 DON!! cards from your DON!! deck and rest them (FAQ ST34-001). [On K.O.] Play
  // up to 1 Character card with 8000 power or less from your hand.
  ability('ST34-001.don-returned-add', def('ST34-001'), 'characters', 'ON_DON_RETURNED', [addDon(true), addDon(true)],
    { condition: { kind: 'ALL_OF', conditions: [{ kind: 'YOUR_TURN' }, bigMomLeader] }, usage: once }),
  ability('ST34-001.on-ko-play', def('ST34-001'), 'characters', 'ON_KO', playChosen('play', 'hand', { categories: ['CHARACTER'], maxPower: 8000 })),
  // ST34-002 Charlotte Cracker: [On Play] If your Leader has the {Big Mom Pirates} type, add up to 1 DON!! card from your DON!! deck
  // and rest it. Then, K.O. up to 1 of your opponent's Characters with a cost of 2 or less (FAQ ST34-002; FAQ EB03-017/OP14-112:
  // the "Then," part follows the Leader condition).
  ability('ST34-002.on-play-don-ko', def('ST34-002'), 'characters', 'ON_PLAY', [check('bm', bigMomLeader), ...after('bm', [addDon(true), upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 2 }), ko('target')])]),
  // ST34-003 Charlotte Brulee: [On Play] Look at 3 cards from the top of your deck; reveal up to 1 {Big Mom Pirates} type card and add
  // it to your hand. Then, place the rest at the bottom of your deck in any order.
  ability('ST34-003.on-play-search', def('ST34-003'), 'characters', 'ON_PLAY', [{ kind: 'SEARCH_TOP_DECK', amount: 3, traitsAny: bigMom, maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }]),
  // ST34-004 Charlotte Linlin: [On Play] DON!! −4, you may trash 1 card from your hand: Add up to 1 card from the top of your deck to
  // the top of your Life cards. Then, up to 1 of your opponent's Characters' base power becomes 0 during this turn (FAQ ST34-004: the
  // highest set base power applies; without a card to trash, nothing).
  ability('ST34-004.on-play-life-power', def('ST34-004'), 'characters', 'ON_PLAY', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE', skipIfNone: true, whenCondition: { kind: 'FIELD_DON_AT_LEAST', minimum: 4 } },
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'fieldDon' }, optional: false, min: 4, max: 4, bind: 'donMinus', visibility: 'PUBLIC', whenBindingNonempty: 'paid' },
    { kind: 'OPERATION', operation: { primitive: 'returnDon', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'donMinus' }, whenBindingNonempty: 'donMinus' },
    trashFromHand('paid', 'paid'), ...deckTopToLife('deckTop', 'paid'),
    upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }, { whenBindingNonempty: 'paid' }),
    { kind: 'OPERATION', operation: { primitive: 'setBasePower', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'target', value: 0, duration: 'THIS_TURN', player: 'OPPONENT' }, whenBindingNonempty: 'target' }]),
  // ST34-005 Baron Tamago & Pekoms: [When Attacking] DON!! −1: K.O. up to 1 of your opponent's Characters with 2000 base power or less.
  ability('ST34-005.when-attacking-ko', def('ST34-005'), 'characters', 'WHEN_ATTACKING', [...donMinus(1), ...after('donMinus', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxPower: 2000, powerBasis: 'BASE' }), ko('target')])]),
]
export const ST34_OFFICIAL_CONDITIONAL_KEYWORDS = [
  // OP11-065 Charlotte Anana: If you have a purple {Big Mom Pirates} type Character other than [Charlotte Anana], [Blocker].
  { id: 'OP11-065.conditional-blocker', definitionId: def('OP11-065'), zone: 'characters' as const, keyword: 'BLOCKER' as const, minimumAttachedDon: 0, whenOtherOwnCharacter: { colorsAny: ['PURPLE' as const], traitsAny: bigMom, nameNot: 'Charlotte Anana' } },
]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST34_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'OP11-062', { abilityIds: ids('OP11-062') }),
  officialCard(L, 'EB03-032', { abilityIds: ids('EB03-032') }),
  officialCard(L, 'EB03-035', { blocker: true, abilityIds: ids('EB03-035') }),
  officialCard(L, 'OP11-065', { abilityIds: ['OP11-065.conditional-blocker'] }),
  officialCard(L, 'OP11-066', { abilityIds: ids('OP11-066') }),
  officialCard(L, 'OP11-071', { abilityIds: ids('OP11-071') }),
  officialCard(L, 'OP11-079', { abilityIds: ids('OP11-079'), counterEvent: { abilityId: 'OP11-079.counter' } }),
  officialCard(L, 'OP11-081', { abilityIds: ids('OP11-081') }),
  officialCard(L, 'P-090', { abilityIds: ids('P-090') }),
  officialCard(L, 'ST34-001', { abilityIds: ids('ST34-001') }),
  officialCard(L, 'ST34-002', { abilityIds: ids('ST34-002') }),
  officialCard(L, 'ST34-003', { abilityIds: ids('ST34-003') }),
  officialCard(L, 'ST34-004', { abilityIds: ids('ST34-004') }),
  officialCard(L, 'ST34-005', { abilityIds: ids('ST34-005') }),
]
export const ST34_OFFICIAL_ABILITY_DEFINITIONS = abilities
