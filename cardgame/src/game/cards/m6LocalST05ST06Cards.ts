import st05Rows from '../../../carteJson/ST-05/cards-ST-05.json'
import st06Rows from '../../../carteJson/ST-06/cards-ST-06.json'
import type { CardInput } from './types'
import type { EffectDefinition, EffectRegistry } from '../effects/contracts'
import { localCard, type LocalProfile, type LocalRow } from './localCards'
import { ability, addCost, addDon, after, bindAll, check, donMinus, draw, grantDoubleAttack, ko, opponentTrashesFromHand, ownLeaderOrCharacter, playThisCardSteps, power, powerSelf, preventKO, rest, trashFromHand, upTo } from './dsl'

// M6 Lot C — ST-05 ONE PIECE FILM Edition and ST-06 Absolute Justice, from cardgame/carteJson and generic DSL steps.
// FAQ ST-05 (pdf 20230127), ST-06 (pdf 20230303) and errata re-read on 2026-10-13 (docs/game/evidence/m6/sources/).
const revision = 'm6-cardjson-2026-10-13', reviewedAt = '2026-10-13'
const def = (number: string) => `${number}@${revision}`
function card(number: string, profile: LocalProfile): CardInput {
  const st05 = number.startsWith('ST05'), set = st05 ? 'ST-05' : 'ST-06', rows = (st05 ? st05Rows : st06Rows) as LocalRow[]
  const row = rows.find(r => r.code === number)
  if (!row) throw new Error(`LOCAL_CARD_MISSING:${number}`)
  const faq = st05 ? 'https://en.onepiece-cardgame.com/pdf/qa_st-05.pdf?20230127' : 'https://en.onepiece-cardgame.com/pdf/qa_st-06.pdf?20230303'
  return localCard(row, set, `cardgame/carteJson/${set}/cards-${set}.json`, revision, faq, reviewedAt, profile)
}
const opp = (maxCost: number, extra: { rested?: boolean } = {}) => ({ side: 'OPPONENT' as const, zone: 'characters' as const, maxCost, ...extra })
const anyOpp = { side: 'OPPONENT' as const, zone: 'characters' as const }
const handCost = { kind: 'HAND_AT_LEAST' as const, player: 'CONTROLLER' as const, minimum: 1 }

