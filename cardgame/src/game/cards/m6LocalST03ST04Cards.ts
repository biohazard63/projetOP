import st03Rows from '../../../carteJson/ST-03/cards-ST-03.json'
import st04Rows from '../../../carteJson/ST-04/cards-ST-04.json'
import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { localCard, type LocalProfile, type LocalRow } from './localCards'
import { ability, addDon, after, donMinus, drawThenTrash, draw, grantRush, ko, lookTopAndPlace, moveFromTrashToHand, playChosen, playThisCardSteps, returnToHand, shuffleDeck, toDeckBottom, upTo } from './dsl'

// M6 Lot B — ST-03 The Seven Warlords of the Sea and ST-04 Animal Kingdom Pirates, from cardgame/carteJson and generic
// DSL steps only. FAQ ST-01..04 and errata re-read on 2026-10-13 (docs/game/evidence/m6/sources/).
// Kept from earlier revisions: ST03-017 and ST04-001/016 (M3), vanilla/[Blocker] cards (M5/M3).
const revision = 'm6-cardjson-2026-10-13', reviewedAt = '2026-10-13', faqUrl = 'https://en.onepiece-cardgame.com/pdf/qa_st-01-st-04.pdf?20240405'
const def = (number: string) => `${number}@${revision}`
function card(number: string, profile: LocalProfile): CardInput {
  const set = number.startsWith('ST03') ? 'ST-03' : 'ST-04', rows = (set === 'ST-03' ? st03Rows : st04Rows) as LocalRow[]
  const row = rows.find(r => r.code === number)
  if (!row) throw new Error(`LOCAL_CARD_MISSING:${number}`)
  return localCard(row, set, `cardgame/carteJson/${set}/cards-${set}.json`, revision, faqUrl, reviewedAt, profile)
}
const any = (maxCost: number) => ({ side: 'ANY' as const, zone: 'characters' as const, maxCost })
const opp = (maxCost: number) => ({ side: 'OPPONENT' as const, zone: 'characters' as const, maxCost })
const don1 = { kind: 'SOURCE_ATTACHED_DON_AT_LEAST' as const, minimum: 1 }

