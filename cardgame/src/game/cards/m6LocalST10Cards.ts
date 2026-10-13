import rows from '../../../carteJson/ST-10/cards-ST-10.json'
import type { CardInput } from './types'
import type { EffectDefinition, EffectRegistry } from '../effects/contracts'
import { localCard, type LocalProfile, type LocalRow } from './localCards'
import { ability, addDon, after, donMinus, drawThenTrash, grantRush, ko, ownLeaderOrCharacter, playChosen, power, powerSelf, powerUntilNextTurn, rest, toDeckBottom, upTo } from './dsl'

// M6 ST-10 (the Three Captains, red/purple): its ST10 numbers. Card text comes from local cardJson; the cached ST-10 FAQ and
// errata snapshot are in docs/game/evidence/m6/sources/. The OP01 reprints of the product are separate numbers.
const revision = 'm6-cardjson-2026-10-13', reviewedAt = '2026-10-13'
const def = (number: string) => `${number}@${revision}`
function card(number: string, profile: LocalProfile): CardInput {
  const row = (rows as LocalRow[]).find(item => item.code === number)
  if (!row) throw new Error(`LOCAL_CARD_MISSING:${number}`)
  return localCard(row, 'ST-10', 'cardgame/carteJson/ST-10/cards-ST-10.json', revision,
    'https://en.onepiece-cardgame.com/pdf/qa_st-10.pdf', reviewedAt, profile)
}
type Step = EffectDefinition['program'][number]
const once = { usage: { kind: 'ONCE_PER_TURN' as const } }
const opponentPower = (amount: number, bind = 'target'): Step => ({ kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: bind, amount, duration: 'THIS_TURN' } })
const leaderUntil = (amount: number, duration: 'UNTIL_START_OF_YOUR_NEXT_TURN' | 'UNTIL_END_OF_YOUR_NEXT_TURN'): Step[] => [upTo(1, 'leader', { side: 'OWN', zone: 'leader' }),
  { kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'leader', amount, duration } }]
const kidProgram = (): Step[] => [...donMinus(1), ...after('donMinus', [upTo(1, 'leader', { side: 'OWN', zone: 'leader' }), powerUntilNextTurn(1000, 'leader')])]

