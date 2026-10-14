import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { ability, after, bindAll, draw, ko, opponentPower, ownLeaderOrCharacter, playChosen, trashFromHand, upTo, giveRestedDon } from './dsl'

// M6 ST-23 (Red Shanks). Texts are the official English card list (series 569023) archived with the ST-23 snapshot; the OP-09
// FAQ (OP09-001, OP09-014), the ST-23-28 FAQ (ST23-001, ST23-002) and the errata snapshot are in docs/game/evidence/m6/sources/.
type Step = EffectDefinition['program'][number]
const L = 'ST-23'
const redHair = 'Red-Haired Pirates'
const leaderRedHair = { kind: 'LEADER_HAS_TRAIT' as const, trait: redHair }
const don1 = { kind: 'SOURCE_ATTACHED_DON_AT_LEAST' as const, minimum: 1 }
const minusPower = (amount: number, whenCondition?: Extract<Step, { kind: 'CHOICE' }>['whenCondition']): Step[] => [{ ...upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), ...(whenCondition ? { whenCondition } : {}) } as Step, opponentPower(-amount)]
const ownPower = (bind: string, amount: number, duration: 'THIS_TURN' | 'UNTIL_END_OF_OPPONENT_NEXT_TURN'): Step => ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: bind, amount, duration } })
const selfPower = (amount: number): Step => ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', amount, duration: 'THIS_TURN' } })
const koBasePower = (maxPower: number, whenCondition: typeof leaderRedHair): Step[] => [{ ...upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxPower, powerBasis: 'BASE' }), whenCondition } as Step, ko('target')]

