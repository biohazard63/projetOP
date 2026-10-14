import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { ability, draw, ko, opponentPower, ownLeaderOrCharacter, playChosen, power, upTo, giveRestedDon } from './dsl'

// M6 ST-21 (EX Gear 5). Texts are the official English card list (series 569021) archived with the ST-21 snapshot; the ST-21
// FAQ (ST21-003, ST21-015, ST21-017) and the errata snapshot are in docs/game/evidence/m6/sources/.
type Step = EffectDefinition['program'][number]
const L = 'ST-21'
const don2 = { kind: 'SOURCE_ATTACHED_DON_AT_LEAST' as const, minimum: 2 }
const strawHat = ['Straw Hat Crew']
/** "Give up to N rested DON!! cards to <bound card>". */
const giveDon = (n: number, target: string): Step[] => [upTo(n, 'restedDon', { side: 'OWN', zone: 'cost', rested: true }),
  { kind: 'OPERATION', operation: { primitive: 'attachRestedDon', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'restedDon', targetBinding: target } }]
const koPower = (maxPower: number): Step[] => [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxPower }), ko('target')]
const once = { kind: 'ONCE_PER_TURN' as const }
const molePistol = (): Step[] => [upTo(1, 'weakened', { side: 'OPPONENT', zone: 'characters' }), opponentPower(-5000, 'weakened'),
  { ...upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxPower: 2000 }), whenCondition: { kind: 'OWN_CHARACTER_POWER_AT_LEAST', minimum: 6000 } } as Step, ko('target')]

