import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { ability, addCost, after, draw, ko, ownLeaderOrCharacter, playThisCardSteps, trashFromHand, upTo, giveRestedDon } from './dsl'

// M6 ST-19 (Black Smoker). Texts are the official English card list (series 569019) archived with the ST-19 snapshot; the
// OP-02/OP-03 and ST-15-20 FAQ (ST19-003/004/005, OP02-093/113, OP03-089) and the errata snapshot are in
// docs/game/evidence/m6/sources/. OP02-108 ([Blocker] only), OP02-109 and OP02-116 (no ability) are the M5 definitions.
type Step = EffectDefinition['program'][number]
const L = 'ST-19'
const blackNavy = { colorsAny: ['BLACK' as const], traitsAny: ['Navy'] }
const oppChar = (maxCost?: number) => ({ side: 'OPPONENT' as const, zone: 'characters' as const, ...(maxCost === undefined ? {} : { maxCost }) })
const minusCost = (amount: number): Step[] => [upTo(1, 'target', oppChar()), addCost('target', -amount)]
const costZeroExists = { kind: 'FIELD_CHARACTER_COST_AT_MOST' as const, maximum: 0 }
const selfPower = (amount: number, duration: 'THIS_TURN' | 'THIS_BATTLE'): Step => ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', amount, duration }, whenCondition: costZeroExists })
const handCost = (n: number, filter: object = {}): Step => ({ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand', ...filter }, optional: true, min: 0, max: n, bind: 'paid', visibility: 'PRIVATE', allOrNone: true })
const trashToDeckBottom = (): Step[] => [upTo(1, 'paid', { side: 'OWN', zone: 'trash' }),
  { kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'CONTROLLER', audience: 'CONTROLLER', subjectBinding: 'paid', from: 'trash', to: 'deck' } }]
const once = { kind: 'ONCE_PER_TURN' as const }

const abilities: EffectDefinition[] = [
  // OP02-093 Leader: [DON!! x1] [Activate: Main] [Once Per Turn] Give up to 1 opposing Character −1 cost during this turn. Then, if
  // there is a Character with a cost of 0, this Leader gains +1000 power during this turn (FAQ OP02-093: any Character; not per
  // Character).
  ability('OP02-093.activate-main-cost', def('OP02-093'), 'leader', 'ACTIVATE_MAIN', [...minusCost(1), selfPower(1000, 'THIS_TURN')],
    { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 1 }, usage: once }),
  // ST19-001 Smoker: [On Play] You may trash 1 black {Navy} type card from your hand: Up to 2 opposing Characters with a cost of 4
  // or less cannot attack until the end of your opponent's next turn.
  ability('ST19-001.on-play-prevent-attack', def('ST19-001'), 'characters', 'ON_PLAY', [handCost(1, blackNavy), trashFromHand('paid'),
    ...after('paid', [upTo(2, 'target', oppChar(4)), { kind: 'OPERATION', operation: { primitive: 'preventAttack', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'target', duration: 'UNTIL_END_OF_OPPONENT_NEXT_TURN' } }])]),
  // ST19-002 Sengoku: [On Play] You may trash 2 black {Navy} type cards from your hand: If your Leader has the {Navy} type, draw 3.
  ability('ST19-002.on-play-draw', def('ST19-002'), 'characters', 'ON_PLAY', [handCost(2, blackNavy), trashFromHand('paid'),
    { ...draw(3), whenBindingNonempty: 'paid', whenCondition: { kind: 'LEADER_HAS_TRAIT', trait: 'Navy' } } as Step]),
  // ST19-003 Tashigi: [On Play] If your Leader is [Smoker], give up to 1 opposing Character −4 cost during this turn.
  // [Activate: Main] [Once Per Turn] If this Character was played on this turn, trash up to 1 opposing Character with a cost of 0
  // (FAQ ST19-003: not a K.O.; usable with any Leader).
  ability('ST19-003.on-play-cost', def('ST19-003'), 'characters', 'ON_PLAY', minusCost(4), { condition: { kind: 'LEADER_NAME_IS', name: 'Smoker' } }),
  ability('ST19-003.activate-main-trash', def('ST19-003'), 'characters', 'ACTIVATE_MAIN', [upTo(1, 'target', oppChar(0)),
    { kind: 'OPERATION', operation: { primitive: 'trashCharacter', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'target' } }], { condition: { kind: 'SOURCE_PLAYED_THIS_TURN' }, usage: once }),
  // ST19-004 Hina: [Activate: Main] [Once Per Turn] You may place 1 card from your trash at the bottom of your deck: Give up to 1
  // rested DON!! card to your Leader or 1 of your Characters (FAQ ST19-004: not with an empty trash).
  ability('ST19-004.activate-main-don', def('ST19-004'), 'characters', 'ACTIVATE_MAIN', [...trashToDeckBottom(), ...after('paid', [ownLeaderOrCharacter(1, 'donTarget'), ...giveRestedDon('donTarget')])],
    { condition: { kind: 'TRASH_AT_LEAST', minimum: 1 }, usage: once }),
  // ST19-005 Monkey.D.Garp: [Blocker]; [Activate: Main] [Once Per Turn] You may place 1 card from your trash at the bottom of your
  // deck: Give up to 1 opposing Character −1 cost during this turn (FAQ ST19-005: not with an empty trash).
  ability('ST19-005.activate-main-cost', def('ST19-005'), 'characters', 'ACTIVATE_MAIN', [...trashToDeckBottom(), ...after('paid', minusCost(1))],
    { condition: { kind: 'TRASH_AT_LEAST', minimum: 1 }, usage: once }),
  // OP02-098 Koby: [On Play] You may trash 1 card from your hand: K.O. up to 1 opposing Character with a cost of 3 or less.
  ability('OP02-098.on-play-ko', def('OP02-098'), 'characters', 'ON_PLAY', [handCost(1), trashFromHand('paid'), ...after('paid', [upTo(1, 'target', oppChar(3)), ko('target')])]),
  // OP02-106 Tsuru: [On Play] Give up to 1 opposing Character −2 cost during this turn.
  ability('OP02-106.on-play-cost', def('OP02-106'), 'characters', 'ON_PLAY', minusCost(2)),
  // OP02-113 Helmeppo: [When Attacking] up to 1 opposing Character −2 cost this turn. Then, if there is a Character with a cost of
  // 0, this Character gains +2000 power during this battle (FAQ OP02-113). [Trigger] Play this card.
  ability('OP02-113.when-attacking-cost', def('OP02-113'), 'characters', 'WHEN_ATTACKING', [...minusCost(2), selfPower(2000, 'THIS_BATTLE')]),
  ability('OP02-113.trigger-play', def('OP02-113'), 'temporary', 'TRIGGER', playThisCardSteps()),
  // OP03-089 Brannew: [On Play] Look at 3; reveal up to 1 {Navy} type card other than [Brannew] and add it to your hand. Then,
  // trash the rest (FAQ OP03-089: exactly {Navy}).
  ability('OP03-089.on-play-search', def('OP03-089'), 'characters', 'ON_PLAY', [{ kind: 'SEARCH_TOP_DECK', amount: 3, trait: 'Navy', excludeRulesName: 'Brannew', maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'TRASH' }]),
  // OP02-117 Ice Age: [Main] up to 1 opposing Character −5 cost this turn. [Trigger] K.O. up to 1 opposing Character cost 3 or less.
  ability('OP02-117.main-cost', def('OP02-117'), 'hand', 'MAIN', minusCost(5)),
  ability('OP02-117.trigger-ko', def('OP02-117'), 'temporary', 'TRIGGER', [upTo(1, 'target', oppChar(3)), ko('target')]),
]
export const ST19_OFFICIAL_CONTINUOUS = [
  // ST19-004 Hina: [DON!! x1] [Opponent's Turn] This Character gains +4 cost.
  { id: 'ST19-004.opponent-turn-cost', definitionId: def('ST19-004'), zone: 'characters' as const, characteristic: 'COST' as const, amount: 4, minimumAttachedDon: 1, duringOpponentTurn: true as const },
]
export const ST19_OFFICIAL_KO_PROTECTIONS = [
  // OP03-079 Vergo: [DON!! x1] This Character cannot be K.O.'d in battle.
  { id: 'OP03-079.no-battle-ko', definitionId: def('OP03-079'), zone: 'characters' as const, from: 'BATTLE' as const, minimumAttachedDon: 1 },
]
const ids = (number: string) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id),
  ...[...ST19_OFFICIAL_CONTINUOUS, ...ST19_OFFICIAL_KO_PROTECTIONS].filter(e => e.definitionId === def(number)).map(e => e.id)]
export const ST19_OFFICIAL_CARDS: CardInput[] = [
  ...['OP02-093', 'ST19-001', 'ST19-002', 'ST19-003', 'ST19-004', 'OP02-098', 'OP02-106', 'OP02-113', 'OP03-079', 'OP03-089', 'OP02-117'].map(n => officialCard(L, n, { abilityIds: ids(n) })),
  officialCard(L, 'ST19-005', { blocker: true, abilityIds: ids('ST19-005') }),
]
export const ST19_OFFICIAL_ABILITY_DEFINITIONS = abilities
