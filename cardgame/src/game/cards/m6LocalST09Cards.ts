import rows from '../../../carteJson/ST-09/cards-ST-09.json'
import type { CardInput } from './types'
import type { EffectDefinition, EffectRegistry } from '../effects/contracts'
import { localCard, type LocalProfile, type LocalRow } from './localCards'
import { ability, after, deckTopToLife, ko, lifeToHand, playChosen, power, powerUntilNextTurn, rest, trashFromHand, upTo } from './dsl'

// M6 ST-09 (Yamato, yellow). Card text comes from local cardJson; the cached ST-09 FAQ and errata snapshot are in
// docs/game/evidence/m6/sources/. No runtime branch depends on a card number.
// ST09-003, ST09-006, ST09-011 and ST09-013 (no ability) are the M5 recognised definitions. ST09-010 Portgas.D.Ace is
// NOT integrated: its "If this Character would be K.O.'d ... instead" replacement needs a battle K.O. replacement choice.
const revision = 'm6-cardjson-2026-10-13', reviewedAt = '2026-10-13'
const def = (number: string) => `${number}@${revision}`
function card(number: string, profile: LocalProfile): CardInput {
  const row = (rows as LocalRow[]).find(item => item.code === number)
  if (!row) throw new Error(`LOCAL_CARD_MISSING:${number}`)
  return localCard(row, 'ST-09', 'cardgame/carteJson/ST-09/cards-ST-09.json', revision,
    'https://en.onepiece-cardgame.com/pdf/qa_st-09.pdf', reviewedAt, profile)
}
type Step = EffectDefinition['program'][number]
const don1 = { kind: 'SOURCE_ATTACHED_DON_AT_LEAST' as const, minimum: 1 }
const lifeAtMost2 = { kind: 'LIFE_AT_MOST' as const, player: 'CONTROLLER' as const, maximum: 2 }
const triggerToHand: Step = { kind: 'OPERATION', operation: { primitive: 'triggerCardToHand', version: '1.0.0', audience: 'CONTROLLER' } }
/** "You may trash 2 cards from your hand: Add up to 1 card from the top of your deck to the top of your Life cards." */
const trashTwoThenDeckToLife = (): Step[] => [
  { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 2, bind: 'discard', visibility: 'PRIVATE', allOrNone: true, whenCondition: { kind: 'HAND_AT_LEAST', player: 'CONTROLLER', minimum: 2 } },
  trashFromHand('discard', 'discard'), ...deckTopToLife('deckTop', 'discard')]

