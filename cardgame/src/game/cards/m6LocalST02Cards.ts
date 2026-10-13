import st02Rows from '../../../carteJson/ST-02/cards-ST-02.json'
import type { CardInput } from './types'
import type { EffectDefinition, EffectRegistry } from '../effects/contracts'
import { localCard, type LocalProfile, type LocalRow } from './localCards'
import { ability, ko, ownLeaderOrCharacter, playChosen, playThisCardSteps, power, rest, setActive, trashFromHand, upTo } from './dsl'

// M6 Lot A — ST-02 Worst Generation, projected from cardgame/carteJson/ST-02 and written with generic DSL steps only.
// FAQ ST-01..04 and errata re-read on 2026-10-13 (docs/game/evidence/m6/sources/). The five ST-02 cards without an
// ability beyond [Blocker] (002, 004, 006, 011, 012) keep their M5 revision.
const revision = 'm6-cardjson-2026-10-13', reviewedAt = '2026-10-13'
const sourcePath = 'cardgame/carteJson/ST-02/cards-ST-02.json', faqUrl = 'https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405'
const def = (number: string) => `${number}@${revision}`
const row = (number: string) => {
  const r = (st02Rows as LocalRow[]).find(card => card.code === number)
  if (!r) throw new Error(`LOCAL_CARD_MISSING:${number}`)
  return r
}
const card = (number: string, profile: LocalProfile) => localCard(row(number), 'ST-02', sourcePath, revision, faqUrl, reviewedAt, profile)