const abilities: EffectDefinition[] = [
  // ST05-001 Shanks: [Activate: Main] [Once Per Turn] DON!! −3: all your {FILM} Characters +2000 this turn (not the Leader, FAQ).
  ability('ST05-001.activate-main-film-power', def('ST05-001'), 'leader', 'ACTIVATE_MAIN', [bindAll('film', { side: 'OWN', zone: 'characters', traitsAny: ['FILM'] }), power('film', 2000, 'THIS_TURN')],
    { cost: { kind: 'DON_MINUS', amount: 3 }, usage: { kind: 'ONCE_PER_TURN' } }),
  // ST05-002 Ain: [On Play] add up to 1 DON!! and rest it.
  ability('ST05-002.on-play-add-don', def('ST05-002'), 'characters', 'ON_PLAY', [addDon(true)]),
  // ST05-004 Uta: [Blocker]; [On Block] DON!! −1: rest up to 1 opposing Character cost <= 5.
  ability('ST05-004.on-block-rest', def('ST05-004'), 'characters', 'ON_BLOCK', [...donMinus(1), ...after('donMinus', [upTo(1, 'target', opp(5)), rest('target')])]),
  // ST05-005 Carina: [Activate: Main] [Once Per Turn] rest this and trash 1 {FILM} card: if the opponent has more field DON!!, add 2 DON!! rested.
  ability('ST05-005.activate-main-add-don', def('ST05-005'), 'characters', 'ACTIVATE_MAIN',
    [upTo(1, 'discard', { side: 'OWN', zone: 'hand', traitsAny: ['FILM'] }, { required: true }), trashFromHand('discard'), check('more', { kind: 'OPPONENT_MORE_FIELD_DON' }), addDon(true, { whenBindingNonempty: 'more' }), addDon(true, { whenBindingNonempty: 'more' })],
    { cost: { kind: 'REST_SOURCE' }, usage: { kind: 'ONCE_PER_TURN' }, condition: { ...handCost, traitsAny: ['FILM'] } }),
  // ST05-006 Gild Tesoro: [When Attacking] DON!! −2: draw 2 cards.
  ability('ST05-006.when-attacking-draw', def('ST05-006'), 'characters', 'WHEN_ATTACKING', [...donMinus(2), ...after('donMinus', [draw(2)])]),
  ability('ST05-009.trigger-play-self', def('ST05-009'), 'temporary', 'TRIGGER', playThisCardSteps()),
  // ST05-010 Zephyr: battling a <Strike> Character: +3000 this turn (each battle, FAQ); [Activate: Main] [Once Per Turn] DON!! −1: +2000 this turn.
  ability('ST05-010.battle-strike-power', def('ST05-010'), 'characters', 'ON_BATTLE_PAIRED', [powerSelf(3000)], { condition: { kind: 'BATTLE_OPPONENT_ATTRIBUTE', attribute: 'STRIKE' } }),
  ability('ST05-010.activate-main-power', def('ST05-010'), 'characters', 'ACTIVATE_MAIN', [powerSelf(2000)], { cost: { kind: 'DON_MINUS', amount: 1 }, usage: { kind: 'ONCE_PER_TURN' } }),
  // ST05-011 Douglas Bullet: [Activate: Main] [Once Per Turn] DON!! −4: rest up to 2 opposing Characters cost <= 6, then [Double Attack] this turn.
  ability('ST05-011.activate-main-rest-double', def('ST05-011'), 'characters', 'ACTIVATE_MAIN', [upTo(2, 'targets', opp(6)), rest('targets'), grantDoubleAttack()],
    { cost: { kind: 'DON_MINUS', amount: 4 }, usage: { kind: 'ONCE_PER_TURN' } }),
  // ST05-014 Buena Festa: [On Play] top 5, up to 1 {FILM} other than [Buena Festa] to hand, rest at the bottom.
  ability('ST05-014.on-play-search', def('ST05-014'), 'characters', 'ON_PLAY',
    [{ kind: 'SEARCH_TOP_DECK', amount: 5, trait: 'FILM', excludeRulesName: 'Buena Festa', maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }]),
  // ST05-016 Lion's Threat: [Main] DON!! −2: K.O. up to 1 opposing Character cost <= 5. [Trigger] add up to 1 DON!! active.
  ability('ST05-016.main-ko', def('ST05-016'), 'hand', 'MAIN', [...donMinus(2), ...after('donMinus', [upTo(1, 'target', opp(5)), ko('target')])]),
  ability('ST05-016.trigger-don', def('ST05-016'), 'temporary', 'TRIGGER', [addDon(false)]),
  // ST05-017 Union Armada: [Counter] up to 1 own {FILM} Leader/Character +4000 this battle; a Character cannot be K.O.'d this turn. [Trigger] add 1 DON!! active.
  ability('ST05-017.counter', def('ST05-017'), 'hand', 'COUNTER', [upTo(1, 'target', { side: 'OWN', zone: 'leaderOrCharacters', traitsAny: ['FILM'] }), power('target', 4000, 'THIS_BATTLE'), preventKO('target')]),
  ability('ST05-017.trigger-don', def('ST05-017'), 'temporary', 'TRIGGER', [addDon(false)]),

  // ST06-001 Sakazuki: [Activate: Main] [Once Per Turn] ③ trash 1 card: K.O. up to 1 opposing Character cost 0.
  ability('ST06-001.activate-main-ko', def('ST06-001'), 'leader', 'ACTIVATE_MAIN', [upTo(1, 'discard', { side: 'OWN', zone: 'hand' }, { required: true }), trashFromHand('discard'), upTo(1, 'target', opp(0)), ko('target')],
    { cost: { kind: 'REST_DON', amount: 3 }, usage: { kind: 'ONCE_PER_TURN' }, condition: handCost }),
  // ST06-002 Koby: [On Play] you may trash 1 card: K.O. up to 1 opposing Character cost 0 (FAQ: no hand, no On Play).
  ability('ST06-002.on-play-ko', def('ST06-002'), 'characters', 'ON_PLAY', [upTo(1, 'discard', { side: 'OWN', zone: 'hand' }), ...after('discard', [trashFromHand('discard'), upTo(1, 'target', opp(0)), ko('target')])], { condition: handCost }),
  // ST06-005 Sengoku / ST06-008 Hina / ST06-010 Helmeppo: give up to 1 opposing Character −4/−4/−3 cost this turn.
  ability('ST06-005.when-attacking-cost', def('ST06-005'), 'characters', 'WHEN_ATTACKING', [upTo(1, 'target', anyOpp), addCost('target', -4)]),
  ability('ST06-006.activate-main-cost', def('ST06-006'), 'characters', 'ACTIVATE_MAIN', [upTo(1, 'target', anyOpp), addCost('target', -2)], { cost: { kind: 'REST_SOURCE' } }),
  ability('ST06-008.on-play-cost', def('ST06-008'), 'characters', 'ON_PLAY', [upTo(1, 'target', anyOpp), addCost('target', -4)]),
  ability('ST06-010.on-play-cost', def('ST06-010'), 'characters', 'ON_PLAY', [upTo(1, 'target', anyOpp), addCost('target', -3)]),
  // ST06-012 Garp: [Activate: Main] trash 1 card and rest this (both costs, FAQ): K.O. up to 1 opposing Character cost <= 4.
  ability('ST06-012.activate-main-ko', def('ST06-012'), 'characters', 'ACTIVATE_MAIN', [upTo(1, 'discard', { side: 'OWN', zone: 'hand' }, { required: true }), trashFromHand('discard'), upTo(1, 'target', opp(4)), ko('target')],
    { cost: { kind: 'REST_SOURCE' }, condition: handCost }),
  // ST06-014 Shockwave: [Counter] +4000 this battle, then K.O. up to 1 opposing active Character cost <= 3. [Trigger] K.O. up to 1 cost <= 4.
  ability('ST06-014.counter', def('ST06-014'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'target'), power('target', 4000, 'THIS_BATTLE'), upTo(1, 'victim', opp(3, { rested: false })), ko('victim')]),
  ability('ST06-014.trigger-ko', def('ST06-014'), 'temporary', 'TRIGGER', [upTo(1, 'victim', opp(4)), ko('victim')]),
  // ST06-015 Great Eruption: [Main] draw 1, then up to 1 opposing Character −2 cost. [Trigger] your opponent trashes 1 card of their choice.
  ability('ST06-015.main-draw-cost', def('ST06-015'), 'hand', 'MAIN', [draw(1), upTo(1, 'target', anyOpp), addCost('target', -2)]),
  ability('ST06-015.trigger-discard', def('ST06-015'), 'temporary', 'TRIGGER', opponentTrashesFromHand()),
  // ST06-016 White Out: [Counter] +2000 this battle. [Trigger] draw 1; your Characters on the field now cannot be K.O.'d this turn (FAQ).
  ability('ST06-016.counter', def('ST06-016'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'target'), power('target', 2000, 'THIS_BATTLE')]),
  ability('ST06-016.trigger', def('ST06-016'), 'temporary', 'TRIGGER', [draw(1), bindAll('mine', { side: 'OWN', zone: 'characters' }), preventKO('mine')]),
  // ST06-017 Navy HQ: [On Play] up to 1 opposing Character −1 cost; [Activate: Main] rest this: with a {Navy} Leader, −1 cost again.
  ability('ST06-017.on-play-cost', def('ST06-017'), 'stage', 'ON_PLAY', [upTo(1, 'target', anyOpp), addCost('target', -1)]),
  ability('ST06-017.activate-main-cost', def('ST06-017'), 'stage', 'ACTIVATE_MAIN', [check('navy', { kind: 'LEADER_HAS_TRAIT', trait: 'Navy' }), upTo(1, 'target', anyOpp, { whenBindingNonempty: 'navy' }), addCost('target', -1)],
    { cost: { kind: 'REST_SOURCE' } }),
]
type KoProtection = NonNullable<EffectRegistry['koProtections']>[number]
type ConditionalKeyword = NonNullable<EffectRegistry['conditionalKeywords']>[number]
const koProtections: KoProtection[] = [
  { id: 'ST05-008.no-battle-ko', definitionId: def('ST05-008'), zone: 'characters', from: 'BATTLE', minimumFieldDon: 8 },
  { id: 'ST06-004.no-effect-ko', definitionId: def('ST06-004'), zone: 'characters', from: 'EFFECT' },
]
const conditionalKeywords: ConditionalKeyword[] = [
  { id: 'ST06-004.double-attack', definitionId: def('ST06-004'), zone: 'characters', keyword: 'DOUBLE_ATTACK', minimumAttachedDon: 1, whenAnyCharacterCostAtMost: 0 },
]
const ids = (number: string) => [...abilities.filter(a => a.source.kind === 'CARD_DEFINITION' && a.source.definitionId === def(number)).map(a => a.id),
  ...koProtections.filter(k => k.definitionId === def(number)).map(k => k.id), ...conditionalKeywords.filter(k => k.definitionId === def(number)).map(k => k.id)]