const abilities: EffectDefinition[] = [
  // ST09-002 Uzuki Tempura: [Trigger] rest up to 1 opposing Character cost 2 or less and add this card to your hand (FAQ: mandatory).
  ability('ST09-002.trigger-rest-to-hand', def('ST09-002'), 'temporary', 'TRIGGER', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 2 }), rest('target'), triggerToHand]),
  // ST09-005 Kouzuki Oden: [On K.O.] You may trash 2 cards from your hand: add up to 1 top deck card to the top of your Life.
  ability('ST09-005.on-ko-life', def('ST09-005'), 'characters', 'ON_KO', trashTwoThenDeckToLife()),
  // ST09-007 Shinobu: [Blocker]; [On Block] You may add 1 top/bottom Life card to your hand: +4000 during this battle.
  ability('ST09-007.on-block-power', def('ST09-007'), 'characters', 'ON_BLOCK', [...lifeToHand(), ...after('lifeCost', [{ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', amount: 4000, duration: 'THIS_BATTLE' } }])]),
  // ST09-008 Shimotsuki Ushimaru: [DON!! x1] [When Attacking] You may add 1 top/bottom Life card to your hand: play up to 1
  // yellow {Land of Wano} Character card cost 4 or less from your hand (the card just added included, FAQ ST09-008).
  ability('ST09-008.when-attacking-play', def('ST09-008'), 'characters', 'WHEN_ATTACKING', [...lifeToHand(),
    ...playChosen('target', 'hand', { categories: ['CHARACTER'], maxCost: 4, colorsAny: ['YELLOW'], traitsAny: ['Land of Wano'] }, { whenBindingNonempty: 'lifeCost' })], { condition: don1 }),
  // ST09-009 Fugetsu Omusubi: [Trigger] K.O. up to 1 opposing Character cost 1 or less and add this card to your hand (mandatory).
  ability('ST09-009.trigger-ko-to-hand', def('ST09-009'), 'temporary', 'TRIGGER', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 1 }), ko('target'), triggerToHand]),
  // ST09-012 Yamato: [When Attacking] You may add 1 top/bottom Life card to your hand: +2000 until the start of your next turn.
  ability('ST09-012.when-attacking-power', def('ST09-012'), 'characters', 'WHEN_ATTACKING', [...lifeToHand(), powerUntilNextTurn(2000, undefined, 'lifeCost')]),
  // ST09-014 Narikabura Arrow: [Counter] with 2 or less Life, up to 1 opposing Leader or Character -3000 this turn.
  // [Trigger] You may trash 2 cards from your hand: add up to 1 top deck card to the top of your Life.
  ability('ST09-014.counter', def('ST09-014'), 'hand', 'COUNTER', [{ ...upTo(1, 'target', { side: 'OPPONENT', zone: 'leaderOrCharacters' }), whenCondition: lifeAtMost2 } as Step,
    { kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'target', amount: -3000, duration: 'THIS_TURN' } }]),
  ability('ST09-014.trigger-life', def('ST09-014'), 'temporary', 'TRIGGER', trashTwoThenDeckToLife()),
  // ST09-015 Thunder Bagua: [Counter] up to 1 own Leader/Character +4000 this battle; then with 2 or less Life, up to 1 opposing
  // Character cost 3 or less to the top or bottom of its owner's Life face-up. [Trigger] Draw 1 card.
  ability('ST09-015.counter', def('ST09-015'), 'hand', 'COUNTER', [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_LEADER_OR_CHARACTER' }, optional: true, min: 0, max: 1, bind: 'target', visibility: 'PUBLIC' },
    power('target', 4000, 'THIS_BATTLE'),
    { ...upTo(1, 'foe', { side: 'OPPONENT', zone: 'characters', maxCost: 3 }), whenCondition: lifeAtMost2 } as Step,
    { kind: 'MODE', modes: 2, bind: 'foe.place', whenBindingNonempty: 'foe' },
    { kind: 'OPERATION', operation: { primitive: 'addToLife', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'foe', from: 'characters', faceUp: true, side: 'OPPONENT', bottomBinding: 'foe.place.1' } }]),
  ability('ST09-015.trigger-draw', def('ST09-015'), 'temporary', 'TRIGGER', [{ kind: 'OPERATION', operation: { primitive: 'drawCards', version: '1.0.0', player: 'CONTROLLER', audience: 'CONTROLLER', amount: 1 } }]),
]
type Continuous = NonNullable<EffectRegistry['continuous']>[number]
type KoProtection = NonNullable<EffectRegistry['koProtections']>[number]
type ConditionalKeyword = NonNullable<EffectRegistry['conditionalKeywords']>[number]
const continuous: Continuous[] = [
  // ST09-001 Leader Yamato: [DON!! x1] [Opponent's Turn] with 2 or less Life, +1000 (checked continuously, FAQ ST09-001).
  { id: 'ST09-001.opponent-turn-power', definitionId: def('ST09-001'), zone: 'leader', characteristic: 'POWER', amount: 1000, minimumAttachedDon: 1, duringOpponentTurn: true, maximumOwnLife: 2 },
]
const koProtections: KoProtection[] = [
  // ST09-004 Kaido: [DON!! x1] with 2 or less Life, cannot be K.O.'d in battle.
  { id: 'ST09-004.no-battle-ko', definitionId: def('ST09-004'), zone: 'characters', from: 'BATTLE', minimumAttachedDon: 1, maximumOwnLife: 2 },
]
const conditionalKeywords: ConditionalKeyword[] = [
  // ST09-005 Kouzuki Oden: [DON!! x1] [Double Attack].
  { id: 'ST09-005.double-attack', definitionId: def('ST09-005'), zone: 'characters', keyword: 'DOUBLE_ATTACK', minimumAttachedDon: 1 },
]
// ST09-010 Portgas.D.Ace: [Once Per Turn] If this Character would be K.O.'d, you may trash 1 card from the top or bottom of your Life
// cards instead (in battle and by effects; FAQ ST09-010: not with 0 Life). Generic GUARD replacement.
const cardReplacements = [{ id: 'ST09-010.guard-life', definitionId: def('ST09-010'), zone: 'characters' as const, match: 'GUARD' as const, event: 'KO' as const, cause: 'ANY' as const,
  protects: { self: true as const }, action: 'TRASH_LIFE_TOP_OR_BOTTOM' as const, usage: 'ONCE_PER_TURN' as const }]
const ids = (number: string) => [...abilities.filter(a => a.source.kind === 'CARD_DEFINITION' && a.source.definitionId === def(number)).map(a => a.id),
  ...continuous.filter(k => k.definitionId === def(number)).map(k => k.id), ...koProtections.filter(k => k.definitionId === def(number)).map(k => k.id),
  ...conditionalKeywords.filter(k => k.definitionId === def(number)).map(k => k.id), ...cardReplacements.filter(k => k.definitionId === def(number)).map(k => k.id)]

export const ST09_LOCAL_CARDS: CardInput[] = [
  card('ST09-001', { abilityIds: ids('ST09-001') }), card('ST09-002', { abilityIds: ids('ST09-002') }), card('ST09-004', { abilityIds: ids('ST09-004') }),
  card('ST09-005', { abilityIds: ids('ST09-005') }), card('ST09-007', { blocker: true, abilityIds: ids('ST09-007') }), card('ST09-008', { abilityIds: ids('ST09-008') }),
  card('ST09-009', { abilityIds: ids('ST09-009') }), card('ST09-010', { abilityIds: ids('ST09-010') }), card('ST09-012', { abilityIds: ids('ST09-012') }),
  card('ST09-014', { abilityIds: ids('ST09-014'), counterEvent: { abilityId: 'ST09-014.counter' } }),
  card('ST09-015', { abilityIds: ids('ST09-015'), counterEvent: { abilityId: 'ST09-015.counter' } }),
]
export const ST09_LOCAL_ABILITY_DEFINITIONS = abilities
export const ST09_LOCAL_CONTINUOUS = continuous
export const ST09_KO_PROTECTIONS = koProtections
export const ST09_CONDITIONAL_KEYWORDS = conditionalKeywords
export const ST09_CARD_REPLACEMENTS = cardReplacements
