import rows from '../../../carteJson/ST-12/cards-ST-12.json'
import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { localCard, type LocalProfile, type LocalRow } from './localCards'
import { ability, after, check, draw, ko, lookTopAndPlace, ownLeaderOrCharacter, playChosen, playThisCardSteps, power, powerUntilNextTurn, rest, returnToHand, revealTopAndPlay, setActive, upTo } from './dsl'

// M6 ST-12 (Roronoa Zoro & Sanji, green/blue). Card text comes from local cardJson; the cached ST-12 FAQ and errata
// snapshot are in docs/game/evidence/m6/sources/. No runtime branch depends on a card number.
// ST12-004, ST12-005, ST12-009 and ST12-015 (no ability) are the M5 recognised definitions.
const revision = 'm6-cardjson-2026-10-13', reviewedAt = '2026-10-13'
const def = (number: string) => `${number}@${revision}`
function card(number: string, profile: LocalProfile): CardInput {
  const row = (rows as LocalRow[]).find(item => item.code === number)
  if (!row) throw new Error(`LOCAL_CARD_MISSING:${number}`)
  return localCard(row, 'ST-12', 'cardgame/carteJson/ST-12/cards-ST-12.json', revision,
    'https://en.onepiece-cardgame.com/pdf/qa_st-12.pdf', reviewedAt, profile)
}
const don1 = { kind: 'SOURCE_ATTACHED_DON_AT_LEAST' as const, minimum: 1 }
const oppChars = (maxCost: number, rested?: boolean) => ({ side: 'OPPONENT' as const, zone: 'characters' as const, maxCost, ...(rested ? { rested } : {}) })
const costTwoCharacter = { categories: ['CHARACTER' as const], minCost: 2, maxCost: 2 }
type Step = EffectDefinition['program'][number]
const lionStrike = () => [upTo(1, 'target', { side: 'OPPONENT', zone: 'leaderOrCharacters', maxCost: 4 }), rest('target')]

