import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { addToLife, after, ability, bindAll, check, draw, grantRush, ko, lifeToHand, ownLeaderOrCharacter, power, powerUntilNextTurn, trashFromHand, upTo } from './dsl'

// M6 ST-13 (YELLOW The Three Brothers: Leaders Sabo, Portgas.D.Ace and Monkey.D.Luffy). Texts are the official English card list
// (series 569013) archived with the ST-13 snapshot; the ST-13 FAQ (face-up Life cards keep their side when rearranged, the Luffy
// Leader Life rule, ST13-009 any position) and the errata snapshot are in docs/game/evidence/m6/sources/. ST13-016 (Yamato) is
// certified with ST-28. No runtime branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-13'
const once = { kind: 'ONCE_PER_TURN' as const }
const brothers = ['Sabo', 'Portgas.D.Ace', 'Monkey.D.Luffy']
const opponentPowerUntil = (bind: string, amount: number): Step => ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: bind, amount, duration: 'UNTIL_END_OF_OPPONENT_NEXT_TURN' }, whenBindingNonempty: bind })
/** "Look at all your Life cards and place them back in your Life area in any order" (FAQ ST13-012/017: face-up cards stay face-up). */
const arrangeAllLife = (): Step[] => [
  { kind: 'CHOICE', choiceType: 'ORDER', selector: { kind: 'CARDS', side: 'OWN', zone: 'life', lifeEnd: 'ALL' }, optional: false, min: 0, max: 5, bind: 'lifeOrder', visibility: 'PRIVATE', reveal: 'CHOOSER', skipIfNone: true },
  { kind: 'OPERATION', operation: { primitive: 'arrangeLife', version: '1.0.0', audience: 'CONTROLLER', orderBinding: 'lifeOrder' } }]
/** "You may trash 1 card from the top or bottom of your Life cards:" — `paid` holds the trashed card. */
const trashOwnLife = (): Step[] => [
  { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'life', lifeEnd: 'TOP_OR_BOTTOM' }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC' },
  { kind: 'OPERATION', operation: { primitive: 'trashLife', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'paid' } }]
/** "[Trigger] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1 card from your hand to the top
 * of your Life cards." */
const lifeSwapTrigger = (): Step[] => [...lifeToHand('paid'), upTo(1, 'toLife', { side: 'OWN', zone: 'hand' }, { whenBindingNonempty: 'paid' }), addToLife('toLife', 'hand', false, 'toLife')]
/** "Look at 5 cards from the top of your deck; reveal up to 1 [Sabo], [Portgas.D.Ace], or [Monkey.D.Luffy] with a cost of 5 or less
 * and add it to your hand. Then, place the rest at the bottom of your deck in any order." */
const brothersSearch = (): Step[] => [{ kind: 'SEARCH_TOP_DECK', amount: 5, namesAny: brothers, maxCost: 5, maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }]
/** ST13-007/010/014: "[Activate: Main] You may trash this Character: Reveal 1 card from the top of your Life cards. If that card is a
 * [Name] with a cost of 5, you may play that card. If you do, up to 1 of your Leader gains +2000 power until the end of your
 * opponent's next turn." */
const revealLifeAndPlay = (name: string): Step[] => [
  { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters', isSource: true }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC' },
  { kind: 'OPERATION', operation: { primitive: 'trashCharacter', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'paid' }, whenBindingNonempty: 'paid' },
  bindAll('top', { side: 'OWN', zone: 'life', lifeEnd: 'TOP' }),
  { kind: 'REVEAL_BINDING', bind: 'top' },
  { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'life', lifeEnd: 'TOP', categories: ['CHARACTER'], nameIs: name, minCost: 5, maxCost: 5 }, optional: true, min: 0, max: 1, bind: 'play', visibility: 'PRIVATE', reveal: 'CHOOSER', skipIfNone: true, whenBindingNonempty: 'paid' },
  { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters' }, optional: false, min: 1, max: 1, bind: 'play.replace', visibility: 'PUBLIC', whenBindingNonempty: 'play', whenCondition: { kind: 'OWN_CHARACTERS_AT_LEAST', minimum: 5 } },
  { kind: 'OPERATION', operation: { primitive: 'playCard', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'play', from: 'life', replaceBinding: 'play.replace' } },
  upTo(1, 'leader', { side: 'OWN', zone: 'leader' }, { whenBindingNonempty: 'play' }), opponentPowerUntil('leader', 2000)]

