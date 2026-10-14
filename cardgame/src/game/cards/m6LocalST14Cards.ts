import rows from '../../../carteJson/ST-14/cards-ST-14.json'
import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { localCard, type LocalProfile, type LocalRow } from './localCards'
import { ability, after, check, draw, drawThenTrash, ko, moveFromTrashToHand, ownLeaderOrCharacter, power, upTo, addCost } from './dsl'

// M6 ST-14 (3D2Y, black "cost" deck). Card text comes from local cardJson; the ST-14 FAQ (qa_st-14.txt) and the errata
// snapshot are in docs/game/evidence/m6/sources/. "If you have a Character with a cost of N or more" reads current costs,
// the auras of the Leader and of Thousand Sunny included (FAQ ST14-003: the Character just played counts).
// ST14-005, ST14-010 and ST14-013 (no ability) are the M5 recognised definitions.
const revision = 'm6-cardjson-2026-10-13', reviewedAt = '2026-10-13'
const def = (number: string) => `${number}@${revision}`
function card(number: string, profile: LocalProfile): CardInput {
  const row = (rows as LocalRow[]).find(item => item.code === number)
  if (!row) throw new Error(`LOCAL_CARD_MISSING:${number}`)
  return localCard(row, 'ST-14', 'cardgame/carteJson/ST-14/cards-ST-14.json', revision, 'https://en.onepiece-cardgame.com/pdf/qa_st-14.pdf', reviewedAt, profile)
}
type Step = EffectDefinition['program'][number]
const don1 = { kind: 'SOURCE_ATTACHED_DON_AT_LEAST' as const, minimum: 1 }
const costAtLeast = (minimum: number) => ({ kind: 'OWN_CHARACTER_COST_AT_LEAST' as const, minimum })
const koOpp = (maxCost: number, minimum?: number): Step[] => [{ ...upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost }), ...(minimum ? { whenCondition: costAtLeast(minimum) } : {}) } as Step, ko('target')]
const blackStrawHat = { side: 'OWN' as const, zone: 'characters' as const, colorsAny: ['BLACK' as const], traitsAny: ['Straw Hat Crew'] }
const plusTwoCost = (): Step[] => [upTo(1, 'raised', blackStrawHat), addCost('raised', 2, 'UNTIL_END_OF_OPPONENT_NEXT_TURN')]

