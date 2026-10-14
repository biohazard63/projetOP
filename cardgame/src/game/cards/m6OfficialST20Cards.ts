import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { after, ability, bindAll, deckTopToLife, giveRestedDon, ko, lifeToHand, ownLeaderOrCharacter, peekLife, playThisCardSteps, power, rest, setActive, trashFromHand, upTo } from './dsl'

// M6 ST-20 (YELLOW Charlotte Katakuri) and its OP-03 reprints. Texts are the official English card list (series 569020) archived
// with the ST-20 snapshot; the ST-15-20 FAQ (ST20-001, ST20-002, ST20-005), the OP-03 FAQ and the errata snapshot are in
// docs/game/evidence/m6/sources/. No runtime branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-20'
const once = { kind: 'ONCE_PER_TURN' as const }
const bigMom = ['Big Mom Pirates']
/** "You may trash N cards from your hand:" — all or nothing; `bind` holds the trashed cards. */
const mayTrash = (n: number, bind = 'paid', filter: { hasTrigger?: true } = {}): Step[] => [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand', ...filter }, optional: true, min: 0, max: n, bind, visibility: 'PRIVATE', allOrNone: true }, trashFromHand(bind, bind)]
/** "[Trigger] You may trash 1 card from your hand: Play this card." */
const trashToPlay = (): Step[] => [...mayTrash(1, 'discard'), ...after('discard', playThisCardSteps())]
const selfPower = (amount: number): Step => ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', amount, duration: 'THIS_BATTLE' } })
const koCost = (maxCost: number): Step[] => [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost }), ko('target')]
const triggerToHand: Step = { kind: 'OPERATION', operation: { primitive: 'triggerCardToHand', version: '1.0.0', audience: 'CONTROLLER' } }

