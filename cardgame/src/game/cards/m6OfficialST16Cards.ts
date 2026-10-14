import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { after, ability, bindAll, check, giveRestedDon, ko, ownLeaderOrCharacter, rest, returnToHand, setActive, trashFromHand, upTo } from './dsl'

// M6 ST-16 (GREEN Uta) and the promotion cards it reprints (P-029, P-057..P-061); the ST-11 cards keep their ST-11 revisions.
// Texts are the official English card list (series 569016) archived with the ST-16 snapshot; the ST-15-20 FAQ (ST16-002,
// ST16-003), the promotion-card FAQ (P-057, P-058, P-060) and the errata snapshot are in docs/game/evidence/m6/sources/.
// No runtime branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-16'
const once = { kind: 'ONCE_PER_TURN' as const }
const uta = { kind: 'LEADER_NAME_IS' as const, name: 'Uta' }
const film = ['FILM']
const allFilmActive = (): Step[] => [bindAll('film', { side: 'OWN', zone: 'characters', traitsAny: film }), setActive('film')]
const thisBattlePer = (amount: number, target: string, per: string): Step => ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: target, perBinding: per, amount, duration: 'THIS_BATTLE' } })
/** "[Main] If your Leader is [Uta], up to 2 of your opponent's rested Characters with a cost of 4 or less will not become active
 * in your opponent's next Refresh Phase." */
const lullaby = (): Step[] => [check('uta', uta), upTo(2, 'locked', { side: 'OPPONENT', zone: 'characters', rested: true, maxCost: 4 }, { whenBindingNonempty: 'uta' }),
  { kind: 'OPERATION', operation: { primitive: 'lockRefresh', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'locked' } }]