const abilities: EffectDefinition[] = [
  // ST21-001 Leader: [DON!! x1] [Activate: Main] [Once Per Turn] Give up to 2 rested DON!! cards to 1 of your Characters.
  ability('ST21-001.activate-main-don', def('ST21-001'), 'leader', 'ACTIVATE_MAIN', [upTo(1, 'donTarget', { side: 'OWN', zone: 'characters' }), ...giveDon(2, 'donTarget')],
    { condition: { kind: 'SOURCE_ATTACHED_DON_AT_LEAST', minimum: 1 }, usage: once }),
  // ST21-003 Sanji: [On Play] Select up to 1 of your {Straw Hat Crew} type Characters with 6000 power or more. If the selected
  // Character attacks during this turn, your opponent cannot activate [Blocker] (FAQ ST21-003: only that Character's attacks).
  ability('ST21-003.on-play-prevent-blocker', def('ST21-003'), 'characters', 'ON_PLAY', [upTo(1, 'attacker', { side: 'OWN', zone: 'characters', traitsAny: strawHat, minPower: 6000 }),
    { kind: 'OPERATION', operation: { primitive: 'preventBlocker', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'attacker', duration: 'THIS_TURN' }, whenBindingNonempty: 'attacker' }]),
  // ST21-004 Jewelry Bonney: [DON!! x2] [On K.O.] Draw 1 card (the given DON!! are counted when it is K.O.'d).
  ability('ST21-004.on-ko-draw', def('ST21-004'), 'characters', 'ON_KO', [draw(1)], { condition: don2 }),
  // ST21-009 Nami: [Activate: Main] [Once Per Turn] Give up to 2 rested DON!! cards to 1 of your {Straw Hat Crew} type Leader or
  // Character cards.
  ability('ST21-009.activate-main-don', def('ST21-009'), 'characters', 'ACTIVATE_MAIN', [upTo(1, 'donTarget', { side: 'OWN', zone: 'leaderOrCharacters', traitsAny: strawHat }), ...giveDon(2, 'donTarget')], { usage: once }),
  // ST21-010 Nico Robin: [DON!! x2] [When Attacking] K.O. up to 1 opposing Character with 4000 power or less.
  ability('ST21-010.when-attacking-ko', def('ST21-010'), 'characters', 'WHEN_ATTACKING', koPower(4000), { condition: don2 }),
  // ST21-012 Brook: [When Attacking] Give up to 2 rested DON!! cards to your Leader or 1 of your Characters.
  ability('ST21-012.when-attacking-don', def('ST21-012'), 'characters', 'WHEN_ATTACKING', [ownLeaderOrCharacter(1, 'donTarget'), ...giveDon(2, 'donTarget')]),
  // ST21-014 Monkey.D.Luffy: [Rush]; [When Attacking] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.
  ability('ST21-014.when-attacking-don', def('ST21-014'), 'characters', 'WHEN_ATTACKING', [ownLeaderOrCharacter(1, 'donTarget'), ...giveRestedDon('donTarget')]),
  // ST21-015 Roronoa Zoro: [On K.O.] Play up to 1 red Character card with 6000 power or less other than [Roronoa Zoro] from your
  // hand (FAQ ST21-015: no other [Roronoa Zoro]).
  ability('ST21-015.on-ko-play', def('ST21-015'), 'characters', 'ON_KO', playChosen('target', 'hand', { categories: ['CHARACTER'], colorsAny: ['RED'], maxPower: 6000, nameNot: 'Roronoa Zoro' })),
  // ST21-016 Gum-Gum Dawn Whip: [Main] Up to 1 of your Leader or Character cards gains +1000 power during this turn. Then, up to 1
  // of your opponent's Characters with 4000 power or less cannot activate [Blocker] during this turn. [Trigger] K.O. up to 1
  // opposing Character with 4000 power or less.
  ability('ST21-016.main-power-blocker', def('ST21-016'), 'hand', 'MAIN', [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 1000, 'THIS_TURN'),
    upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxPower: 4000 }), { kind: 'OPERATION', operation: { primitive: 'disableBlocker', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'target', duration: 'THIS_TURN' } }]),
  ability('ST21-016.trigger-ko', def('ST21-016'), 'temporary', 'TRIGGER', koPower(4000)),
  // ST21-017 Gum-Gum Mole Pistol: [Main] Give up to 1 opposing Character −5000 power during this turn. Then, if you have a
  // Character with 6000 power or more, K.O. up to 1 opposing Character with 2000 power or less (FAQ ST21-017: may be another
  // Character). [Trigger] Activate this card's [Main] effect.
  ability('ST21-017.main-power-ko', def('ST21-017'), 'hand', 'MAIN', molePistol()),
  ability('ST21-017.trigger-power-ko', def('ST21-017'), 'temporary', 'TRIGGER', molePistol()),
]
export const ST21_OFFICIAL_CONTINUOUS = [
  // ST21-002 Usopp: [DON!! x2] [Opponent's Turn] This Character gains +2000 power.
  { id: 'ST21-002.opponent-turn-power', definitionId: def('ST21-002'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 2000, minimumAttachedDon: 2, duringOpponentTurn: true as const },
  // ST21-011 Franky: [DON!! x2] [Opponent's Turn] All of your {Straw Hat Crew} type Characters with 4000 base power or less gain
  // +1000 power.
  { id: 'ST21-011.opponent-turn-aura', definitionId: def('ST21-011'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 1000, minimumAttachedDon: 2, duringOpponentTurn: true as const,
    targets: { traitsAny: strawHat, charactersOnly: true as const, maxBasePower: 4000 } },
]
export const ST21_OFFICIAL_CONDITIONAL_KEYWORDS = [
  // ST21-015 Roronoa Zoro: [DON!! x2] This Character gains [Rush].
  { id: 'ST21-015.conditional-rush', definitionId: def('ST21-015'), zone: 'characters' as const, keyword: 'RUSH' as const, minimumAttachedDon: 2 },
]
const ids = (number: string) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id),
  ...[...ST21_OFFICIAL_CONTINUOUS, ...ST21_OFFICIAL_CONDITIONAL_KEYWORDS].filter(e => e.definitionId === def(number)).map(e => e.id)]
export const ST21_OFFICIAL_CARDS: CardInput[] = [
  ...['ST21-001', 'ST21-002', 'ST21-003', 'ST21-004', 'ST21-009', 'ST21-010', 'ST21-011', 'ST21-012', 'ST21-015', 'ST21-016', 'ST21-017'].map(n => officialCard(L, n, { abilityIds: ids(n) })),
  officialCard(L, 'ST21-014', { keywords: ['RUSH'], abilityIds: ids('ST21-014') }),
]
export const ST21_OFFICIAL_ABILITY_DEFINITIONS = abilities
