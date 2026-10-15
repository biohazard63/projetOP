import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { after, ability, draw, drawThenTrash, grantRush, ko, opponentPower, ownLeaderOrCharacter, power, rest, trashFromHand, upTo } from './dsl'

// M6 ST-30 (RED/GREEN Luffy & Ace). Texts are the official English card list (series 569030) archived with the ST-30 snapshot;
// the ST-30 FAQ ("6000 power" and "6000 base power" mean exactly 6000; [Rush] needs an active DON!! at resolution) and the errata
// snapshot are in docs/game/evidence/m6/sources/. ST30-005 is certified with M5. No runtime branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-30'
const six = { minPower: 6000, maxPower: 6000 }
const sixBase = { minPower: 6000, maxPower: 6000, powerBasis: 'BASE' as const }
/** "You may trash 1 Character card with 6000 power from your hand:" — `paid` holds it. */
const trashSix = (): Step[] => [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand', categories: ['CHARACTER'], ...six }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE' }, trashFromHand('paid', 'paid')]
/** "You may rest 1 of your DON!! cards: This Character gains [Rush] during this turn" (FAQ ST30-007/012: an active DON!! is needed then). */
const restDonRush = (): Step[] => [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'cost', rested: false }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC', skipIfNone: true },
  rest('paid'), { ...grantRush(), whenBindingNonempty: 'paid' } as Step]
const searchSix = (): Step[] => [{ kind: 'SEARCH_TOP_DECK', amount: 5, category: 'CHARACTER', minPower: 6000, maxPower: 6000, maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }]
/** "Give up to 2 rested DON!! cards" to the bound Character. */
const twoDonTo = (target: string, bind: string): Step[] => [upTo(2, bind, { side: 'OWN', zone: 'cost', rested: true }, { whenBindingNonempty: target }),
  { kind: 'OPERATION', operation: { primitive: 'attachRestedDon', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: bind, targetBinding: target }, whenBindingNonempty: target }]
const countSix = (nameIs?: string) => ({ kind: 'OWN_CHARACTER_COUNT' as const, minCost: 0, atLeast: 1, minBasePower: 6000, maxBasePower: 6000, ...(nameIs ? { nameIs } : {}) })

