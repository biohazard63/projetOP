import rows from '../../../carteJson/ST-07/cards-ST-07.json'
import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { localCard, type LocalProfile, type LocalRow } from './localCards'
import { ability, addToLife, after, check, deckTopToLife, draw, grantKeyword, ko, lifeToHand, opponentChoosesLifeMode, ownLeaderOrCharacter, peekLife, playThisCardSteps, power, trashFromHand, upTo } from './dsl'

// M6 ST-07 (Charlotte Linlin, yellow). Card text comes from local cardJson; the cached ST-07 FAQ and errata
// snapshot are in docs/game/evidence/m6/sources/. No runtime branch depends on a card number.
// ST07-002, ST07-006, ST07-012 and ST07-014 (no ability) are the M5 recognised definitions.
const revision = 'm6-cardjson-2026-10-13', reviewedAt = '2026-10-13'
const def = (number: string) => `${number}@${revision}`
function card(number: string, profile: LocalProfile): CardInput {
  const row = (rows as LocalRow[]).find(item => item.code === number)
  if (!row) throw new Error(`LOCAL_CARD_MISSING:${number}`)
  return localCard(row, 'ST-07', 'cardgame/carteJson/ST-07/cards-ST-07.json', revision,
    'https://en.onepiece-cardgame.com/pdf/qa_st-07.pdf', reviewedAt, profile)
}
const don = (minimum: number) => ({ condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST' as const, minimum } })
const linlin = { side: 'OWN' as const, zone: 'leaderOrCharacters' as const, nameIs: 'Charlotte Linlin' }

const abilities: EffectDefinition[] = [
  // ST07-001 Leader: [DON!! x2] [When Attacking] You may add 1 card from the top or bottom of your Life to your hand: if you
  // then have 2 or less Life cards, add up to 1 card from your hand to the top of your Life (FAQ ST07-001: 4+ Life, nothing
  // after the cost; 0 Life, no activation: nothing can be paid).
  ability('ST07-001.when-attacking-life', def('ST07-001'), 'leader', 'WHEN_ATTACKING', [...lifeToHand(),
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 1, bind: 'toLife', visibility: 'PRIVATE', whenBindingNonempty: 'lifeCost', whenCondition: { kind: 'LIFE_AT_MOST', player: 'CONTROLLER', maximum: 2 } },
    addToLife('toLife', 'hand')], don(2)),
  // ST07-003 Katakuri: [On Play] Look at up to 1 top Life card (yours or the opponent's), place it top or bottom; then, with
  // less Life than the opponent, [Rush] this turn.
  ability('ST07-003.on-play-peek-rush', def('ST07-003'), 'characters', 'ON_PLAY', [...peekLife(), check('fewerLife', { kind: 'LIFE_LESS_THAN_OPPONENT' }), grantKeyword('RUSH', 'THIS_TURN', undefined, 'fewerLife')]),
  // ST07-004 Snack: [DON!! x1] [When Attacking] You may add 1 top/bottom Life card to your hand: [Banish] and +1000 this battle.
  ability('ST07-004.when-attacking-banish', def('ST07-004'), 'characters', 'WHEN_ATTACKING', [...lifeToHand(),
    ...after('lifeCost', [grantKeyword('BANISH', 'THIS_BATTLE'), { kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', amount: 1000, duration: 'THIS_BATTLE' } }])], don(1)),
  // ST07-005 Daifuku: [DON!! x1] [When Attacking] You may add 1 top/bottom Life card to your hand: add up to 1 card from the
  // top of your deck to the top of your Life cards.
  ability('ST07-005.when-attacking-life', def('ST07-005'), 'characters', 'WHEN_ATTACKING', [...lifeToHand(), ...deckTopToLife('deckTop', 'lifeCost')], don(1)),
  // ST07-007 Brulee: [Blocker]; [Trigger] Play this card.
  ability('ST07-007.trigger-play', def('ST07-007'), 'temporary', 'TRIGGER', playThisCardSteps()),
  // ST07-008 Pudding: [On Play] Look at up to 1 top Life card (yours or the opponent's), place it top or bottom.
  ability('ST07-008.on-play-peek', def('ST07-008'), 'characters', 'ON_PLAY', peekLife()),
  // ST07-009 Mont-d'or: [Activate: Main] rest this and add 1 top/bottom Life card to hand: K.O. up to 1 opposing cost <= 3.
  ability('ST07-009.activate-main-ko', def('ST07-009'), 'characters', 'ACTIVATE_MAIN', [...lifeToHand('lifeCost', { required: true }), upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 3 }), ko('target')],
    { cost: { kind: 'REST_SOURCE' }, condition: { kind: 'LIFE_AT_LEAST', player: 'CONTROLLER', minimum: 1 } }),
  // [Trigger] You may trash 1 card from your hand: Play this card.
  ability('ST07-009.trigger-play', def('ST07-009'), 'temporary', 'TRIGGER', [upTo(1, 'discard', { side: 'OWN', zone: 'hand' }), trashFromHand('discard', 'discard'), ...after('discard', playThisCardSteps())]),
  // ST07-010 Charlotte Linlin: [On Play] Your opponent chooses one (FAQ ST07-010).
  ability('ST07-010.on-play-mode', def('ST07-010'), 'characters', 'ON_PLAY', opponentChoosesLifeMode()),
  // ST07-011 Zeus: [Activate: Main] rest this: up to 1 of your [Charlotte Linlin] (Leader or Character, FAQ ST07-011) gains
  // [Banish] this turn. [Trigger] Play this card.
  ability('ST07-011.activate-main-banish', def('ST07-011'), 'characters', 'ACTIVATE_MAIN', [upTo(1, 'target', linlin), grantKeyword('BANISH', 'THIS_TURN', 'target')], { cost: { kind: 'REST_SOURCE' } }),
  ability('ST07-011.trigger-play', def('ST07-011'), 'temporary', 'TRIGGER', playThisCardSteps()),
  // ST07-013 Prometheus: same with [Double Attack] (FAQ ST07-013). [Trigger] Play this card.
  ability('ST07-013.activate-main-double', def('ST07-013'), 'characters', 'ACTIVATE_MAIN', [upTo(1, 'target', linlin), grantKeyword('DOUBLE_ATTACK', 'THIS_TURN', 'target')], { cost: { kind: 'REST_SOURCE' } }),
  ability('ST07-013.trigger-play', def('ST07-013'), 'temporary', 'TRIGGER', playThisCardSteps()),
  // ST07-015 Soul Pocus: [Main] Your opponent chooses one (FAQ ST07-015). [Trigger] Activate this card's [Main] effect.
  ability('ST07-015.main-mode', def('ST07-015'), 'hand', 'MAIN', opponentChoosesLifeMode()),
  ability('ST07-015.trigger-mode', def('ST07-015'), 'temporary', 'TRIGGER', opponentChoosesLifeMode()),
  // ST07-016 Power Mochi: [Counter] peek and place, then up to 1 own Leader/Character +2000 this battle.
  // [Trigger] Draw 1 card, then peek and place.
  ability('ST07-016.counter', def('ST07-016'), 'hand', 'COUNTER', [...peekLife(), ownLeaderOrCharacter(1, 'target'), power('target', 2000, 'THIS_BATTLE')]),
  ability('ST07-016.trigger-draw-peek', def('ST07-016'), 'temporary', 'TRIGGER', [draw(1), ...peekLife()]),
  // ST07-017 Queen Mama Chanter: [Activate: Main] rest this Stage and add 1 top/bottom Life card to hand: up to 1 of your
  // Characters with a cost of exactly 3 (on the field, FAQ ST07-017) to the top of its owner's Life face-up.
  ability('ST07-017.activate-main-life', def('ST07-017'), 'stage', 'ACTIVATE_MAIN', [...lifeToHand('lifeCost', { required: true }),
    upTo(1, 'char', { side: 'OWN', zone: 'characters', minCost: 3, maxCost: 3 }), addToLife('char', 'characters', true)],
  { cost: { kind: 'REST_SOURCE' }, condition: { kind: 'LIFE_AT_LEAST', player: 'CONTROLLER', minimum: 1 } }),
]
const ids = (number: string) => abilities.filter(effect => effect.source.kind === 'CARD_DEFINITION' && effect.source.definitionId === def(number)).map(effect => effect.id)

export const ST07_LOCAL_CARDS: CardInput[] = [
  card('ST07-001', { abilityIds: ids('ST07-001') }),
  card('ST07-003', { abilityIds: ids('ST07-003') }),
  card('ST07-004', { abilityIds: ids('ST07-004') }),
  card('ST07-005', { abilityIds: ids('ST07-005') }),
  card('ST07-007', { blocker: true, abilityIds: ids('ST07-007') }),
  card('ST07-008', { abilityIds: ids('ST07-008') }),
  card('ST07-009', { abilityIds: ids('ST07-009') }),
  card('ST07-010', { abilityIds: ids('ST07-010') }),
  card('ST07-011', { abilityIds: ids('ST07-011') }),
  card('ST07-013', { abilityIds: ids('ST07-013') }),
  card('ST07-015', { abilityIds: ids('ST07-015') }),
  card('ST07-016', { abilityIds: ids('ST07-016'), counterEvent: { abilityId: 'ST07-016.counter' } }),
  card('ST07-017', { abilityIds: ids('ST07-017') }),
]
export const ST07_LOCAL_ABILITY_DEFINITIONS = abilities