const abilities: EffectDefinition[] = [
  // ST14-002 Usopp: [DON!! x1] [When Attacking] If you have a Character with a cost of 8 or more, K.O. up to 1 of your
  // opponent's Characters with a cost of 4 or less (FAQ ST14-002: Usopp itself may be that Character).
  ability('ST14-002.when-attacking-ko', def('ST14-002'), 'characters', 'WHEN_ATTACKING', koOpp(4), { condition: { kind: 'ALL_OF', conditions: [don1, costAtLeast(8)] } }),
  // ST14-003 Sanji: [On Play] If you have a Character with a cost of 6 or more, K.O. up to 1 opposing Character cost 5 or less.
  ability('ST14-003.on-play-ko', def('ST14-003'), 'characters', 'ON_PLAY', koOpp(5), { condition: costAtLeast(6) }),
  // ST14-004 Jinbe: [Activate: Main] [Once Per Turn] Up to 1 of your black {Straw Hat Crew} type Characters gains +2 cost
  // until the end of your opponent's next turn.
  ability('ST14-004.activate-main-cost', def('ST14-004'), 'characters', 'ACTIVATE_MAIN', plusTwoCost(), { usage: { kind: 'ONCE_PER_TURN' } }),
  // ST14-006 Nami: [Blocker]; [On Play] If you have 6 or less cards in your hand and a Character with a cost of 8 or more, draw 1.
  ability('ST14-006.on-play-draw', def('ST14-006'), 'characters', 'ON_PLAY', [draw(1)], { condition: { kind: 'ALL_OF', conditions: [{ kind: 'HAND_AT_MOST', player: 'CONTROLLER', maximum: 6 }, costAtLeast(8)] } }),
  // ST14-007 Nico Robin: [On Play]/[When Attacking] If you have a Character with a cost of 8 or more, give up to 1 of your
  // opponent's Characters −5 cost during this turn.
  ...(['ON_PLAY', 'WHEN_ATTACKING'] as const).map(timing => ability(`ST14-007.${timing === 'ON_PLAY' ? 'on-play' : 'when-attacking'}-cost`, def('ST14-007'), 'characters', timing,
    [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), addCost('target', -5)], { condition: costAtLeast(8) })),
  // ST14-008 Haredas: [Activate: Main] You may rest this Character: up to 1 black {Straw Hat Crew} Character +2 cost until the end
  // of your opponent's next turn. Then, if you have a Character with a cost of 8 or more, draw 1 card and trash 1 card from hand.
  ability('ST14-008.activate-main-cost', def('ST14-008'), 'characters', 'ACTIVATE_MAIN', [...plusTwoCost(), check('then', costAtLeast(8)), ...after('then', drawThenTrash(1, 1))], { cost: { kind: 'REST_SOURCE' } }),
  // ST14-011 Heracles: [Activate: Main] You may rest this Character: up to 1 black {Straw Hat Crew} Character +2 cost until the
  // end of your opponent's next turn.
  ability('ST14-011.activate-main-cost', def('ST14-011'), 'characters', 'ACTIVATE_MAIN', plusTwoCost(), { cost: { kind: 'REST_SOURCE' } }),
  // ST14-014 Gum-Gum Giant Rifle: [Counter] If you have a Character with a cost of 8 or more, up to 1 of your Leader or Character
  // cards gains +3000 power during this battle. [Trigger] Add up to 1 of your Character cards cost 2 or less from trash to hand.
  ability('ST14-014.counter', def('ST14-014'), 'hand', 'COUNTER', [{ ...ownLeaderOrCharacter(1, 'target'), whenCondition: costAtLeast(8) } as Step, power('target', 3000, 'THIS_BATTLE')]),
  ability('ST14-014.trigger-recover', def('ST14-014'), 'temporary', 'TRIGGER', [upTo(1, 'target', { side: 'OWN', zone: 'trash', categories: ['CHARACTER'], maxCost: 2 }), moveFromTrashToHand('target')]),
  // ST14-015 Phoenix Cannon: [Main] up to 1 of your Leader or Character cards +3000 power this turn. Then, if you have a
  // Character with a cost of 8 or more, K.O. up to 1 opposing Character cost 2 or less. [Trigger] if you have a Character with a
  // cost of 8 or more, K.O. up to 1 opposing Character cost 5 or less.
  ability('ST14-015.main-power-ko', def('ST14-015'), 'hand', 'MAIN', [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 3000, 'THIS_TURN'), ...koOpp(2, 8)]),
  ability('ST14-015.trigger-ko', def('ST14-015'), 'temporary', 'TRIGGER', koOpp(5, 8)),
  // ST14-016 I Have My Crew!!: [Main] Draw 1 card. Then, up to 1 of your Characters gains +3 cost until the end of your
  // opponent's next turn. [Trigger] K.O. up to 1 of your opponent's Characters with a cost of 3 or less.
  ability('ST14-016.main-draw-cost', def('ST14-016'), 'hand', 'MAIN', [draw(1), upTo(1, 'raised', { side: 'OWN', zone: 'characters' }), addCost('raised', 3, 'UNTIL_END_OF_OPPONENT_NEXT_TURN')]),
  ability('ST14-016.trigger-ko', def('ST14-016'), 'temporary', 'TRIGGER', koOpp(3)),
  // ST14-017 Thousand Sunny: [On Play] If your Leader has the {Straw Hat Crew} type, draw 1 card.
  ability('ST14-017.on-play-draw', def('ST14-017'), 'stage', 'ON_PLAY', [draw(1)], { condition: { kind: 'LEADER_HAS_TRAIT', trait: 'Straw Hat Crew' } }),
]
export const ST14_LOCAL_CONTINUOUS = [
  // ST14-001 Leader: [DON!! x1] All of your Characters gain +1 cost (field only, FAQ ST14-001). If you have a Character with a
  // cost of 8 or more, this Leader gains +1000 power (FAQ ST14-001: re-evaluated continuously).
  { id: 'ST14-001.don-cost-aura', definitionId: def('ST14-001'), zone: 'leader' as const, characteristic: 'COST' as const, amount: 1, minimumAttachedDon: 1, targets: { charactersOnly: true as const } },
  { id: 'ST14-001.don-power', definitionId: def('ST14-001'), zone: 'leader' as const, characteristic: 'POWER' as const, amount: 1000, minimumAttachedDon: 1, whenOwnCharacterCostAtLeast: 8 },
  // ST14-009 Franky: [DON!! x1] [Opponent's Turn] If you have a Character with a cost of 6 or more, +2000 power (and below, no
  // K.O. by the opponent's effects).
  { id: 'ST14-009.opponent-turn-power', definitionId: def('ST14-009'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 2000, minimumAttachedDon: 1, duringOpponentTurn: true as const, whenOwnCharacterCostAtLeast: 6 },
  // ST14-017 Thousand Sunny: All of your black {Straw Hat Crew} type Characters gain +1 cost (field only, FAQ ST14-017).
  { id: 'ST14-017.cost-aura', definitionId: def('ST14-017'), zone: 'stage' as const, characteristic: 'COST' as const, amount: 1, minimumAttachedDon: 0, targets: { colorsAny: ['BLACK' as const], traitsAny: ['Straw Hat Crew'], charactersOnly: true as const } },
]
export const ST14_KO_PROTECTIONS = [
  { id: 'ST14-009.no-opponent-effect-ko', definitionId: def('ST14-009'), zone: 'characters' as const, from: 'EFFECT' as const, opponentEffectsOnly: true as const, minimumAttachedDon: 1, duringOpponentTurn: true as const, whenOwnCharacterCostAtLeast: 6 },
]
export const ST14_CONDITIONAL_KEYWORDS = [
  // ST14-012 Monkey.D.Luffy: If you have a Character with a cost of 10 or more, this Character gains [Rush].
  { id: 'ST14-012.conditional-rush', definitionId: def('ST14-012'), zone: 'characters' as const, keyword: 'RUSH' as const, minimumAttachedDon: 0, whenOwnCharacterCostAtLeast: 10 },
]
const ids = (number: string) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id),
  ...[...ST14_LOCAL_CONTINUOUS, ...ST14_KO_PROTECTIONS, ...ST14_CONDITIONAL_KEYWORDS].filter(e => e.definitionId === def(number)).map(e => e.id)]

export const ST14_LOCAL_CARDS: CardInput[] = [
  card('ST14-001', { abilityIds: ids('ST14-001') }),
  ...['ST14-002', 'ST14-003', 'ST14-004', 'ST14-007', 'ST14-008', 'ST14-009', 'ST14-011', 'ST14-012', 'ST14-017'].map(n => card(n, { abilityIds: ids(n) })),
  card('ST14-006', { blocker: true, abilityIds: ids('ST14-006') }),
  card('ST14-014', { abilityIds: ids('ST14-014'), counterEvent: { abilityId: 'ST14-014.counter' } }),
  card('ST14-015', { abilityIds: ids('ST14-015') }),
  card('ST14-016', { abilityIds: ids('ST14-016') }),
]
export const ST14_LOCAL_ABILITY_DEFINITIONS = abilities