const abilities: EffectDefinition[] = [
  // ST12-001 Leader: [DON!! x1] [When Attacking] [Once Per Turn] You may return 1 of your Characters with a cost of 2 or more
  // to the owner's hand: set up to 1 of your Characters with 7000 power or less (current power, FAQ ST12-001) as active.
  ability('ST12-001.when-attacking-set-active', def('ST12-001'), 'leader', 'WHEN_ATTACKING', [upTo(1, 'returned', { side: 'OWN', zone: 'characters', minCost: 2 }), returnToHand('returned'),
    ...after('returned', [upTo(1, 'target', { side: 'OWN', zone: 'characters', maxPower: 7000 }), setActive('target')])], { condition: don1, usage: { kind: 'ONCE_PER_TURN' } }),
  // ST12-002 Kuina: [Activate: Main] You may rest this Character: rest up to 1 opposing Character cost 4 or less. [Trigger] Play this card.
  ability('ST12-002.activate-main-rest', def('ST12-002'), 'characters', 'ACTIVATE_MAIN', [upTo(1, 'target', oppChars(4)), rest('target')], { cost: { kind: 'REST_SOURCE' } }),
  ability('ST12-002.trigger-play', def('ST12-002'), 'temporary', 'TRIGGER', playThisCardSteps()),
  // ST12-003 Dracule Mihawk: [On Play] If you have 2 or less Characters (this one included, FAQ ST12-003), play up to 1
  // {Muggy Kingdom} type or <Slash> attribute Character card cost 4 or less other than [Dracule Mihawk] from your hand rested.
  ability('ST12-003.on-play-play', def('ST12-003'), 'characters', 'ON_PLAY', playChosen('target', 'hand', { categories: ['CHARACTER'], maxCost: 4, traitsAny: ['Muggy Kingdom'], attributesAny: ['SLASH'], traitOrAttribute: true, nameNot: 'Dracule Mihawk' }, { rested: true }),
    { condition: { kind: 'OWN_CHARACTERS_AT_MOST', maximum: 2 } }),
  // ST12-006 Yosaku & Johnny: [DON!! x1] [When Attacking] Choose one: rest up to 1 opposing Character cost 2 or less, or
  // K.O. up to 1 opposing rested Character cost 2 or less.
  ability('ST12-006.when-attacking-mode', def('ST12-006'), 'characters', 'WHEN_ATTACKING', [{ kind: 'MODE', modes: 2, bind: 'mode' },
    upTo(1, 'restTarget', oppChars(2), { whenBindingNonempty: 'mode.0' }), rest('restTarget'),
    upTo(1, 'koTarget', oppChars(2, true), { whenBindingNonempty: 'mode.1' }), ko('koTarget')], { condition: don1 }),
  // ST12-007 Rika: [On Play] ➁ (you may rest 2 DON!!): if your opponent has 3 or more Life cards, set up to 1 of your
  // <Slash> Characters cost 4 or less as active.
  ability('ST12-007.on-play-set-active', def('ST12-007'), 'characters', 'ON_PLAY', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'cost', rested: false }, optional: true, min: 0, max: 2, bind: 'paid', visibility: 'PUBLIC', allOrNone: true, whenCondition: { kind: 'ACTIVE_DON_AT_LEAST', minimum: 2 } },
    rest('paid'),
    ...after('paid', [{ ...upTo(1, 'target', { side: 'OWN', zone: 'characters', maxCost: 4, attributesAny: ['SLASH'] }), whenCondition: { kind: 'LIFE_AT_LEAST', player: 'OPPONENT', minimum: 3 } } as Step, setActive('target')])]),
  // ST12-008 Roronoa Zoro: [DON!! x1] [When Attacking] rest up to 1 opposing Character cost 6 or less.
  ability('ST12-008.when-attacking-rest', def('ST12-008'), 'characters', 'WHEN_ATTACKING', [upTo(1, 'target', oppChars(6)), rest('target')], { condition: don1 }),
  // ST12-010 Emporio.Ivankov: [On Play] Reveal the top card, play up to 1 cost-2 Character among it (FAQ ST12-010: only that
  // card), the rest top or bottom. [When Attacking] [Once Per Turn] draw 1 if you have 6 or less cards in hand.
  ability('ST12-010.on-play-reveal', def('ST12-010'), 'characters', 'ON_PLAY', revealTopAndPlay('revealed', costTwoCharacter)),
  ability('ST12-010.when-attacking-draw', def('ST12-010'), 'characters', 'WHEN_ATTACKING', [draw(1)], { condition: { kind: 'HAND_AT_MOST', player: 'CONTROLLER', maximum: 6 }, usage: { kind: 'ONCE_PER_TURN' } }),
  // ST12-011 Sanji: [DON!! x1] [When Attacking] with 5 or less cards in hand, +2000 until the start of your next turn
  // (FAQ ST12-011: kept if the hand grows later; twice gives +4000).
  ability('ST12-011.when-attacking-power', def('ST12-011'), 'characters', 'WHEN_ATTACKING', [powerUntilNextTurn(2000)],
    { condition: { kind: 'ALL_OF', conditions: [don1, { kind: 'HAND_AT_MOST', player: 'CONTROLLER', maximum: 5 }] } }),
  // ST12-012 Charlotte Pudding: [Activate: Main] Return this Character to the owner's hand.
  ability('ST12-012.activate-main-return', def('ST12-012'), 'characters', 'ACTIVATE_MAIN', [check('self', { kind: 'ALWAYS' }), returnToHand('self')]),
  // ST12-013 Zeff: [On Play] look at 3 and place them top or bottom in any order. [When Attacking] reveal the top card,
  // play up to 1 cost-2 Character among it rested, the rest top or bottom.
  ability('ST12-013.on-play-look', def('ST12-013'), 'characters', 'ON_PLAY', lookTopAndPlace(3)),
  ability('ST12-013.when-attacking-reveal', def('ST12-013'), 'characters', 'WHEN_ATTACKING', revealTopAndPlay('revealed', costTwoCharacter, { rested: true })),
  // ST12-014 Duval: [Blocker]; [On Play] look at 3 and place them top or bottom in any order.
  ability('ST12-014.on-play-look', def('ST12-014'), 'characters', 'ON_PLAY', lookTopAndPlace(3)),
  // ST12-016 Lion Strike: [Main]/[Counter] rest up to 1 opposing Leader or Character cost 4 or less (a Leader has no cost).
  // [Trigger] Activate this card's [Main] effect.
  ability('ST12-016.main-rest', def('ST12-016'), 'hand', 'MAIN', lionStrike()),
  ability('ST12-016.counter', def('ST12-016'), 'hand', 'COUNTER', lionStrike()),
  ability('ST12-016.trigger-rest', def('ST12-016'), 'temporary', 'TRIGGER', lionStrike()),
  // ST12-017 Plastic Surgery Shot: [Counter] up to 1 own Leader/Character +2000 this battle, then reveal the top card, play up
  // to 1 cost-2 Character among it, the rest top or bottom.
  ability('ST12-017.counter', def('ST12-017'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'target'), power('target', 2000, 'THIS_BATTLE'), ...revealTopAndPlay('revealed', costTwoCharacter)]),
]
const ids = (number: string) => abilities.filter(effect => effect.source.kind === 'CARD_DEFINITION' && effect.source.definitionId === def(number)).map(effect => effect.id)

export const ST12_LOCAL_CARDS: CardInput[] = [
  card('ST12-001', { abilityIds: ids('ST12-001') }),
  card('ST12-002', { abilityIds: ids('ST12-002') }),
  card('ST12-003', { abilityIds: ids('ST12-003') }),
  card('ST12-006', { abilityIds: ids('ST12-006') }),
  card('ST12-007', { abilityIds: ids('ST12-007') }),
  card('ST12-008', { abilityIds: ids('ST12-008') }),
  card('ST12-010', { abilityIds: ids('ST12-010') }),
  card('ST12-011', { abilityIds: ids('ST12-011') }),
  card('ST12-012', { abilityIds: ids('ST12-012') }),
  card('ST12-013', { abilityIds: ids('ST12-013') }),
  card('ST12-014', { blocker: true, abilityIds: ids('ST12-014') }),
  card('ST12-016', { abilityIds: ids('ST12-016'), counterEvent: { abilityId: 'ST12-016.counter' } }),
  card('ST12-017', { abilityIds: ids('ST12-017'), counterEvent: { abilityId: 'ST12-017.counter' } }),
]
export const ST12_LOCAL_ABILITY_DEFINITIONS = abilities
