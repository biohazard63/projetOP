import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { after, ability, bindAll, check, draw, drawThenTrash, ko, ownLeaderOrCharacter, playChosen, power, rest, setActive, upTo } from './dsl'

// M6 ST-32 (GREEN Roronoa Zoro) and its OP10/OP12/OP15/ST24 reprints. Texts are the official English card list (series 569032)
// archived with the ST-32 snapshot (the <Slash> attribute icons are read from the archived HTML); the ST-32 FAQ, the OP-12 FAQ
// (OP12-020, OP12-027, OP12-028), the ST-23-28 FAQ (ST24-005), the "cannot be rested" FAQ (EB02-011, OP11-034), the OP-09 FAQ
// (OP09-022) and the Comprehensive Rules 1.2.1 §8-3-1 are in docs/game/evidence/m6/sources/. No runtime branch depends on a card
// number.
type Step = EffectDefinition['program'][number]
const L = 'ST-32'
const once = { kind: 'ONCE_PER_TURN' as const }
const slashLeader = { kind: 'LEADER_HAS_ATTRIBUTE' as const, attribute: 'SLASH' as const }
/** "Give up to N rested DON!! cards to your [Roronoa Zoro] Leader". */
const donToZoroLeader = (n: number): Step[] => [bindAll('zoro', { side: 'OWN', zone: 'leader', nameIs: 'Roronoa Zoro' }),
  upTo(n, 'restedDon', { side: 'OWN', zone: 'cost', rested: true }, { whenBindingNonempty: 'zoro' }),
  { kind: 'OPERATION', operation: { primitive: 'attachRestedDon', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'restedDon', targetBinding: 'zoro' }, whenBindingNonempty: 'zoro' }]