const abilities: EffectDefinition[] = [
  // ST10-001 Leader Law: [Activate: Main] [Once Per Turn] DON!! −3: place up to 1 opposing Character with 3000 power or less at the
  // bottom of its owner's deck, and play up to 1 Character card cost 4 or less from your hand (each part alone, FAQ ST10-001).
  ability('ST10-001.activate-main', def('ST10-001'), 'leader', 'ACTIVATE_MAIN', [upTo(1, 'bottom', { side: 'OPPONENT', zone: 'characters', maxPower: 3000 }), toDeckBottom('bottom'),
    ...playChosen('play', 'hand', { categories: ['CHARACTER'], maxCost: 4 })], { cost: { kind: 'DON_MINUS', amount: 3 }, ...once }),
  // ST10-002 Leader Luffy: [Activate: Main] [Once Per Turn] with 0 DON!! on your field (cost area and given, FAQ) or 8 or more,
  // add up to 1 DON!! card from your DON!! deck and set it as active.
  ability('ST10-002.activate-main-don', def('ST10-002'), 'leader', 'ACTIVATE_MAIN', [addDon(false)],
    { condition: { kind: 'ANY_OF', conditions: [{ kind: 'FIELD_DON_AT_MOST', maximum: 0 }, { kind: 'FIELD_DON_AT_LEAST', minimum: 8 }] }, ...once }),
  // ST10-003 Leader Kid: [When Attacking] DON!! −1: this Leader +2000 this turn ([Your Turn] -1000 with 4+ Life is continuous).
  ability('ST10-003.when-attacking-power', def('ST10-003'), 'leader', 'WHEN_ATTACKING', [...donMinus(1), ...after('donMinus', [powerSelf(2000)])]),
  // ST10-004 Sanji: [On Play] if the opponent has a Character with 5000 power or more, [Rush] this turn (kept, FAQ ST10-004).
  ability('ST10-004.on-play-rush', def('ST10-004'), 'characters', 'ON_PLAY', [grantRush()], { condition: { kind: 'OPPONENT_CHARACTER_POWER_AT_LEAST', minimum: 5000, powerBasis: 'CURRENT' } }),
  // ST10-005 Jinbe: [DON!! x1] [When Attacking] up to 1 opposing Character -2000 this turn.
  ability('ST10-005.when-attacking-power', def('ST10-005'), 'characters', 'WHEN_ATTACKING', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), opponentPower(-2000)],
    { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 1 } }),
  // ST10-006 Luffy: [Rush]; [Once Per Turn] when your opponent activates a [Blocker], K.O. up to 1 opposing Character with 8000
  // power or less (any of them, FAQ ST10-006; K.O.ing the blocker ends the battle before the Counter Step).
  ability('ST10-006.opponent-blocker-ko', def('ST10-006'), 'characters', 'ON_OPPONENT_BLOCKER', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxPower: 8000 }), ko('target')], once),
  // ST10-007 Killer: [Your Turn] [Once Per Turn] when a DON!! of your field returns to your DON!! deck (any cause, FAQ), K.O. up
  // to 1 opposing rested Character cost 3 or less.
  ability('ST10-007.don-returned-ko', def('ST10-007'), 'characters', 'ON_DON_RETURNED', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 3, rested: true }), ko('target')],
    { condition: { kind: 'YOUR_TURN' }, ...once }),
  // ST10-008 Shachi & Penguin: [On Play] with 3 or less DON!! on your field, add up to 2 DON!! cards and rest them.
  ability('ST10-008.on-play-don', def('ST10-008'), 'characters', 'ON_PLAY', [addDon(true), addDon(true)], { condition: { kind: 'FIELD_DON_AT_MOST', maximum: 3 } }),
  // ST10-009 Jean Bart: [On Play] ① (you may rest 1 DON!!): add up to 1 DON!! card and set it as active.
  ability('ST10-009.on-play-don', def('ST10-009'), 'characters', 'ON_PLAY', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'cost', rested: false }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC', allOrNone: true, whenCondition: { kind: 'ACTIVE_DON_AT_LEAST', minimum: 1 } },
    rest('paid'), addDon(false, { whenBindingNonempty: 'paid' })]),
  // ST10-010 Law: [Blocker]; [On Play] DON!! −1: if your opponent has 7 or more cards in hand, trash 2 of them, chosen by you
  // face-down (FAQ ST10-010).
  ability('ST10-010.on-play-discard', def('ST10-010'), 'characters', 'ON_PLAY', [...donMinus(1),
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OPPONENT', zone: 'hand' }, optional: false, min: 2, max: 2, bind: 'oppDiscard', visibility: 'PRIVATE', conceal: true, whenBindingNonempty: 'donMinus', whenCondition: { kind: 'HAND_AT_LEAST', player: 'OPPONENT', minimum: 7 } },
    { kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'oppDiscard', from: 'hand', to: 'trash' } }]),
  // ST10-011 Heat: [Your Turn] [Once Per Turn] when a DON!! of your field returns to your DON!! deck, +2000 until the start of your next turn.
  ability('ST10-011.don-returned-power', def('ST10-011'), 'characters', 'ON_DON_RETURNED', [powerUntilNextTurn(2000)], { condition: { kind: 'YOUR_TURN' }, ...once }),
  // ST10-012 Bepo: [On Play]/[When Attacking] if your opponent has more DON!! on their field, add up to 1 DON!! card and rest it.
  ability('ST10-012.on-play-don', def('ST10-012'), 'characters', 'ON_PLAY', [addDon(true)], { condition: { kind: 'OPPONENT_MORE_FIELD_DON' } }),
  ability('ST10-012.when-attacking-don', def('ST10-012'), 'characters', 'WHEN_ATTACKING', [addDon(true)], { condition: { kind: 'OPPONENT_MORE_FIELD_DON' } }),
  // ST10-013 Kid: [On Play]/[When Attacking] DON!! −1: up to 1 of your Leader +1000 until the start of your next turn.
  ability('ST10-013.on-play-power', def('ST10-013'), 'characters', 'ON_PLAY', kidProgram()),
  ability('ST10-013.when-attacking-power', def('ST10-013'), 'characters', 'WHEN_ATTACKING', kidProgram()),
  // ST10-014 Wire: [Blocker]; [Once Per Turn] when a DON!! of your field returns to your DON!! deck, draw 1 and trash 1 (mandatory, FAQ).
  ability('ST10-014.don-returned-draw', def('ST10-014'), 'characters', 'ON_DON_RETURNED', drawThenTrash(1, 1), once),
  // ST10-015 Gum-Gum Giant Sumo Slap: [Counter] up to 1 own Leader/Character +2000 this battle, and K.O. up to 1 opposing
  // Character with 2000 power or less.
  ability('ST10-015.counter', def('ST10-015'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'target'), power('target', 2000, 'THIS_BATTLE'),
    upTo(1, 'victim', { side: 'OPPONENT', zone: 'characters', maxPower: 2000 }), ko('victim')]),
  // ST10-016 Gum-Gum Kong Gatling: [Main] K.O. up to 1 opposing Character with 7000 power or less. [Trigger] up to 1 of your Leader
  // +1000 until the end of your next turn (FAQ ST10-016).
  ability('ST10-016.main-ko', def('ST10-016'), 'hand', 'MAIN', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxPower: 7000 }), ko('target')]),
  ability('ST10-016.trigger-power', def('ST10-016'), 'temporary', 'TRIGGER', leaderUntil(1000, 'UNTIL_END_OF_YOUR_NEXT_TURN')),
  // ST10-017 Punk Vise: [Main] rest up to 1 opposing Character cost 2 or less, and add up to 1 DON!! rested. [Trigger] add up to 1 DON!! active.
  ability('ST10-017.main-rest-don', def('ST10-017'), 'hand', 'MAIN', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 2 }), rest('target'), addDon(true)]),
  ability('ST10-017.trigger-don', def('ST10-017'), 'temporary', 'TRIGGER', [addDon(false)]),
]
type Continuous = NonNullable<EffectRegistry['continuous']>[number]
const continuous: Continuous[] = [
  // ST10-003 Leader Kid: [Your Turn] with 4 or more Life cards, this Leader -1000.
  { id: 'ST10-003.your-turn-minus', definitionId: def('ST10-003'), zone: 'leader', characteristic: 'POWER', amount: -1000, minimumAttachedDon: 0, duringYourTurn: true, minimumOwnLife: 4 },
]
const ids = (number: string) => [...abilities.filter(a => a.source.kind === 'CARD_DEFINITION' && a.source.definitionId === def(number)).map(a => a.id), ...continuous.filter(k => k.definitionId === def(number)).map(k => k.id)]
export const ST10_LOCAL_CARDS: CardInput[] = [
  card('ST10-001', { abilityIds: ids('ST10-001') }), card('ST10-002', { abilityIds: ids('ST10-002') }), card('ST10-003', { abilityIds: ids('ST10-003') }),
  card('ST10-004', { abilityIds: ids('ST10-004') }), card('ST10-005', { abilityIds: ids('ST10-005') }), card('ST10-006', { keywords: ['RUSH'], abilityIds: ids('ST10-006') }),
  card('ST10-007', { abilityIds: ids('ST10-007') }), card('ST10-008', { abilityIds: ids('ST10-008') }), card('ST10-009', { abilityIds: ids('ST10-009') }),
  card('ST10-010', { blocker: true, abilityIds: ids('ST10-010') }), card('ST10-011', { abilityIds: ids('ST10-011') }), card('ST10-012', { abilityIds: ids('ST10-012') }),
  card('ST10-013', { abilityIds: ids('ST10-013') }), card('ST10-014', { blocker: true, abilityIds: ids('ST10-014') }),
  card('ST10-015', { abilityIds: ids('ST10-015'), counterEvent: { abilityId: 'ST10-015.counter' } }), card('ST10-016', { abilityIds: ids('ST10-016') }), card('ST10-017', { abilityIds: ids('ST10-017') }),
]
export const ST10_LOCAL_ABILITY_DEFINITIONS = abilities
export const ST10_LOCAL_CONTINUOUS = continuous
