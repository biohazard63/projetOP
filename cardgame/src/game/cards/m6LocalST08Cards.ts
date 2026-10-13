import rows from '../../../carteJson/ST-08/cards-ST-08.json'
import type { CardInput } from './types'
import type { EffectDefinition, EffectRegistry } from '../effects/contracts'
import { localCard, type LocalProfile, type LocalRow } from './localCards'
import { ability, addCost, bindAll, check, draw, giveRestedDon, ko, koAny, moveFromTrashToHand, playThisCardSteps, trashFromHand, upTo } from './dsl'

// M6 ST-08 (Monkey.D.Luffy, black). Card text comes from local cardJson; the cached ST-08 FAQ and errata
// snapshot are in docs/game/evidence/m6/sources/. No runtime branch depends on a card number.
const revision = 'm6-cardjson-2026-10-13', reviewedAt = '2026-10-13'
const def = (number: string) => `${number}@${revision}`
// ST08-003, ST08-010, ST08-011 and ST08-012 (no ability) are the M5 recognised definitions.
function card(number: string, profile: LocalProfile): CardInput {
  const row = (rows as LocalRow[]).find(item => item.code === number)
  if (!row) throw new Error(`LOCAL_CARD_MISSING:${number}`)
  return localCard(row, 'ST-08', 'cardgame/carteJson/ST-08/cards-ST-08.json', revision,
    'https://en.onepiece-cardgame.com/pdf/qa_st-08.pdf', reviewedAt, profile)
}
const opponent = (maxCost: number) => ({ side: 'OPPONENT' as const, zone: 'characters' as const, maxCost })

