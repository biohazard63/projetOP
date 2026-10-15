import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { after, ability, bindAll, draw, drawThenTrash, giveRestedDon, lifeToHand, ownLeaderOrCharacter, playChosen, power, rest, returnToHand, setActive, toDeckBottom, upTo } from './dsl'

// M6 ST-22 (BLUE Ace & Newgate). Texts are the official English card list (series 569022) archived with the ST-22 snapshot; the
// ST-22 FAQ (a revealed card stays face-down on top unless drawn; ST22-005 needs 2 hand cards) and the errata snapshot are in
// docs/game/evidence/m6/sources/. No runtime branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-22'
const once = { kind: 'ONCE_PER_TURN' as const }
const wb = ['Whitebeard Pirates']
/** "Reveal 1 card from the top of your deck. If that card's type includes \"Whitebeard Pirates\"": `hit` on a match (FAQ ST22-003). */
const revealTop = (whenBindingNonempty?: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'revealDeckTopMatch', version: '1.0.0', audience: 'PUBLIC', player: 'CONTROLLER', traitIncludesAny: wb, resultBinding: 'hit' }, ...(whenBindingNonempty ? { whenBindingNonempty } : {}) })
/** "You may reveal N cards with a type including \"Whitebeard Pirates\" from your hand:" — `paid` holds them. */
const revealFromHand = (n: number): Step[] => [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand', traitIncludesAny: wb }, optional: true, min: 0, max: n, bind: 'paid', visibility: 'PRIVATE', allOrNone: true },
  { kind: 'REVEAL_BINDING', bind: 'paid' }]
const opponentPowerUntil = (bind: string, amount: number): Step => ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: bind, amount, duration: 'UNTIL_END_OF_OPPONENT_NEXT_TURN' }, whenBindingNonempty: bind })