export const ST05_ST06_LOCAL_CARDS: CardInput[] = [
  card('ST05-001', { abilityIds: ids('ST05-001') }), card('ST05-002', { abilityIds: ids('ST05-002') }), card('ST05-004', { blocker: true, abilityIds: ids('ST05-004') }),
  card('ST05-005', { abilityIds: ids('ST05-005') }), card('ST05-006', { abilityIds: ids('ST05-006') }), card('ST05-008', { abilityIds: ids('ST05-008') }),
  card('ST05-009', { abilityIds: ids('ST05-009') }), card('ST05-010', { abilityIds: ids('ST05-010') }), card('ST05-011', { abilityIds: ids('ST05-011') }),
  card('ST05-014', { abilityIds: ids('ST05-014') }), card('ST05-016', { abilityIds: ids('ST05-016') }), card('ST05-017', { abilityIds: ids('ST05-017'), counterEvent: { abilityId: 'ST05-017.counter' } }),
  card('ST06-001', { abilityIds: ids('ST06-001') }), card('ST06-002', { abilityIds: ids('ST06-002') }), card('ST06-004', { abilityIds: ids('ST06-004') }),
  card('ST06-005', { abilityIds: ids('ST06-005') }), card('ST06-006', { abilityIds: ids('ST06-006') }), card('ST06-008', { abilityIds: ids('ST06-008') }),
  card('ST06-010', { abilityIds: ids('ST06-010') }), card('ST06-012', { abilityIds: ids('ST06-012') }),
  card('ST06-014', { abilityIds: ids('ST06-014'), counterEvent: { abilityId: 'ST06-014.counter' } }), card('ST06-015', { abilityIds: ids('ST06-015') }),
  card('ST06-016', { abilityIds: ids('ST06-016'), counterEvent: { abilityId: 'ST06-016.counter' } }), card('ST06-017', { abilityIds: ids('ST06-017') }),
]
export const ST05_ST06_LOCAL_ABILITY_DEFINITIONS = abilities
export const ST05_ST06_KO_PROTECTIONS = koProtections
export const ST05_ST06_CONDITIONAL_KEYWORDS = conditionalKeywords