const abilities: EffectDefinition[] = [
  // ST30-002 Inazuma: [On Play] Look at 5 cards from the top of your deck; reveal up to 1 Character card with 6000 power and add it to
  // your hand. Then, place the rest at the bottom of your deck in any order (FAQ ST30-002: exactly 6000).
  ability('ST30-002.on-play-search', def('ST30-002'), 'characters', 'ON_PLAY', searchSix()),
  // ST30-004 Emporio.Ivankov: [On Play] You may reveal 2 Character cards with 6000 power from your hand: Draw 3 cards and trash 2 cards
  // from your hand (FAQ ST30-004: exactly 6000).
  ability('ST30-004.on-play-draw', def('ST30-004'), 'characters', 'ON_PLAY', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand', categories: ['CHARACTER'], ...six }, optional: true, min: 0, max: 2, bind: 'paid', visibility: 'PRIVATE', allOrNone: true },
    { kind: 'REVEAL_BINDING', bind: 'paid' }, ...after('paid', drawThenTrash(3, 2))]),
  // ST30-006 Jinbe: [On Play] You may trash 1 Character card with 6000 power from your hand: Draw 2 cards.
  ability('ST30-006.on-play-draw', def('ST30-006'), 'characters', 'ON_PLAY', [...trashSix(), { ...draw(2), whenBindingNonempty: 'paid' } as Step]),
  // ST30-007 Portgas.D.Ace: [On Play] You may rest 1 of your DON!! cards: [Rush] this turn. [When Attacking] Give up to 1 of your
  // opponent's Characters -1000 power during this turn.
  ability('ST30-007.on-play-rush', def('ST30-007'), 'characters', 'ON_PLAY', restDonRush()),
  ability('ST30-007.when-attacking-power', def('ST30-007'), 'characters', 'WHEN_ATTACKING', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), opponentPower(-1000)]),
  // ST30-008 Marco: [Blocker]; [On K.O.] You may trash 1 Character card with 6000 power from your hand: Play this Character card from
  // your trash rested.
  ability('ST30-008.on-ko-replay', def('ST30-008'), 'characters', 'ON_KO', [...trashSix(),
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'trash', isSource: true }, optional: false, min: 1, max: 1, bind: 'self', visibility: 'PUBLIC', skipIfNone: true, whenBindingNonempty: 'paid' },
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters' }, optional: false, min: 1, max: 1, bind: 'self.replace', visibility: 'PUBLIC', whenBindingNonempty: 'self', whenCondition: { kind: 'OWN_CHARACTERS_AT_LEAST', minimum: 5 } },
    { kind: 'OPERATION', operation: { primitive: 'playCard', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'self', from: 'trash', replaceBinding: 'self.replace', rested: true } }]),
  // ST30-010 Crocodile: [Blocker]; [On Play] Up to 1 of your opponent's rested Characters will not become active in your opponent's
  // next Refresh Phase.
  ability('ST30-010.on-play-lock', def('ST30-010'), 'characters', 'ON_PLAY', [upTo(1, 'locked', { side: 'OPPONENT', zone: 'characters', rested: true }),
    { kind: 'OPERATION', operation: { primitive: 'lockRefresh', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'locked' } }]),
  // ST30-012 Monkey.D.Luffy: [On Play] You may rest 1 of your DON!! cards: [Rush] this turn. [When Attacking] Rest up to 1 of your
  // opponent's [Blocker] Characters.
  ability('ST30-012.on-play-rush', def('ST30-012'), 'characters', 'ON_PLAY', restDonRush()),
  ability('ST30-012.when-attacking-rest', def('ST30-012'), 'characters', 'WHEN_ATTACKING', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', hasBlocker: true }), rest('target')]),
  // ST30-014 Mr.3(Galdino): [Activate: Main] You may rest this Character: Give up to 2 of your Characters with 6000 base power up to 2
  // rested DON!! cards each (FAQ ST30-014: exactly 6000).
  ability('ST30-014.activate-main-don', def('ST30-014'), 'characters', 'ACTIVATE_MAIN', [
    upTo(1, 'first', { side: 'OWN', zone: 'characters', ...sixBase }), ...twoDonTo('first', 'firstDon'),
    upTo(1, 'second', { side: 'OWN', zone: 'characters', ...sixBase, excludeBinding: 'first' }), ...twoDonTo('second', 'secondDon')], { cost: { kind: 'REST_SOURCE' } }),
  // ST30-015 The Name of This Era Is "Whitebeard"!!: [Counter] If you have 2 or more Characters with 6000 base power, up to 1 of your
  // Leader or Character cards gains +4000 power during this battle. [Trigger] K.O. up to 1 opposing Character with 6000 power or less.
  ability('ST30-015.counter', def('ST30-015'), 'hand', 'COUNTER', [{ ...ownLeaderOrCharacter(1, 'boosted'), whenCondition: { ...countSix(), atLeast: 2 } } as Step, power('boosted', 4000, 'THIS_BATTLE')]),
  ability('ST30-015.trigger-ko', def('ST30-015'), 'temporary', 'TRIGGER', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxPower: 6000 }), ko('target')]),
  // ST30-016 Can You Still Fight, Luffy?! Of Course!!: [Counter] Up to 1 of your Leader or Character cards gains +3000 power during this
  // battle. Then, if you have [Portgas.D.Ace] and [Monkey.D.Luffy] Characters with 6000 base power, draw 1 card (FAQ ST30-016: both).
  ability('ST30-016.counter', def('ST30-016'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 3000, 'THIS_BATTLE'),
    { ...draw(1), whenCondition: { kind: 'ALL_OF', conditions: [countSix('Portgas.D.Ace'), countSix('Monkey.D.Luffy')] } } as Step]),
  // ST30-017 And You Get Yourself in Big Trouble!!: [Main] (search above). [Trigger] Activate this card's [Main] effect.
  ability('ST30-017.main-search', def('ST30-017'), 'hand', 'MAIN', searchSix()),
  ability('ST30-017.trigger-main', def('ST30-017'), 'temporary', 'TRIGGER', searchSix()),
]
export const ST30_OFFICIAL_CONTINUOUS = [
  // ST30-001 Leader Luffy & Ace: If you have a Character with 7000 base power or more, give this Leader -2000 power (FAQ ST30-001: not
  // with no Character). [Opponent's Turn] All of your [Portgas.D.Ace] and [Monkey.D.Luffy] cards gain +3000 power (FAQ: not this Leader).
  { id: 'ST30-001.big-character-penalty', definitionId: def('ST30-001'), zone: 'leader' as const, characteristic: 'POWER' as const, amount: -2000, minimumAttachedDon: 0, whenCharacter: { side: 'OWN' as const, minPower: 7000, powerBasis: 'BASE' as const } },
  { id: 'ST30-001.opponent-turn-aura', definitionId: def('ST30-001'), zone: 'leader' as const, characteristic: 'POWER' as const, amount: 3000, minimumAttachedDon: 0, duringOpponentTurn: true as const, targets: { namesAny: ['Portgas.D.Ace', 'Monkey.D.Luffy'] } },
  // ST30-003 Edward.Newgate: [Your Turn] All of your Characters with 6000 base power gain +1000 power (FAQ ST30-003: exactly 6000).
  { id: 'ST30-003.your-turn-aura', definitionId: def('ST30-003'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 1000, minimumAttachedDon: 0, duringYourTurn: true as const, targets: { charactersOnly: true as const, minBasePower: 6000, maxBasePower: 6000 } },
]
export const ST30_OFFICIAL_REPLACEMENTS = [
  // ST30-009 LittleOars Jr.: If your Character with 6000 base power would be removed from the field by your opponent's effect, you may
  // trash this Character and draw 1 card instead (FAQ ST30-009: exactly 6000).
  { id: 'ST30-009.guard-trash-draw', definitionId: def('ST30-009'), zone: 'characters' as const, match: 'GUARD' as const, event: 'REMOVAL' as const, cause: 'OPPONENT_EFFECT' as const, protects: { minBasePower: 6000, maxBasePower: 6000 }, action: 'TRASH_SOURCE_DRAW' as const, usage: 'UNLIMITED' as const },
  // ST30-011 Buggy: If your Character with 6000 base power would be removed from the field by your opponent's effect, you may rest this
  // Character instead (FAQ ST30-011: exactly 6000).
  { id: 'ST30-011.guard-rest', definitionId: def('ST30-011'), zone: 'characters' as const, match: 'GUARD' as const, event: 'REMOVAL' as const, cause: 'OPPONENT_EFFECT' as const, protects: { minBasePower: 6000, maxBasePower: 6000 }, action: 'REST_SOURCE' as const, usage: 'UNLIMITED' as const },
]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST30_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'ST30-001', { abilityIds: ['ST30-001.big-character-penalty', 'ST30-001.opponent-turn-aura'] }),
  officialCard(L, 'ST30-002', { abilityIds: ids('ST30-002') }),
  officialCard(L, 'ST30-003', { abilityIds: ['ST30-003.your-turn-aura'] }),
  officialCard(L, 'ST30-004', { abilityIds: ids('ST30-004') }),
  officialCard(L, 'ST30-006', { abilityIds: ids('ST30-006') }),
  officialCard(L, 'ST30-007', { abilityIds: ids('ST30-007') }),
  officialCard(L, 'ST30-008', { blocker: true, abilityIds: ids('ST30-008') }),
  officialCard(L, 'ST30-009', { abilityIds: ['ST30-009.guard-trash-draw'] }),
  officialCard(L, 'ST30-010', { blocker: true, abilityIds: ids('ST30-010') }),
  officialCard(L, 'ST30-011', { blocker: true, abilityIds: ['ST30-011.guard-rest'] }),
  officialCard(L, 'ST30-012', { abilityIds: ids('ST30-012') }),
  officialCard(L, 'ST30-014', { abilityIds: ids('ST30-014') }),
  officialCard(L, 'ST30-015', { abilityIds: ids('ST30-015'), counterEvent: { abilityId: 'ST30-015.counter' } }),
  officialCard(L, 'ST30-016', { abilityIds: ids('ST30-016'), counterEvent: { abilityId: 'ST30-016.counter' } }),
  officialCard(L, 'ST30-017', { abilityIds: ids('ST30-017') }),
]
export const ST30_OFFICIAL_ABILITY_DEFINITIONS = abilities