const abilities: EffectDefinition[] = [
  // P-029 Bartolomeo: [End of Your Turn] You may rest this Character: Set up to 1 of your {FILM} type Characters other than
  // [Bartolomeo] as active.
  ability('P-029.end-of-turn-set-active', def('P-029'), 'characters', 'END_OF_YOUR_TURN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters', isSource: true, rested: false }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC', skipIfNone: true },
    rest('paid'), ...after('paid', [upTo(1, 'target', { side: 'OWN', zone: 'characters', traitsAny: film, nameNot: 'Bartolomeo' }), setActive('target')])]),
  // P-057 Fleeting Lullaby: [Main] (above); [Trigger] Activate this card's [Main] effect (FAQ P-057: a Character that became
  // active again before that Refresh Phase is unaffected).
  ability('P-057.main-lock', def('P-057'), 'hand', 'MAIN', lullaby()),
  ability('P-057.trigger-main', def('P-057'), 'temporary', 'TRIGGER', lullaby()),
  // P-058 Where the Wind Blows: [Main] If your Leader is [Uta], set all of your {FILM} type Characters as active at the end of this
  // turn (FAQ P-058: including a {FILM} Character played and rested during that turn). [Trigger] Set all of your {FILM} type
  // Characters as active.
  ability('P-058.main-delay', def('P-058'), 'hand', 'MAIN', [check('uta', uta),
    { kind: 'OPERATION', operation: { primitive: 'scheduleEndOfTurn', version: '1.0.0', audience: 'PUBLIC', definitionId: 'P-058.end-of-turn-delayed' }, whenBindingNonempty: 'uta' }]),
  ability('P-058.end-of-turn-delayed', def('P-058'), 'trash', 'END_OF_YOUR_TURN', allFilmActive()),
  ability('P-058.trigger-set-active', def('P-058'), 'temporary', 'TRIGGER', allFilmActive()),
  // P-059 The World's Continuation: [Counter] If your Leader is [Uta], you may return any number of Characters on your field to
  // the owner's hand. Up to 1 of your Leader or Character cards gains +2000 power during this battle for every returned Character.
  ability('P-059.counter', def('P-059'), 'hand', 'COUNTER', [check('uta', uta),
    { ...upTo(5, 'returned', { side: 'OWN', zone: 'characters' }, { whenBindingNonempty: 'uta' }) } as Step, returnToHand('returned'),
    { ...ownLeaderOrCharacter(1, 'boosted'), whenBindingNonempty: 'returned' } as Step, thisBattlePer(2000, 'boosted', 'returned')]),
  // P-060 Tot Musica: [Main] You may rest 1 of your [Uta] cards: Rest up to 2 of your opponent's DON!! cards (FAQ P-060: your
  // [Uta] Leader or Characters).
  ability('P-060.main-rest-don', def('P-060'), 'hand', 'MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'leaderOrCharacters', nameIs: 'Uta', rested: false }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC' },
    rest('paid'), ...after('paid', [upTo(2, 'don', { side: 'OPPONENT', zone: 'cost' }), rest('don')])]),
  // ST16-001 Uta: [Blocker]; [Activate: Main] [Once Per Turn] You may trash 1 {FILM} type card from your hand: Give up to 1 rested
  // DON!! card to your Leader or 1 of your Characters.
  ability('ST16-001.activate-main-don', def('ST16-001'), 'characters', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand', traitsAny: film }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE' },
    trashFromHand('paid', 'paid'), ...after('paid', [ownLeaderOrCharacter(1, 'donTarget'), ...giveRestedDon('donTarget')])], { usage: once }),
  // ST16-002 Gordon: [Blocker]; [On Your Opponent's Attack] You may trash any number of {Music} type cards from your hand. Your
  // Leader or 1 of your Characters gains +1000 power during this battle for every card trashed (FAQ ST16-002: one card only).
  ability('ST16-002.on-opponent-attack-power', def('ST16-002'), 'characters', 'ON_OPPONENT_ATTACK', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand', traitsAny: ['Music'] }, optional: true, min: 0, max: 10, bind: 'paid', visibility: 'PRIVATE' },
    trashFromHand('paid', 'paid'),
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_LEADER_OR_CHARACTER' }, optional: false, min: 1, max: 1, bind: 'boosted', visibility: 'PUBLIC', whenBindingNonempty: 'paid' },
    thisBattlePer(1000, 'boosted', 'paid')]),
  // ST16-004 Shanks: [On Play] K.O. up to 1 of your opponent's rested Characters.
  ability('ST16-004.on-play-ko', def('ST16-004'), 'characters', 'ON_PLAY', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', rested: true }), ko('target')]),
]
export const ST16_OFFICIAL_CONTINUOUS = [
  // ST16-003 Charlotte Katakuri: If your Leader has the {FILM} type and you have 6 or more rested cards, +2000 power (FAQ ST16-003:
  // this Character counts when rested).
  { id: 'ST16-003.rested-cards-power', definitionId: def('ST16-003'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 2000, minimumAttachedDon: 0, whenLeaderHasTrait: 'FILM', minimumOwnRestedCards: 6 },
  // ST16-005 Monkey.D.Luffy: If you have a rested [Uta], this Character gains +1000 power.
  { id: 'ST16-005.rested-uta-power', definitionId: def('ST16-005'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 1000, minimumAttachedDon: 0, whenOwnRestedNamed: 'Uta' },
]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST16_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'P-029', { abilityIds: ids('P-029') }),
  officialCard(L, 'P-057', { abilityIds: ids('P-057') }),
  officialCard(L, 'P-058', { abilityIds: ids('P-058') }),
  officialCard(L, 'P-059', { abilityIds: ids('P-059'), counterEvent: { abilityId: 'P-059.counter' } }),
  officialCard(L, 'P-060', { abilityIds: ids('P-060') }),
  officialCard(L, 'ST16-001', { blocker: true, abilityIds: ids('ST16-001') }),
  officialCard(L, 'ST16-002', { blocker: true, abilityIds: ids('ST16-002') }),
  officialCard(L, 'ST16-003', { abilityIds: ['ST16-003.rested-cards-power'] }),
  officialCard(L, 'ST16-004', { abilityIds: ids('ST16-004') }),
  officialCard(L, 'ST16-005', { abilityIds: ['ST16-005.rested-uta-power'] }),
]
export const ST16_OFFICIAL_ABILITY_DEFINITIONS = abilities