const abilities: EffectDefinition[] = [
  // OP03-099 Leader Charlotte Katakuri: [DON!! x1] [When Attacking] Look at up to 1 card from the top of your or your opponent's Life
  // cards, and place it at the top or bottom of the Life cards. Then, this Leader gains +1000 power during this battle (FAQ
  // OP03-099: even with no Life to look at; a face-up card stays face-up).
  ability('OP03-099.when-attacking-peek', def('OP03-099'), 'leader', 'WHEN_ATTACKING', [...peekLife(), selfPower(1000)], { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 1 } }),
  // ST20-001 Charlotte Katakuri: [Blocker]; [Activate: Main] [Once Per Turn] You may turn 1 card from the top of your Life cards
  // face-up: Give up to 1 rested DON!! card to your Leader or 1 of your Characters (FAQ ST20-001: not if the top card is face-up).
  ability('ST20-001.activate-main-don', def('ST20-001'), 'characters', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'life', lifeEnd: 'TOP', faceUp: false }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC', skipIfNone: true },
    { kind: 'OPERATION', operation: { primitive: 'turnLifeFaceUp', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'paid' } },
    ...after('paid', [ownLeaderOrCharacter(1, 'donTarget'), ...giveRestedDon('donTarget')])], { usage: once }),
  // ST20-002 Charlotte Cracker: [Trigger] You may trash 1 card from your hand: Play this card (K.O. replacement below).
  ability('ST20-002.trigger-play', def('ST20-002'), 'temporary', 'TRIGGER', trashToPlay()),
  // ST20-003 Charlotte Brulee: [Trigger] Look at up to 1 card from the top of your or your opponent's Life cards, and place it at
  // the top or bottom of the Life cards. Then, add this card to your hand.
  ability('ST20-003.trigger-peek', def('ST20-003'), 'temporary', 'TRIGGER', [...peekLife(), triggerToHand]),
  // ST20-004 Charlotte Pudding: [On Play] You may add 1 card from the top of your Life cards to your hand: Set up to 1 of your
  // {Big Mom Pirates} type Characters with a cost of 3 or less as active. [Trigger] Rest up to 1 opposing Character cost 3 or less.
  ability('ST20-004.on-play-set-active', def('ST20-004'), 'characters', 'ON_PLAY', [...lifeToHand('paid', { lifeEnd: 'TOP' }),
    ...after('paid', [upTo(1, 'target', { side: 'OWN', zone: 'characters', traitsAny: bigMom, maxCost: 3 }), setActive('target')])]),
  ability('ST20-004.trigger-rest', def('ST20-004'), 'temporary', 'TRIGGER', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 3 }), rest('target')]),
  // ST20-005 Charlotte Linlin: [On Play] You may trash 1 card from your hand: Your opponent chooses one: • Your opponent trashes 2
  // cards from their hand. • Trash 1 card from the top of your opponent's Life cards (FAQ ST20-005: the opponent chooses and
  // trashes; with no Life, nothing happens).
  ability('ST20-005.on-play-mode', def('ST20-005'), 'characters', 'ON_PLAY', [...mayTrash(1),
    { kind: 'MODE', modes: 2, bind: 'mode', chooser: 'OPPONENT', whenBindingNonempty: 'paid' },
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: false, min: 2, max: 2, bind: 'oppDiscard', visibility: 'PRIVATE', clampMin: true, chooser: 'OPPONENT', whenBindingNonempty: 'mode.0' },
    { kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'oppDiscard', from: 'hand', to: 'trash' }, whenBindingNonempty: 'mode.0' },
    bindAll('oppLife', { side: 'OPPONENT', zone: 'life', lifeEnd: 'TOP' }),
    { kind: 'OPERATION', operation: { primitive: 'trashLife', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'oppLife' }, whenBindingNonempty: 'mode.1' }]),
  // OP03-110 Charlotte Smoothie: [When Attacking] You may add 1 card from the top or bottom of your Life cards to your hand: This
  // Character gains +2000 power during this battle. [Trigger] You may trash 1 card from your hand: Play this card.
  ability('OP03-110.when-attacking-power', def('OP03-110'), 'characters', 'WHEN_ATTACKING', [...lifeToHand('paid'), { ...selfPower(2000), whenBindingNonempty: 'paid' } as Step]),
  ability('OP03-110.trigger-play', def('OP03-110'), 'temporary', 'TRIGGER', trashToPlay()),
  // OP03-112 Charlotte Pudding: [On Play] Look at 4 cards; reveal up to 1 [Sanji] or {Big Mom Pirates} type card other than
  // [Charlotte Pudding] and add it to your hand (FAQ OP03-112: a [Sanji] of any type). Then, the rest at the bottom in any order.
  ability('OP03-112.on-play-search', def('OP03-112'), 'characters', 'ON_PLAY', [{ kind: 'SEARCH_TOP_DECK', amount: 4, namesAny: ['Sanji'], traitsAny: bigMom, excludeRulesName: 'Charlotte Pudding', maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }]),
  // OP03-115 Streusen: [On Play] You may trash 1 card with a [Trigger] from your hand: K.O. up to 1 opposing Character cost 1 or less.
  ability('OP03-115.on-play-ko', def('OP03-115'), 'characters', 'ON_PLAY', [...mayTrash(1, 'paid', { hasTrigger: true }), ...after('paid', koCost(1))]),
  // OP03-118 Ikoku Sovereignty: [Counter] Up to 1 of your Leader or Character cards gains +5000 power during this battle.
  // [Trigger] You may trash 2 cards from your hand: Add up to 1 card from the top of your deck to the top of your Life cards.
  ability('OP03-118.counter', def('OP03-118'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'target'), power('target', 5000, 'THIS_BATTLE')]),
  ability('OP03-118.trigger-life', def('OP03-118'), 'temporary', 'TRIGGER', [...mayTrash(2), ...deckTopToLife('deckTop', 'paid')]),
  // OP03-121 Thunder Bolt: [Main] You may trash 1 card from the top of your Life cards: K.O. up to 1 opposing Character with a
  // cost of 5 or less. [Trigger] K.O. up to 1 opposing Character with a cost of 5 or less.
  ability('OP03-121.main-ko', def('OP03-121'), 'hand', 'MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'life', lifeEnd: 'TOP' }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC' },
    { kind: 'OPERATION', operation: { primitive: 'trashLife', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'paid' } },
    ...after('paid', koCost(5))]),
  ability('OP03-121.trigger-ko', def('OP03-121'), 'temporary', 'TRIGGER', koCost(5)),
]
// ST20-002 Charlotte Cracker: [Once Per Turn] If this Character would be K.O.'d by an effect, you may trash 1 card from the top of
// your Life cards instead (FAQ ST20-002: not with 0 Life).
export const ST20_OFFICIAL_REPLACEMENTS = [{ id: 'ST20-002.guard-life', definitionId: def('ST20-002'), zone: 'characters' as const, match: 'GUARD' as const, event: 'KO' as const, cause: 'EFFECT' as const,
  protects: { self: true as const }, action: 'TRASH_LIFE_TOP' as const, usage: 'ONCE_PER_TURN' as const }]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST20_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'OP03-099', { abilityIds: ids('OP03-099') }),
  officialCard(L, 'ST20-001', { blocker: true, abilityIds: ids('ST20-001') }),
  officialCard(L, 'ST20-002', { abilityIds: ids('ST20-002', ['ST20-002.guard-life']) }),
  officialCard(L, 'ST20-003', { abilityIds: ids('ST20-003') }),
  officialCard(L, 'ST20-004', { abilityIds: ids('ST20-004') }),
  officialCard(L, 'ST20-005', { abilityIds: ids('ST20-005') }),
  officialCard(L, 'OP03-110', { abilityIds: ids('OP03-110') }),
  officialCard(L, 'OP03-112', { abilityIds: ids('OP03-112') }),
  officialCard(L, 'OP03-115', { abilityIds: ids('OP03-115') }),
  officialCard(L, 'OP03-118', { abilityIds: ids('OP03-118'), counterEvent: { abilityId: 'OP03-118.counter' } }),
  officialCard(L, 'OP03-121', { abilityIds: ids('OP03-121') }),
]
export const ST20_OFFICIAL_ABILITY_DEFINITIONS = abilities