const abilities: EffectDefinition[] = [
  // ST22-001 Leader Ace & Newgate: [Activate: Main] [Once Per Turn] You may reveal 1 card with a type including "Whitebeard Pirates"
  // from your hand: Draw 1 card and place the revealed card at the top of your deck.
  ability('ST22-001.activate-main-draw', def('ST22-001'), 'leader', 'ACTIVATE_MAIN', [...revealFromHand(1), ...after('paid', [draw(1),
    { kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'CONTROLLER', audience: 'CONTROLLER', subjectBinding: 'paid', from: 'hand', to: 'deck', deckPosition: 'TOP' } }])], { usage: once }),
  // ST22-002 Izo: [On Play] Look at 5; reveal up to 1 card with a type including "Whitebeard Pirates" other than [Izo] to hand, the
  // rest at the bottom. [On Your Opponent's Attack] You may trash this Character: Draw 1 card and place 1 card from your hand at the
  // bottom of your deck (FAQ ST22-002: not once K.O.d by the [When Attacking] effect).
  ability('ST22-002.on-play-search', def('ST22-002'), 'characters', 'ON_PLAY', [{ kind: 'SEARCH_TOP_DECK', amount: 5, traitIncludesAny: wb, excludeRulesName: 'Izo', maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }]),
  ability('ST22-002.opponent-attack-draw', def('ST22-002'), 'characters', 'ON_OPPONENT_ATTACK', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters', isSource: true }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC', skipIfNone: true },
    { kind: 'OPERATION', operation: { primitive: 'trashCharacter', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'paid' }, whenBindingNonempty: 'paid' },
    ...after('paid', [draw(1), { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: false, min: 1, max: 1, bind: 'bottom', visibility: 'PRIVATE', clampMin: true },
      { kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'CONTROLLER', audience: 'CONTROLLER', subjectBinding: 'bottom', from: 'hand', to: 'deck' } }])]),
  // ST22-003 Edward.Newgate: [Double Attack]; [On Play] Reveal the top card: if its type includes "Whitebeard Pirates", draw 2 cards
  // (FAQ ST22-003: the revealed card is one of them; otherwise it stays face-down on top).
  ability('ST22-003.on-play-reveal', def('ST22-003'), 'characters', 'ON_PLAY', [revealTop(), { ...draw(2), whenBindingNonempty: 'hit' } as Step]),
  // ST22-005 Kouzuki Oden: (replacement below); [Activate: Main] [Once Per Turn] You may rest 3 of your DON!! cards and return 1 of
  // your Characters other than this Character to the owner's hand: Set this Character as active.
  ability('ST22-005.activate-main-active', def('ST22-005'), 'characters', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'cost', rested: false }, optional: true, min: 0, max: 3, bind: 'dons', visibility: 'PUBLIC', allOrNone: true,
      whenCondition: { kind: 'ALL_OF', conditions: [{ kind: 'ACTIVE_DON_AT_LEAST', minimum: 3 }, { kind: 'OWN_CHARACTERS_AT_LEAST', minimum: 2 }] } },
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters', excludeSource: true }, optional: false, min: 1, max: 1, bind: 'returned', visibility: 'PUBLIC', whenBindingNonempty: 'dons' },
    rest('dons'), returnToHand('returned'), { ...setActive(), whenBindingNonempty: 'dons' } as Step], { usage: once }),
  // ST22-006 Jozu: [On Play] Reveal the top card: if its type includes "Whitebeard Pirates", draw 2 cards and trash 1 card from your
  // hand (FAQ ST22-006).
  ability('ST22-006.on-play-reveal', def('ST22-006'), 'characters', 'ON_PLAY', [revealTop(), ...after('hit', drawThenTrash(2, 1))]),
  // ST22-007 Squard: [Activate: Main] [Once Per Turn] Reveal the top card: if its type includes "Whitebeard Pirates", give up to 1
  // rested DON!! card to your Leader or 1 of your Characters (FAQ ST22-007).
  ability('ST22-007.activate-main-reveal', def('ST22-007'), 'characters', 'ACTIVATE_MAIN', [revealTop(), ...after('hit', [ownLeaderOrCharacter(1, 'donTarget'), ...giveRestedDon('donTarget')])], { usage: once }),
  // ST22-011 Whitey Bay: [Your Turn] [On Play] You may reveal 2 cards with a type including "Whitebeard Pirates" from your hand: Up to 1
  // of your Leader with a type including "Whitebeard Pirates" gains +2000 power during this turn.
  ability('ST22-011.on-play-power', def('ST22-011'), 'characters', 'ON_PLAY', [...revealFromHand(2), ...after('paid', [upTo(1, 'leader', { side: 'OWN', zone: 'leader', traitIncludesAny: wb }), power('leader', 2000, 'THIS_TURN')])],
    { condition: { kind: 'YOUR_TURN' } }),
  // ST22-012 Marco: (replacement below); [When Attacking] Reveal the top card: if its type includes "Whitebeard Pirates", this Character
  // gains +1000 power until the end of your opponent's next turn (FAQ ST22-012).
  ability('ST22-012.when-attacking-reveal', def('ST22-012'), 'characters', 'WHEN_ATTACKING', [revealTop(), bindAll('self', { side: 'OWN', zone: 'characters', isSource: true }), { ...opponentPowerUntil('self', 1000), whenBindingNonempty: 'hit' } as Step]),
  // ST22-015 I Am Whitebeard!!: [Main] If your Leader's type includes "Whitebeard Pirates", play up to 1 [Edward.Newgate] from your hand.
  // Then, you may add 1 card from the top or bottom of your Life cards to your hand. If you do, up to 1 of your Leader gains +2000
  // power until the end of your opponent's next turn (FAQ EB03-017/OP14-112: the "Then," part follows the Leader condition).
  ability('ST22-015.main-play', def('ST22-015'), 'hand', 'MAIN', [{ kind: 'CHECK', bind: 'wb', condition: { kind: 'LEADER_TRAIT_INCLUDES', text: 'Whitebeard Pirates' } },
    ...after('wb', [...playChosen('play', 'hand', { categories: ['CHARACTER'], nameIs: 'Edward.Newgate' }), ...lifeToHand('life')]),
    upTo(1, 'leader', { side: 'OWN', zone: 'leader' }, { whenBindingNonempty: 'life' }), opponentPowerUntil('leader', 2000)]),
  // ST22-016 Take That Back!! Take Back What You Said!!: [Counter] Reveal the top card: if its type includes "Whitebeard Pirates", up to
  // 1 of your Leader or Character cards gains +4000 power during this battle (FAQ ST22-016). [Trigger] Draw 1 card.
  ability('ST22-016.counter', def('ST22-016'), 'hand', 'COUNTER', [revealTop(), ...after('hit', [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 4000, 'THIS_BATTLE')])]),
  ability('ST22-016.trigger-draw', def('ST22-016'), 'temporary', 'TRIGGER', [draw(1)]),
  // ST22-017 Fire Fist: [Main] You may reveal 2 cards with a type including "Whitebeard Pirates" from your hand: Draw 1 card. Then,
  // place up to 1 Character with a cost of 5 or less at the bottom of the owner's deck. [Trigger] Return up to 1 Character with a cost
  // of 3 or less to the owner's hand.
  ability('ST22-017.main-draw-bottom', def('ST22-017'), 'hand', 'MAIN', [...revealFromHand(2), ...after('paid', [draw(1), upTo(1, 'target', { side: 'ANY', zone: 'characters', maxCost: 5 }), toDeckBottom('target')])]),
  ability('ST22-017.trigger-bounce', def('ST22-017'), 'temporary', 'TRIGGER', [upTo(1, 'target', { side: 'ANY', zone: 'characters', maxCost: 3 }), returnToHand('target')]),
]
export const ST22_OFFICIAL_REPLACEMENTS = [
  // ST22-005 Kouzuki Oden: If this Character would be removed from the field by your opponent's effect, you may trash 2 cards from your
  // hand instead (FAQ ST22-005: not with 1 card).
  { id: 'ST22-005.guard-trash-two', definitionId: def('ST22-005'), zone: 'characters' as const, match: 'GUARD' as const, event: 'REMOVAL' as const, cause: 'OPPONENT_EFFECT' as const, protects: { self: true as const }, action: 'TRASH_HAND' as const, count: 2, usage: 'UNLIMITED' as const },
  // ST22-012 Marco: [Once Per Turn] If this Character would be K.O.'d by your opponent's effect, you may trash 1 card from your hand instead.
  { id: 'ST22-012.guard-trash', definitionId: def('ST22-012'), zone: 'characters' as const, match: 'GUARD' as const, event: 'KO' as const, cause: 'OPPONENT_EFFECT' as const, protects: { self: true as const }, action: 'TRASH_HAND' as const, usage: 'ONCE_PER_TURN' as const },
]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST22_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'ST22-001', { abilityIds: ids('ST22-001') }),
  officialCard(L, 'ST22-002', { abilityIds: ids('ST22-002') }),
  officialCard(L, 'ST22-003', { keywords: ['DOUBLE_ATTACK'], abilityIds: ids('ST22-003') }),
  officialCard(L, 'ST22-005', { abilityIds: ids('ST22-005', ['ST22-005.guard-trash-two']) }),
  officialCard(L, 'ST22-006', { abilityIds: ids('ST22-006') }),
  officialCard(L, 'ST22-007', { abilityIds: ids('ST22-007') }),
  officialCard(L, 'ST22-011', { abilityIds: ids('ST22-011') }),
  officialCard(L, 'ST22-012', { abilityIds: ids('ST22-012', ['ST22-012.guard-trash']) }),
  officialCard(L, 'ST22-015', { abilityIds: ids('ST22-015') }),
  officialCard(L, 'ST22-016', { abilityIds: ids('ST22-016'), counterEvent: { abilityId: 'ST22-016.counter' } }),
  officialCard(L, 'ST22-017', { abilityIds: ids('ST22-017') }),
]
export const ST22_OFFICIAL_ABILITY_DEFINITIONS = abilities