const abilities: EffectDefinition[] = [
  // ST03-001 Leader Crocodile: [Activate: Main] [Once Per Turn] DON!! −4: return up to 1 Character cost <= 5 to its owner's hand.
  ability('ST03-001.activate-main-bounce', def('ST03-001'), 'leader', 'ACTIVATE_MAIN', [upTo(1, 'target', any(5)), returnToHand('target')],
    { cost: { kind: 'DON_MINUS', amount: 4 }, usage: { kind: 'ONCE_PER_TURN' } }),
  // ST03-003 Crocodile: [Blocker]; [DON!! x1] [On Block] place up to 1 Character cost <= 2 at the bottom of its owner's deck.
  ability('ST03-003.on-block-bottom', def('ST03-003'), 'characters', 'ON_BLOCK', [upTo(1, 'target', any(2)), toDeckBottom('target')], { condition: don1 }),
  // ST03-004 Gecko Moria: [On Play] up to 1 {Seven Warlords}/{Thriller Bark} Character cost <= 4, not named [Gecko Moria], trash -> hand.
  ability('ST03-004.on-play-recover', def('ST03-004'), 'characters', 'ON_PLAY',
    [upTo(1, 'card', { side: 'OWN', zone: 'trash', categories: ['CHARACTER'], maxCost: 4, nameNot: 'Gecko Moria', traitsAny: ['The Seven Warlords of the Sea', 'Thriller Bark Pirates'] }), moveFromTrashToHand('card')]),
  // ST03-005 Dracule Mihawk: [DON!! x1] [When Attacking] draw 2 cards and trash 2 cards from your hand (whenever possible).
  ability('ST03-005.when-attacking-draw-trash', def('ST03-005'), 'characters', 'WHEN_ATTACKING', drawThenTrash(2, 2), { condition: don1 }),
  // ST03-007 Sentomaru: [DON!! x1] [Activate: Main] [Once Per Turn] ②: play up to 1 [Pacifista] cost <= 4 from your deck, then shuffle.
  ability('ST03-007.activate-main-play-pacifista', def('ST03-007'), 'characters', 'ACTIVATE_MAIN', [...playChosen('pacifista', 'deck', { nameIs: 'Pacifista', maxCost: 4 }), shuffleDeck()],
    { condition: don1, cost: { kind: 'REST_DON', amount: 2 }, usage: { kind: 'ONCE_PER_TURN' } }),
  // ST03-009 Doflamingo / ST03-014 Teach: [On Play] return up to 1 Character (cost <= 7 / <= 3) to its owner's hand.
  ability('ST03-009.on-play-bounce', def('ST03-009'), 'characters', 'ON_PLAY', [upTo(1, 'target', any(7)), returnToHand('target')]),
  // ST03-010 Kuma: [On Play] look at 3 top cards, return them all to the top or all to the bottom in any order. [Trigger] Play this card.
  ability('ST03-010.on-play-look-place', def('ST03-010'), 'characters', 'ON_PLAY', lookTopAndPlace(3)),
  ability('ST03-010.trigger-play-self', def('ST03-010'), 'temporary', 'TRIGGER', playThisCardSteps()),
  ability('ST03-013.trigger-play-self', def('ST03-013'), 'temporary', 'TRIGGER', playThisCardSteps()),
  ability('ST03-014.on-play-bounce', def('ST03-014'), 'characters', 'ON_PLAY', [upTo(1, 'target', any(3)), returnToHand('target')]),
  // ST03-015 Sables: [Main] return up to 1 Character cost <= 7; [Trigger] activate this card's [Main] effect.
  ability('ST03-015.main-bounce', def('ST03-015'), 'hand', 'MAIN', [upTo(1, 'target', any(7)), returnToHand('target')]),
  ability('ST03-015.main-bounce.trigger', def('ST03-015'), 'temporary', 'TRIGGER', [upTo(1, 'target', any(7)), returnToHand('target')]),
  // ST03-016 Thrust Pad Cannon: [Counter] return up to 1 Character cost <= 3; [Trigger] activate this card's [Counter] effect.
  ability('ST03-016.counter', def('ST03-016'), 'hand', 'COUNTER', [upTo(1, 'target', any(3)), returnToHand('target')]),
  ability('ST03-016.counter.trigger', def('ST03-016'), 'temporary', 'TRIGGER', [upTo(1, 'target', any(3)), returnToHand('target')]),

  // ST04-002 Ulti: [On Play] DON!! −1: play up to 1 [Page One] cost <= 4 from your hand.
  ability('ST04-002.on-play-play-page-one', def('ST04-002'), 'characters', 'ON_PLAY', [...donMinus(1), ...after('donMinus', playChosen('pageOne', 'hand', { nameIs: 'Page One', maxCost: 4 }))]),
  // ST04-003 Kaido: [On Play] DON!! −5: K.O. up to 1 opposing Character cost <= 6; this Character gains [Rush] this turn.
  ability('ST04-003.on-play-ko-rush', def('ST04-003'), 'characters', 'ON_PLAY', [...donMinus(5), ...after('donMinus', [upTo(1, 'target', opp(6)), ko('target'), grantRush()])]),
  // ST04-004 King / ST04-010 Who's.Who: [On Play] DON!! −1: K.O. up to 1 opposing Character cost <= 4 / <= 3.
  ability('ST04-004.on-play-ko', def('ST04-004'), 'characters', 'ON_PLAY', [...donMinus(1), ...after('donMinus', [upTo(1, 'target', opp(4)), ko('target')])]),
  // ST04-005 Queen: [Blocker]; [On Play] DON!! −1: draw 2 cards and trash 1 card from your hand.
  ability('ST04-005.on-play-draw-trash', def('ST04-005'), 'characters', 'ON_PLAY', [...donMinus(1), ...after('donMinus', drawThenTrash(2, 1))]),
  // ST04-006 Sasaki: [On Play] DON!! −1: draw 1 card.
  ability('ST04-006.on-play-draw', def('ST04-006'), 'characters', 'ON_PLAY', [...donMinus(1), ...after('donMinus', [draw(1)])]),
  // ST04-008 Jack: [On Play] You may trash 1 card from your hand: add up to 1 DON!! from the DON!! deck, active.
  ability('ST04-008.on-play-trash-add-don', def('ST04-008'), 'characters', 'ON_PLAY',
    [upTo(1, 'discard', { side: 'OWN', zone: 'hand' }), ...after('discard', [{ kind: 'OPERATION', operation: { primitive: 'moveCard', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'discard', from: 'hand', to: 'trash' } }, addDon(false)])],
    { condition: { kind: 'HAND_AT_LEAST', player: 'CONTROLLER', minimum: 1 } }),
  ability('ST04-010.on-play-ko', def('ST04-010'), 'characters', 'ON_PLAY', [...donMinus(1), ...after('donMinus', [upTo(1, 'target', opp(3)), ko('target')])]),
  ability('ST04-010.trigger-play-self', def('ST04-010'), 'temporary', 'TRIGGER', playThisCardSteps()),
  // ST04-014 Lead Performer "Disaster": [Main] draw 1, then add up to 1 DON!! active; [Trigger] activate this [Main].
  ability('ST04-014.main-draw-don', def('ST04-014'), 'hand', 'MAIN', [draw(1), addDon(false)]),
  ability('ST04-014.main-draw-don.trigger', def('ST04-014'), 'temporary', 'TRIGGER', [draw(1), addDon(false)]),
  // ST04-015 Brachio Bomber: [Main] K.O. up to 1 opposing Character cost <= 6, then add up to 1 DON!! active; [Trigger] add up to 1 DON!! active.
  ability('ST04-015.main-ko-don', def('ST04-015'), 'hand', 'MAIN', [upTo(1, 'target', opp(6)), ko('target'), addDon(false)]),
  ability('ST04-015.trigger-don', def('ST04-015'), 'temporary', 'TRIGGER', [addDon(false)]),
  // ST04-017 Onigashima Island: [Activate: Main] rest this Stage: if your Leader has {Animal Kingdom Pirates}, add up to 1 DON!! rested.
  ability('ST04-017.activate-main-add-don', def('ST04-017'), 'stage', 'ACTIVATE_MAIN', [addDon(true, { whenCondition: { kind: 'LEADER_HAS_TRAIT', trait: 'Animal Kingdom Pirates' } })],
    { cost: { kind: 'REST_SOURCE' } }),
]
const ids = (number: string) => abilities.filter(a => a.source.kind === 'CARD_DEFINITION' && a.source.definitionId === def(number)).map(a => a.id)
export const ST03_ST04_LOCAL_CARDS: CardInput[] = [
  card('ST03-001', { abilityIds: ids('ST03-001') }),
  card('ST03-003', { blocker: true, abilityIds: ids('ST03-003') }),
  card('ST03-004', { abilityIds: ids('ST03-004') }),
  card('ST03-005', { abilityIds: ids('ST03-005') }),
  card('ST03-007', { abilityIds: ids('ST03-007') }),
  card('ST03-009', { abilityIds: ids('ST03-009') }),
  card('ST03-010', { abilityIds: ids('ST03-010') }),
  card('ST03-013', { blocker: true, abilityIds: ids('ST03-013') }),
  card('ST03-014', { abilityIds: ids('ST03-014') }),
  card('ST03-015', { abilityIds: ids('ST03-015') }),
  card('ST03-016', { abilityIds: ids('ST03-016'), counterEvent: { abilityId: 'ST03-016.counter' } }),
  card('ST04-002', { abilityIds: ids('ST04-002') }),
  card('ST04-003', { abilityIds: ids('ST04-003') }),
  card('ST04-004', { abilityIds: ids('ST04-004') }),
  card('ST04-005', { blocker: true, abilityIds: ids('ST04-005') }),
  card('ST04-006', { abilityIds: ids('ST04-006') }),
  card('ST04-008', { abilityIds: ids('ST04-008') }),
  card('ST04-010', { abilityIds: ids('ST04-010') }),
  card('ST04-014', { abilityIds: ids('ST04-014') }),
  card('ST04-015', { abilityIds: ids('ST04-015') }),
  card('ST04-017', { abilityIds: ids('ST04-017') }),
]
export const ST03_ST04_LOCAL_ABILITY_DEFINITIONS: EffectDefinition[] = abilities