const abilities: EffectDefinition[] = [
  // ST08-001 Leader: [Your Turn] When a Character is K.O.'d, give up to 1 rested DON!! to this Leader (once per K.O.'d
  // Character, FAQ ST08-001; either player's Character).
  ability('ST08-001.your-turn-character-ko-don', def('ST08-001'), 'leader', 'ON_CHARACTER_KO', [check('self', { kind: 'ALWAYS' }), ...giveRestedDon('self')],
    { condition: { kind: 'YOUR_TURN' } }),
  // ST08-002 Uta: [Activate: Main] You may rest this Character: up to 1 opposing Character −2 cost this turn.
  ability('ST08-002.activate-main-cost', def('ST08-002'), 'characters', 'ACTIVATE_MAIN', [upTo(1, 'target', opponent(20)), addCost('target', -2)],
    { cost: { kind: 'REST_SOURCE' } }),
  // ST08-004 Koby: [Activate: Main] You may rest this Character: K.O. up to 1 opposing Character cost 2 or less.
  ability('ST08-004.activate-main-ko', def('ST08-004'), 'characters', 'ACTIVATE_MAIN', [upTo(1, 'target', opponent(2)), ko('target')],
    { cost: { kind: 'REST_SOURCE' } }),
  // ST08-005 Shanks: [On Play] You may trash 1 card from your hand: K.O. all Characters (both players, no choice,
  // FAQ ST08-005) with a cost of 1 or less.
  ability('ST08-005.on-play-ko-all', def('ST08-005'), 'characters', 'ON_PLAY', [upTo(1, 'discard', { side: 'OWN', zone: 'hand' }), trashFromHand('discard', 'discard'),
    bindAll('victims', { side: 'ANY', zone: 'characters', maxCost: 1 }), koAny('victims', { whenBindingNonempty: 'discard' })]),
  // ST08-006 Shirahoshi: Blocker plus On Play, up to 1 opposing Character -4 cost this turn.
  ability('ST08-006.on-play-cost', def('ST08-006'), 'characters', 'ON_PLAY', [upTo(1, 'target', opponent(20)), addCost('target', -4)]),
  // ST08-007 Nefeltari Vivi: [Blocker]; [Trigger] Play this card.
  ability('ST08-007.trigger-play', def('ST08-007'), 'temporary', 'TRIGGER', playThisCardSteps()),
  // ST08-008 Higuma: On Play, up to 1 opposing Character -2 cost this turn.
  ability('ST08-008.on-play-cost', def('ST08-008'), 'characters', 'ON_PLAY', [upTo(1, 'target', opponent(20)), addCost('target', -2)]),
  // ST08-009 Makino: if any Character on either field currently has cost 0, draw 1.
  ability('ST08-009.on-play-draw', def('ST08-009'), 'characters', 'ON_PLAY', [draw(1)], { condition: { kind: 'FIELD_CHARACTER_COST_AT_MOST', maximum: 0 } }),
  // ST08-013 Mr.2: [DON!! x1] At the end of a battle with an opposing Character (attacking or defending), you may K.O. that
  // Character; if you do, K.O. this Character. Not activated once this Character was K.O.'d in that battle (FAQ ST08-013).
  ability('ST08-013.end-of-battle-ko', def('ST08-013'), 'characters', 'END_OF_BATTLE_WITH_CHARACTER', [
    upTo(1, 'foe', { side: 'OPPONENT', zone: 'characters', battledWithSource: true }),
    { kind: 'OPERATION', operation: { primitive: 'koCharacter', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'foe', resultBinding: 'done' } },
    check('self', { kind: 'ALWAYS' }), koAny('self', { whenBindingNonempty: 'done' })],
  { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 1 } }),
  // ST08-014 Gum-Gum Bell: [Main] You may add the top Life card to your hand: up to 1 opposing Character −7 cost this turn.
  ability('ST08-014.main-cost', def('ST08-014'), 'hand', 'MAIN', [upTo(1, 'target', opponent(20)), addCost('target', -7)], { optionalCost: 'TAKE_TOP_LIFE_TO_HAND' }),
  // [Trigger] Add up to 1 black Character card with a cost of 2 or less from your trash to your hand.
  ability('ST08-014.trigger-trash-to-hand', def('ST08-014'), 'temporary', 'TRIGGER', [upTo(1, 'card', { side: 'OWN', zone: 'trash', categories: ['CHARACTER'], maxCost: 2, colorsAny: ['BLACK'] }), moveFromTrashToHand('card')]),
  // ST08-015 Gum-Gum Pistol: Main K.O. up to 1 opposing Character cost 2 or less; Trigger draw 1.
  ability('ST08-015.main-ko', def('ST08-015'), 'hand', 'MAIN', [upTo(1, 'target', opponent(2)), ko('target')]),
  ability('ST08-015.trigger-draw', def('ST08-015'), 'temporary', 'TRIGGER', [draw(1)]),
]
type KoProtection = NonNullable<EffectRegistry['koProtections']>[number]
const koProtections: KoProtection[] = [
  // ST08-002 Uta: This Character cannot be K.O.'d in battle by Leaders.
  { id: 'ST08-002.no-battle-ko-by-leaders', definitionId: def('ST08-002'), zone: 'characters', from: 'BATTLE', byLeaders: true },
]
const ids = (number: string) => [...abilities.filter(effect => effect.source.kind === 'CARD_DEFINITION' && effect.source.definitionId === def(number)).map(effect => effect.id),
  ...koProtections.filter(k => k.definitionId === def(number)).map(k => k.id)]

export const ST08_LOCAL_CARDS: CardInput[] = [
  card('ST08-001', { abilityIds: ids('ST08-001') }),
  card('ST08-002', { abilityIds: ids('ST08-002') }),
  card('ST08-004', { abilityIds: ids('ST08-004') }),
  card('ST08-005', { abilityIds: ids('ST08-005') }),
  card('ST08-006', { blocker: true, abilityIds: ids('ST08-006') }),
  card('ST08-007', { blocker: true, abilityIds: ids('ST08-007') }),
  card('ST08-008', { abilityIds: ids('ST08-008') }),
  card('ST08-009', { abilityIds: ids('ST08-009') }),
  card('ST08-013', { abilityIds: ids('ST08-013') }),
  card('ST08-014', { abilityIds: ids('ST08-014') }),
  card('ST08-015', { abilityIds: ids('ST08-015') }),
]
export const ST08_LOCAL_ABILITY_DEFINITIONS = abilities
export const ST08_KO_PROTECTIONS = koProtections