const restOpposing = (n: number, maxCost: number, basis?: 'BASE'): Step[] => [upTo(n, 'target', { side: 'OPPONENT', zone: 'characters', maxCost, ...(basis ? { costBasis: basis } : {}) }), rest('target')]
const ryuma = (): Step[] => [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', rested: true, maxCost: 4 }), ko('target')]

const abilities: EffectDefinition[] = [
  // OP12-020 Leader Roronoa Zoro: [DON!! x3] [Activate: Main] [Once Per Turn] If this Leader battles your opponent's Character during
  // this turn, set this Leader as active. Then, this Leader cannot attack your opponent's Characters with a base cost of 7 or less
  // during this turn (FAQ OP12-020: a blocking Character counts, a blocking Leader does not; the DON!! may be given after the battle).
  ability('OP12-020.activate-main-active', def('OP12-020'), 'leader', 'ACTIVATE_MAIN', [check('battled', { kind: 'SOURCE_BATTLED_OPPONENT_CHARACTER_THIS_TURN' }),
    ...after('battled', [setActive(), { kind: 'OPERATION', operation: { primitive: 'limitAttackTargets', version: '1.0.0', audience: 'PUBLIC', maxBaseCost: 7, duration: 'THIS_TURN' } }])],
    { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 3 }, usage: once }),
  // OP10-036 Perona: [Your Turn] [Once Per Turn] If a Character is rested by your effect, set up to 1 of your DON!! cards as active
  // (FAQ OP09-022: a Character played rested is not rested by an effect; FAQ OP07-031, same wording: a Character rested to pay an
  // activation cost is; CR 1.2.1 §8-3-1).
  ability('OP10-036.rested-by-effect-don', def('OP10-036'), 'characters', 'ON_CHARACTER_RESTED_BY_OWN_EFFECT', [upTo(1, 'don', { side: 'OWN', zone: 'cost', rested: true }), setActive('don')],
    { condition: { kind: 'YOUR_TURN' }, usage: once }),
  // OP12-026 Kuina: [Activate: Main] You may rest this Character: Rest up to 1 of your opponent's Characters with a base cost of 4 or
  // less. Then, give up to 3 rested DON!! cards to your [Roronoa Zoro] Leader.
  ability('OP12-026.activate-main-rest', def('OP12-026'), 'characters', 'ACTIVATE_MAIN', [...restOpposing(1, 4, 'BASE'), ...donToZoroLeader(3)], { cost: { kind: 'REST_SOURCE' } }),
  // OP12-028 Kouzuki Hiyori: [Activate: Main] You may rest 1 of your DON!! cards and this Character: If your Leader is [Roronoa Zoro],
  // look at 5; reveal up to 1 <Slash> attribute card or green Event and add it to your hand. Then, the rest at the bottom in any order
  // (FAQ OP12-028: a non-green <Slash> card too).
  ability('OP12-028.activate-main-search', def('OP12-028'), 'characters', 'ACTIVATE_MAIN', [check('zoro', { kind: 'LEADER_NAME_IS', name: 'Roronoa Zoro' }),
    { kind: 'SEARCH_TOP_DECK', amount: 5, attributesAny: ['SLASH'], eventColorsAny: ['GREEN'], maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER', whenBindingNonempty: 'zoro' }],
    { cost: { kind: 'SEQUENCE', parts: [{ kind: 'REST_DON', amount: 1 }, { kind: 'REST_SOURCE' }] } }),
  // OP12-031 Tashigi: [On Play] Rest up to 1 of your opponent's Characters with a base cost of 6 or less. Then, give up to 3 rested
  // DON!! cards to your [Roronoa Zoro] Leader.
  ability('OP12-031.on-play-rest', def('OP12-031'), 'characters', 'ON_PLAY', [...restOpposing(1, 6, 'BASE'), ...donToZoroLeader(3)]),
  // OP12-039 Luffy Is the Man Who Will Become the King of Pirates!!!: [Main] Set your [Roronoa Zoro] Leader as active. [Trigger] Up
  // to 1 of your Leader or Character cards gains +1000 power during this turn.
  ability('OP12-039.main-active', def('OP12-039'), 'hand', 'MAIN', [bindAll('zoro', { side: 'OWN', zone: 'leader', nameIs: 'Roronoa Zoro' }), setActive('zoro')]),
  ability('OP12-039.trigger-power', def('OP12-039'), 'temporary', 'TRIGGER', [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 1000, 'THIS_TURN')]),
  // OP15-036 Ryuma: [On Play]/[When Attacking] K.O. up to 1 of your opponent's rested Characters with a cost of 4 or less.
  ability('OP15-036.on-play-ko', def('OP15-036'), 'characters', 'ON_PLAY', ryuma()),
  ability('OP15-036.when-attacking-ko', def('OP15-036'), 'characters', 'WHEN_ATTACKING', ryuma()),
  // ST24-005 X.Drake: [On Play] If your Leader has the {Supernovas} type, rest up to 1 of your opponent's Characters with a cost of 5
  // or less. Then, set up to 1 of your DON!! cards as active at the end of this turn (FAQ ST24-005: after all [End of Your Turn]
  // effects; FAQ EB03-017/OP14-112: the "Then," part follows the Leader condition).
  ability('ST24-005.on-play-rest', def('ST24-005'), 'characters', 'ON_PLAY', [check('sn', { kind: 'LEADER_HAS_TRAIT', trait: 'Supernovas' }), ...after('sn', [...restOpposing(1, 5),
    { kind: 'OPERATION', operation: { primitive: 'scheduleEndOfTurn', version: '1.0.0', audience: 'PUBLIC', definitionId: 'ST24-005.end-of-turn-delayed' } }])]),
  ability('ST24-005.end-of-turn-delayed', def('ST24-005'), 'delayed', 'END_OF_YOUR_TURN', [upTo(1, 'don', { side: 'OWN', zone: 'cost', rested: true }), setActive('don')]),
  // ST32-001 Kin'emon: [On Play] You may rest your <Slash> attribute Leader or 1 of your DON!! cards: Draw 2 cards and trash 1 card from
  // your hand.
  ability('ST32-001.on-play-draw', def('ST32-001'), 'characters', 'ON_PLAY', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'leader', attributesAny: ['SLASH'], rested: false }, optional: true, min: 0, max: 1, bind: 'leaderPaid', visibility: 'PUBLIC' },
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'cost', rested: false }, optional: true, min: 0, max: 1, bind: 'donPaid', visibility: 'PUBLIC', whenBindingEmpty: 'leaderPaid' },
    { kind: 'UNION', bind: 'paid', from: ['leaderPaid', 'donPaid'] }, rest('paid'), ...after('paid', drawThenTrash(2, 1))]),
  // ST32-002 Kouzuki Oden: [On Play] Draw 1 card and up to 1 of your opponent's Characters with a base cost of 6 or less cannot be
  // rested until the end of your opponent's next End Phase (FAQ EB02-011/OP11-034: it cannot attack nor activate [Blocker]).
  ability('ST32-002.on-play-prevent-rest', def('ST32-002'), 'characters', 'ON_PLAY', [draw(1), upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 6, costBasis: 'BASE' }),
    { kind: 'OPERATION', operation: { primitive: 'preventRest', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'target', duration: 'UNTIL_END_OF_OPPONENT_NEXT_TURN' } }]),
  // ST32-003 Dracule Mihawk: [Your Turn] When this Character becomes rested, draw 1 card and trash 1 card from your hand. [On Play] If
  // your Leader has the <Slash> attribute, play up to 1 Character card with a cost of 5 or less that is either [Perona] or has the
  // <Slash> attribute from your hand (FAQ ST32-003).
  ability('ST32-003.rested-draw', def('ST32-003'), 'characters', 'ON_SOURCE_RESTED', drawThenTrash(1, 1), { condition: { kind: 'YOUR_TURN' } }),
  ability('ST32-003.on-play-play', def('ST32-003'), 'characters', 'ON_PLAY', playChosen('play', 'hand', { categories: ['CHARACTER'], maxCost: 5, attributesAny: ['SLASH'], orNamesAny: ['Perona'] }), { condition: slashLeader }),
  // ST32-004 Silvers Rayleigh: [Rush: Character] with a <Slash> Leader (below); [On Play] Rest up to 2 of your opponent's Characters
  // with a cost of 2 or less.
  ability('ST32-004.on-play-rest', def('ST32-004'), 'characters', 'ON_PLAY', restOpposing(2, 2)),
  // ST32-005 Roronoa Zoro: [Rush: Character]; [On Play] If your Leader has the <Slash> attribute, rest up to 1 of your opponent's
  // Characters with a cost of 2 or less (FAQ ST32-005: not on the first turn).
  ability('ST32-005.on-play-rest', def('ST32-005'), 'characters', 'ON_PLAY', restOpposing(1, 2), { condition: slashLeader }),
]
export const ST32_OFFICIAL_CONDITIONAL_KEYWORDS = [
  { id: 'ST32-004.conditional-rush-character', definitionId: def('ST32-004'), zone: 'characters' as const, keyword: 'RUSH_CHARACTER' as const, minimumAttachedDon: 0, leaderHasAttribute: 'SLASH' as const },
]
// OP12-027 Koushirou: If your <Slash> attribute Character with a cost of 5 or less other than this Character would be K.O.'d by your
// opponent's effect, you may rest this Character instead (FAQ OP12-027: two copies may each protect one).
export const ST32_OFFICIAL_REPLACEMENTS = [{ id: 'OP12-027.guard-rest', definitionId: def('OP12-027'), zone: 'characters' as const, match: 'GUARD' as const, event: 'KO' as const, cause: 'OPPONENT_EFFECT' as const,
  protects: { others: true as const, attributesAny: ['SLASH' as const], maxCost: 5 }, action: 'REST_SOURCE' as const, usage: 'UNLIMITED' as const }]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST32_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'OP12-020', { abilityIds: ids('OP12-020') }),
  officialCard(L, 'OP10-036', { abilityIds: ids('OP10-036') }),
  officialCard(L, 'OP12-026', { abilityIds: ids('OP12-026') }),
  officialCard(L, 'OP12-027', { blocker: true, abilityIds: ['OP12-027.guard-rest'] }),
  officialCard(L, 'OP12-028', { abilityIds: ids('OP12-028') }),
  officialCard(L, 'OP12-031', { abilityIds: ids('OP12-031') }),
  officialCard(L, 'OP12-039', { abilityIds: ids('OP12-039') }),
  officialCard(L, 'OP15-036', { abilityIds: ids('OP15-036') }),
  officialCard(L, 'ST24-005', { abilityIds: ids('ST24-005') }),
  officialCard(L, 'ST32-001', { abilityIds: ids('ST32-001') }),
  officialCard(L, 'ST32-002', { abilityIds: ids('ST32-002') }),
  officialCard(L, 'ST32-003', { abilityIds: ids('ST32-003') }),
  officialCard(L, 'ST32-004', { abilityIds: ids('ST32-004', ['ST32-004.conditional-rush-character']) }),
  officialCard(L, 'ST32-005', { keywords: ['RUSH_CHARACTER'], abilityIds: ids('ST32-005') }),
]
export const ST32_OFFICIAL_ABILITY_DEFINITIONS = abilities