const abilities: EffectDefinition[] = [
  // ST02-001 Leader: [Activate: Main] [Once Per Turn] ③ You may trash 1 card from your hand: Set this Leader as active.
  ability('ST02-001.activate-main-set-active', def('ST02-001'), 'leader', 'ACTIVATE_MAIN',
    [upTo(1, 'discard', { side: 'OWN', zone: 'hand' }, { required: true }), trashFromHand('discard'), setActive()],
    { cost: { kind: 'REST_DON', amount: 3 }, usage: { kind: 'ONCE_PER_TURN' }, condition: { kind: 'HAND_AT_LEAST', player: 'CONTROLLER', minimum: 1 } }),
  // ST02-005 Killer: [On Play] K.O. up to 1 opposing rested Character cost <= 3. [Trigger] Play this card.
  ability('ST02-005.on-play-ko-rested-character', def('ST02-005'), 'characters', 'ON_PLAY',
    [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', rested: true, maxCost: 3 }), ko('target')]),
  ability('ST02-005.trigger-play-self', def('ST02-005'), 'temporary', 'TRIGGER', playThisCardSteps()),
  // ST02-007 Bonney: [Activate: Main] ① You may rest this Character: top 5, up to 1 {Supernovas} to hand, rest bottom.
  ability('ST02-007.activate-main-search', def('ST02-007'), 'characters', 'ACTIVATE_MAIN',
    [{ kind: 'SEARCH_TOP_DECK', amount: 5, trait: 'Supernovas', maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }],
    { cost: { kind: 'SEQUENCE', parts: [{ kind: 'REST_DON', amount: 1 }, { kind: 'REST_SOURCE' }] } }),
  // ST02-008 Apoo: [DON!! x1] [When Attacking] Rest up to 1 opposing (active) DON!! card in the cost area (FAQ ST02-008).
  ability('ST02-008.when-attacking-rest-don', def('ST02-008'), 'characters', 'WHEN_ATTACKING',
    [upTo(1, 'don', { side: 'OPPONENT', zone: 'cost', rested: false }), rest('don')], { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 1 } }),
  // ST02-009 Law: [On Play] Set up to 1 own rested {Supernovas}/{Heart Pirates} Character cost <= 5 as active (not the Leader).
  ability('ST02-009.on-play-set-active', def('ST02-009'), 'characters', 'ON_PLAY',
    [upTo(1, 'target', { side: 'OWN', zone: 'characters', rested: true, maxCost: 5, traitsAny: ['Supernovas', 'Heart Pirates'] }), setActive('target')]),
  // ST02-010 Hawkins: [DON!! x1] [Once Per Turn] [Your Turn] after battling an opposing Character, set this card as active.
  ability('ST02-010.battle-set-active', def('ST02-010'), 'characters', 'END_OF_BATTLE_WITH_CHARACTER', [setActive()],
    { condition: { kind: 'ALL_OF', conditions: [{ kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 1 }, { kind: 'YOUR_TURN' }] }, usage: { kind: 'ONCE_PER_TURN' } }),
  // ST02-013 Kid: [Blocker]; [DON!! x1] [End of Your Turn] Set this Character as active (mandatory, FAQ ST02-013).
  ability('ST02-013.end-of-turn-set-active', def('ST02-013'), 'characters', 'END_OF_YOUR_TURN', [setActive()],
    { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 1 } }),
  // ST02-015 Scalpel: [Counter] up to 1 +2000 this battle, then set up to 1 DON!! active. [Trigger] up to 2 DON!! active.
  ability('ST02-015.counter', def('ST02-015'), 'hand', 'COUNTER',
    [ownLeaderOrCharacter(1, 'target'), power('target', 2000, 'THIS_BATTLE'), upTo(1, 'don', { side: 'OWN', zone: 'cost', rested: true }), setActive('don')]),
  ability('ST02-015.trigger', def('ST02-015'), 'temporary', 'TRIGGER', [upTo(2, 'don', { side: 'OWN', zone: 'cost', rested: true }), setActive('don')]),
  // ST02-016 Repel: [Counter] up to 1 +4000 this battle, then set up to 1 DON!! active.
  ability('ST02-016.counter', def('ST02-016'), 'hand', 'COUNTER',
    [ownLeaderOrCharacter(1, 'target'), power('target', 4000, 'THIS_BATTLE'), upTo(1, 'don', { side: 'OWN', zone: 'cost', rested: true }), setActive('don')]),
  // ST02-017 Straw Sword: [Main] Rest up to 1 opposing Character. [Trigger] Play up to 1 {Supernovas} Character/Stage cost <= 2 from hand.
  ability('ST02-017.main-rest', def('ST02-017'), 'hand', 'MAIN', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), rest('target')]),
  ability('ST02-017.trigger-play', def('ST02-017'), 'temporary', 'TRIGGER', playChosen('card', 'hand', { traitsAny: ['Supernovas'], maxCost: 2 })),
]
type Continuous = NonNullable<EffectRegistry['continuous']>[number]
const continuous: Continuous[] = [
  // ST02-003 Urouge: [DON!! x1] with 3+ Characters (itself included, FAQ) +2000, during both turns.
  { id: 'ST02-003.don-power', definitionId: def('ST02-003'), zone: 'characters', characteristic: 'POWER', amount: 2000, minimumAttachedDon: 1, minimumOwnCharacters: 3 },
  // ST02-014 X.Drake: [DON!! x1] [Your Turn] while rested, own {Supernovas}/{Navy} Leader and Characters +1000 (once each).
  { id: 'ST02-014.rested-aura', definitionId: def('ST02-014'), zone: 'characters', characteristic: 'POWER', amount: 1000, minimumAttachedDon: 1, duringYourTurn: true, sourceRested: true, targets: { traitsAny: ['Supernovas', 'Navy'] } },
]
export const ST02_LOCAL_CARDS: CardInput[] = [
  card('ST02-001', { abilityIds: ['ST02-001.activate-main-set-active'] }),
  card('ST02-003', { abilityIds: ['ST02-003.don-power'] }),
  card('ST02-005', { abilityIds: ['ST02-005.on-play-ko-rested-character', 'ST02-005.trigger-play-self'] }),
  card('ST02-007', { abilityIds: ['ST02-007.activate-main-search'] }),
  card('ST02-008', { abilityIds: ['ST02-008.when-attacking-rest-don'] }),
  card('ST02-009', { abilityIds: ['ST02-009.on-play-set-active'] }),
  card('ST02-010', { abilityIds: ['ST02-010.battle-set-active'] }),
  card('ST02-013', { blocker: true, abilityIds: ['ST02-013.end-of-turn-set-active'] }),
  card('ST02-014', { abilityIds: ['ST02-014.rested-aura'] }),
  card('ST02-015', { abilityIds: ['ST02-015.counter', 'ST02-015.trigger'], counterEvent: { abilityId: 'ST02-015.counter' } }),
  card('ST02-016', { abilityIds: ['ST02-016.counter'], counterEvent: { abilityId: 'ST02-016.counter' } }),
  card('ST02-017', { abilityIds: ['ST02-017.main-rest', 'ST02-017.trigger-play'] }),
]
export const ST02_KILLER_LOCAL_CARD = ST02_LOCAL_CARDS.find(c => c.number === 'ST02-005')!
export const ST02_LOCAL_ABILITY_DEFINITIONS: EffectDefinition[] = abilities
export const ST02_LOCAL_CONTINUOUS: Continuous[] = continuous