const abilities: EffectDefinition[] = [
  // ST13-001 Leader Sabo: [DON!! x1] [Activate: Main] [Once Per Turn] You may add 1 of your Characters with a cost of 3 or more and
  // 7000 power or more to the top of your Life cards face-up: Up to 1 of your Characters gains +2000 power until the start of your
  // next turn (FAQ ST13-001: current power, DON!! included).
  ability('ST13-001.activate-main-life', def('ST13-001'), 'leader', 'ACTIVATE_MAIN', [
    upTo(1, 'paid', { side: 'OWN', zone: 'characters', minCost: 3, minPower: 7000 }), addToLife('paid', 'characters', true, 'paid'),
    ...after('paid', [upTo(1, 'boosted', { side: 'OWN', zone: 'characters' }), powerUntilNextTurn(2000, 'boosted')])],
    { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 1 }, usage: once }),
  // ST13-002 Leader Portgas.D.Ace: [DON!! x2] [Activate: Main] [Once Per Turn] Look at 5 cards from the top of your deck and add up to
  // 1 Character card with a cost of 5 to the top of your Life cards face-up. Then, place the rest at the bottom of your deck in any
  // order. [End of Your Turn] Trash all your face-up Life cards (FAQ ST13-002: any face-up Life card).
  ability('ST13-002.activate-main-life', def('ST13-002'), 'leader', 'ACTIVATE_MAIN', [{ kind: 'SEARCH_TOP_DECK', amount: 5, category: 'CHARACTER', minCost: 5, maxCost: 5, maxSelected: 1, bind: 'found', revealSelected: true, destination: 'LIFE_TOP_FACE_UP', remainder: 'BOTTOM_ANY_ORDER' }],
    { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 2 }, usage: once }),
  ability('ST13-002.end-of-turn-trash', def('ST13-002'), 'leader', 'END_OF_YOUR_TURN', [bindAll('faceUp', { side: 'OWN', zone: 'life', lifeEnd: 'ALL', faceUp: true }),
    { kind: 'OPERATION', operation: { primitive: 'trashLife', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'faceUp' } }]),
  // ST13-003 Leader Monkey.D.Luffy: (Life rule below); [DON!! x2] [Activate: Main] [Once Per Turn] You may trash 1 card from your hand:
  // If you have 0 Life cards, add up to 2 Character cards with a cost of 5 from your hand or trash to the top of your Life cards
  // face-up (FAQ ST13-003: 1 from the hand and 1 from the trash together).
  ability('ST13-003.activate-main-life', def('ST13-003'), 'leader', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE' }, trashFromHand('paid', 'paid'),
    { ...upTo(2, 'toLife', { side: 'OWN', zone: 'handOrTrash', categories: ['CHARACTER'], minCost: 5, maxCost: 5 }, { whenBindingNonempty: 'paid' }), whenCondition: { kind: 'LIFE_AT_MOST', player: 'CONTROLLER', maximum: 0 } } as Step,
    addToLife('toLife', 'handOrTrash', true, 'toLife')],
    { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 2 }, usage: once }),
  // ST13-004 Edward.Newgate: [On Play] Add 1 card from the top of your deck to the top of your Life cards. Then, look at all your Life
  // cards; place 1 card at the top of your deck and place the rest back in your Life area in any order (FAQ ST13-004: sides kept; the
  // card on the deck is face-down).
  ability('ST13-004.on-play-life', def('ST13-004'), 'characters', 'ON_PLAY', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'deck', topN: 1 }, optional: false, min: 1, max: 1, bind: 'deckTop', visibility: 'PRIVATE', conceal: true, skipIfNone: true },
    addToLife('deckTop', 'deck'),
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'life', lifeEnd: 'ALL' }, optional: false, min: 1, max: 1, bind: 'toDeck', visibility: 'PRIVATE', reveal: 'CHOOSER', skipIfNone: true },
    { kind: 'OPERATION', operation: { primitive: 'lifeToDeckTop', version: '1.0.0', audience: 'CONTROLLER', subjectBinding: 'toDeck' } }, ...arrangeAllLife()]),
  // ST13-005 Emporio.Ivankov: [Blocker]; [On Play] You may trash 1 card from the top or bottom of your Life cards: Reveal up to 1
  // Character card with a cost of 5 from your hand and add it to the top of your Life cards face-down.
  ability('ST13-005.on-play-life', def('ST13-005'), 'characters', 'ON_PLAY', [...trashOwnLife(),
    upTo(1, 'fromHand', { side: 'OWN', zone: 'hand', categories: ['CHARACTER'], minCost: 5, maxCost: 5 }, { whenBindingNonempty: 'paid' }),
    { kind: 'REVEAL_BINDING', bind: 'fromHand' }, addToLife('fromHand', 'hand', false, 'fromHand')]),
  // ST13-006 Curly.Dadan: [Blocker]; [On Play] Play up to 1 each of [Sabo], [Portgas.D.Ace], and [Monkey.D.Luffy] with a cost of 2
  // from your hand.
  ability('ST13-006.on-play-play', def('ST13-006'), 'characters', 'ON_PLAY', brothers.flatMap((name, i) => {
    const bind = `brother${i}`
    return [upTo(1, bind, { side: 'OWN', zone: 'hand', categories: ['CHARACTER'], nameIs: name, minCost: 2, maxCost: 2 }),
      { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters' }, optional: false, min: 1, max: 1, bind: `${bind}.replace`, visibility: 'PUBLIC', whenBindingNonempty: bind, whenCondition: { kind: 'OWN_CHARACTERS_AT_LEAST', minimum: 5 } } as Step,
      { kind: 'OPERATION', operation: { primitive: 'playCard', version: '1.0.0', audience: 'PUBLIC', subjectBinding: bind, from: 'hand', replaceBinding: `${bind}.replace` } } as Step]
  })),
  ability('ST13-007.activate-main-reveal', def('ST13-007'), 'characters', 'ACTIVATE_MAIN', revealLifeAndPlay('Sabo')),
  // ST13-008 Sabo: [On Play] You may trash 1 card from the top or bottom of your Life cards: K.O. up to 1 of your opponent's Characters
  // with a cost of 5 or less.
  ability('ST13-008.on-play-ko', def('ST13-008'), 'characters', 'ON_PLAY', [...trashOwnLife(), ...after('paid', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 5 }), ko('target')])]),
  // ST13-009 Shanks: [On Play] You may turn 1 of your face-up Life cards face-down: If your opponent has 7 or more cards in their hand,
  // trash up to 1 card from the top of your opponent's Life cards (FAQ ST13-009: any position).
  ability('ST13-009.on-play-trash-life', def('ST13-009'), 'characters', 'ON_PLAY', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'life', lifeEnd: 'ALL', faceUp: true }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE', reveal: 'CHOOSER', skipIfNone: true },
    { kind: 'OPERATION', operation: { primitive: 'turnLifeFaceDown', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'paid' } },
    { ...upTo(1, 'oppLife', { side: 'OPPONENT', zone: 'life', lifeEnd: 'TOP' }, { whenBindingNonempty: 'paid' }), whenCondition: { kind: 'HAND_AT_LEAST', player: 'OPPONENT', minimum: 7 } } as Step,
    { kind: 'OPERATION', operation: { primitive: 'trashLife', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'oppLife' } }]),
  ability('ST13-010.activate-main-reveal', def('ST13-010'), 'characters', 'ACTIVATE_MAIN', revealLifeAndPlay('Portgas.D.Ace')),
  // ST13-011 Portgas.D.Ace: [On Play] If you have 2 or less Life cards, this Character gains [Rush] (FAQ ST13-011: kept afterwards).
  ability('ST13-011.on-play-rush', def('ST13-011'), 'characters', 'ON_PLAY', [grantRush()], { condition: { kind: 'LIFE_AT_MOST', player: 'CONTROLLER', maximum: 2 } }),
  // ST13-012 Makino: [On Play] You may add 1 card from the top or bottom of your Life cards to your hand: Look at all of your Life
  // cards and place them back in your Life area in any order (FAQ ST13-012; FAQ ST13-003: not paid when the card goes to the deck).
  ability('ST13-012.on-play-arrange', def('ST13-012'), 'characters', 'ON_PLAY', [...lifeToHand('paid'), ...after('paid', arrangeAllLife())]),
  ability('ST13-013.on-play-search', def('ST13-013'), 'characters', 'ON_PLAY', brothersSearch()),
  ability('ST13-014.activate-main-reveal', def('ST13-014'), 'characters', 'ACTIVATE_MAIN', revealLifeAndPlay('Monkey.D.Luffy')),
  // ST13-015 Monkey.D.Luffy: [Activate: Main] [Once Per Turn] This Character gains +2000 power until the start of your next turn.
  // Then, if you have 1 or more Life cards, draw 1 card and trash 1 card from the top of your Life cards.
  ability('ST13-015.activate-main-power', def('ST13-015'), 'characters', 'ACTIVATE_MAIN', [powerUntilNextTurn(2000), check('life', { kind: 'LIFE_AT_LEAST', player: 'CONTROLLER', minimum: 1 }),
    ...after('life', [draw(1)]), bindAll('topLife', { side: 'OWN', zone: 'life', lifeEnd: 'TOP' }),
    { kind: 'OPERATION', operation: { primitive: 'trashLife', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'topLife' }, whenBindingNonempty: 'life' }], { usage: once }),
  // ST13-017 Flame Dragon King: [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, look at
  // all your Life cards and place them back in any order (FAQ ST13-017). [Trigger] (Life swap above).
  ability('ST13-017.counter', def('ST13-017'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 4000, 'THIS_BATTLE'), ...arrangeAllLife()]),
  ability('ST13-017.trigger-life', def('ST13-017'), 'temporary', 'TRIGGER', lifeSwapTrigger()),
  // ST13-018 Gum-Gum Jet Spear: [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if you
  // have 0 Life cards, draw 1 card. [Trigger] (Life swap above).
  ability('ST13-018.counter', def('ST13-018'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 2000, 'THIS_BATTLE'), { ...draw(1), whenCondition: { kind: 'LIFE_AT_MOST', player: 'CONTROLLER', maximum: 0 } } as Step]),
  ability('ST13-018.trigger-life', def('ST13-018'), 'temporary', 'TRIGGER', lifeSwapTrigger()),
  // ST13-019 The Three Brothers' Bond: [Main] (search above). [Trigger] Activate this card's [Main] effect.
  ability('ST13-019.main-search', def('ST13-019'), 'hand', 'MAIN', brothersSearch()),
  ability('ST13-019.trigger-main', def('ST13-019'), 'temporary', 'TRIGGER', brothersSearch()),
]
// ST13-003 Leader Monkey.D.Luffy: Your face-up Life cards are placed at the bottom of your deck instead of being added to your hand,
// according to the rules (FAQ ST13-003: no [Trigger]; an effect adding it to hand does not add it).
export const ST13_OFFICIAL_LIFE_RULES = [{ id: 'ST13-003.face-up-life-to-deck', definitionId: def('ST13-003'), zone: 'leader' as const, rule: 'FACE_UP_LIFE_TO_DECK_BOTTOM' as const }]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST13_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'ST13-001', { abilityIds: ids('ST13-001') }),
  officialCard(L, 'ST13-002', { abilityIds: ids('ST13-002') }),
  officialCard(L, 'ST13-003', { abilityIds: ids('ST13-003', ['ST13-003.face-up-life-to-deck']) }),
  officialCard(L, 'ST13-004', { abilityIds: ids('ST13-004') }),
  officialCard(L, 'ST13-005', { blocker: true, abilityIds: ids('ST13-005') }),
  officialCard(L, 'ST13-006', { blocker: true, abilityIds: ids('ST13-006') }),
  officialCard(L, 'ST13-007', { abilityIds: ids('ST13-007') }),
  officialCard(L, 'ST13-008', { abilityIds: ids('ST13-008') }),
  officialCard(L, 'ST13-009', { abilityIds: ids('ST13-009') }),
  officialCard(L, 'ST13-010', { abilityIds: ids('ST13-010') }),
  officialCard(L, 'ST13-011', { abilityIds: ids('ST13-011') }),
  officialCard(L, 'ST13-012', { abilityIds: ids('ST13-012') }),
  officialCard(L, 'ST13-013', { abilityIds: ids('ST13-013') }),
  officialCard(L, 'ST13-014', { abilityIds: ids('ST13-014') }),
  officialCard(L, 'ST13-015', { abilityIds: ids('ST13-015') }),
  officialCard(L, 'ST13-017', { abilityIds: ids('ST13-017'), counterEvent: { abilityId: 'ST13-017.counter' } }),
  officialCard(L, 'ST13-018', { abilityIds: ids('ST13-018'), counterEvent: { abilityId: 'ST13-018.counter' } }),
  officialCard(L, 'ST13-019', { abilityIds: ids('ST13-019') }),
]
export const ST13_OFFICIAL_ABILITY_DEFINITIONS = abilities