const abilities: EffectDefinition[] = [
  // OP09-001 Leader: [Once Per Turn] This effect can be activated when your opponent attacks. Give up to 1 of your opponent's
  // Leader or Character cards −1000 power during this turn (FAQ OP09-001: may wait for a later attack; Leader or Character).
  ability('OP09-001.opponent-attack-power', def('OP09-001'), 'leader', 'ON_OPPONENT_ATTACK', [upTo(1, 'target', { side: 'OPPONENT', zone: 'leaderOrCharacters' }), opponentPower(-1000)], { usage: { kind: 'ONCE_PER_TURN_WHEN_CHOSEN' } }),
  // ST23-002 Shanks: [On Play] If your Leader has the {Red-Haired Pirates} type or is [Uta], your Leader gains +2000 power until
  // the end of your opponent's next End Phase.
  ability('ST23-002.on-play-power', def('ST23-002'), 'characters', 'ON_PLAY', [bindAll('leader', { side: 'OWN', zone: 'leader' }), ownPower('leader', 2000, 'UNTIL_END_OF_OPPONENT_NEXT_TURN')],
    { condition: { kind: 'ANY_OF', conditions: [leaderRedHair, { kind: 'LEADER_NAME_IS', name: 'Uta' }] } }),
  // ST23-003 Benn.Beckman: [On Play] You may trash 1 card from your hand: If your Leader has the {Red-Haired Pirates} type, K.O. up
  // to 1 of your opponent's Characters with 4000 base power or less.
  ability('ST23-003.on-play-ko', def('ST23-003'), 'characters', 'ON_PLAY', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE' }, trashFromHand('paid'),
    ...after('paid', koBasePower(4000, leaderRedHair))]),
  // ST23-004 Monkey.D.Luffy: [Activate: Main] You may rest 1 of your DON!! cards and this Character: Give up to 1 of your
  // opponent's Characters −1000 power during this turn.
  ability('ST23-004.activate-main-power', def('ST23-004'), 'characters', 'ACTIVATE_MAIN', minusPower(1000), { cost: { kind: 'SEQUENCE', parts: [{ kind: 'REST_DON', amount: 1 }, { kind: 'REST_SOURCE' }] } }),
  // ST23-005 Yasopp: [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.
  ability('ST23-005.activate-main-don', def('ST23-005'), 'characters', 'ACTIVATE_MAIN', [ownLeaderOrCharacter(1, 'donTarget'), ...giveRestedDon('donTarget')], { usage: { kind: 'ONCE_PER_TURN' } }),
  // OP09-010 Bonk Punch: [On Play] Play up to 1 [Monster] from your hand. [DON!! x1] [When Attacking] This Character gains +2000
  // power during this turn.
  ability('OP09-010.on-play-play', def('OP09-010'), 'characters', 'ON_PLAY', playChosen('target', 'hand', { categories: ['CHARACTER'], nameIs: 'Monster' })),
  ability('OP09-010.when-attacking-power', def('OP09-010'), 'characters', 'WHEN_ATTACKING', [selfPower(2000)], { condition: don1 }),
  // OP09-011 Hongo: [Activate: Main] You may rest this Character: If your Leader has the {Red-Haired Pirates} type, give up to 1 of
  // your opponent's Characters −2000 power during this turn.
  ability('OP09-011.activate-main-power', def('OP09-011'), 'characters', 'ACTIVATE_MAIN', minusPower(2000, leaderRedHair), { cost: { kind: 'REST_SOURCE' } }),
  // OP09-013 Yasopp: [On Play] Up to 1 of your Leader gains +1000 power until the end of your opponent's next turn. [DON!! x1]
  // [When Attacking] Give up to 1 of your opponent's Characters −1000 power during this turn.
  ability('OP09-013.on-play-power', def('OP09-013'), 'characters', 'ON_PLAY', [upTo(1, 'leader', { side: 'OWN', zone: 'leader' }), ownPower('leader', 1000, 'UNTIL_END_OF_OPPONENT_NEXT_TURN')]),
  ability('OP09-013.when-attacking-power', def('OP09-013'), 'characters', 'WHEN_ATTACKING', minusPower(1000), { condition: don1 }),
  // OP09-014 Limejuice: [On Play] Your opponent cannot activate up to 1 [Blocker] Character that has 4000 power or less during
  // this turn (FAQ OP09-014: even if its power later rises).
  ability('OP09-014.on-play-disable-blocker', def('OP09-014'), 'characters', 'ON_PLAY', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', hasBlocker: true, maxPower: 4000 }),
    { kind: 'OPERATION', operation: { primitive: 'disableBlocker', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'target', duration: 'THIS_TURN' } }]),
  // OP09-015 Lucky.Roux: [Blocker]; [On K.O.] If your Leader has the {Red-Haired Pirates} type, K.O. up to 1 of your opponent's
  // Characters with a base power of 6000 or less.
  ability('OP09-015.on-ko-ko', def('OP09-015'), 'characters', 'ON_KO', koBasePower(6000, leaderRedHair)),
  // OP09-020 Come On!! We'll Fight You!!: [Main] Look at 5; reveal up to 1 {Red-Haired Pirates} type card other than this card and
  // add it to your hand; the rest at the bottom in any order. [Trigger] Draw 1 card.
  ability('OP09-020.main-search', def('OP09-020'), 'hand', 'MAIN', [{ kind: 'SEARCH_TOP_DECK', amount: 5, trait: redHair, excludeRulesName: "Come On!! We'll Fight You!!", maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }]),
  ability('OP09-020.trigger-draw', def('OP09-020'), 'temporary', 'TRIGGER', [draw(1)]),
]
export const ST23_OFFICIAL_CONTINUOUS = [
  // ST23-001 Uta: If you have a Character with 10000 power or more, give this card in your hand −4 cost (FAQ ST23-001: current
  // power counts).
  { id: 'ST23-001.hand-cost', definitionId: def('ST23-001'), zone: 'hand' as const, characteristic: 'COST' as const, amount: -4, minimumAttachedDon: 0, whenCharacter: { side: 'OWN' as const, minPower: 10000, powerBasis: 'CURRENT' as const } },
  // ST23-002 Shanks: If your opponent has a Character with 8000 base power or more, give this card in your hand −3 cost (FAQ
  // ST23-002: a base power raised by an effect counts).
  { id: 'ST23-002.hand-cost', definitionId: def('ST23-002'), zone: 'hand' as const, characteristic: 'COST' as const, amount: -3, minimumAttachedDon: 0, whenCharacter: { side: 'OPPONENT' as const, minPower: 8000, powerBasis: 'BASE' as const } },
]
export const ST23_OFFICIAL_REPLACEMENTS = [
  // OP09-012 Monster: If your Character [Bonk Punch] would be K.O.'d by an effect, you may trash this Character instead.
  { id: 'OP09-012.protect-bonk-punch', definitionId: def('OP09-012'), zone: 'characters' as const, match: 'NAMED_ALLY_KO_BY_EFFECT' as const, protectedName: 'Bonk Punch', action: 'TRASH_SELF_INSTEAD' as const },
]
const ids = (number: string) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id),
  ...[...ST23_OFFICIAL_CONTINUOUS, ...ST23_OFFICIAL_REPLACEMENTS].filter(e => e.definitionId === def(number)).map(e => e.id)]
export const ST23_OFFICIAL_CARDS: CardInput[] = [
  ...['OP09-001', 'ST23-002', 'ST23-003', 'ST23-004', 'ST23-005', 'OP09-010', 'OP09-011', 'OP09-012', 'OP09-013', 'OP09-014', 'OP09-020'].map(n => officialCard(L, n, { abilityIds: ids(n) })),
  officialCard(L, 'ST23-001', { blocker: true, abilityIds: ids('ST23-001') }),
  officialCard(L, 'OP09-015', { blocker: true, abilityIds: ids('OP09-015') }),
]
export const ST23_OFFICIAL_ABILITY_DEFINITIONS = abilities
