import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { after, ability, bindAll, check, draw, drawThenTrash, playChosen, power, rest, setActive, upTo } from './dsl'

// M6 ST-24 (GREEN Jewelry Bonney) cards and their OP07/EB01 reprints; ST24-005 is certified with ST-32. Texts are the official
// English card list (series 569024) archived with the ST-24 snapshot; the ST-23-28 FAQ (ST24-002, ST24-004), the OP-07 FAQ (OP07-019,
// OP07-031) and the errata snapshot are in docs/game/evidence/m6/sources/. The ST-24 composition stays unverified
// (scripts/starterAudit/product-evidence.json): these cards are certified, the deck is not offered. No runtime branch depends on a
// card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-24'
const once = { kind: 'ONCE_PER_TURN' as const }
const supernovas = ['Supernovas']
const restOpposing = (maxCost: number): Step[] => [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost }), rest('target')]
const donActive = (): Step[] => [upTo(1, 'don', { side: 'OWN', zone: 'cost', rested: true }), setActive('don')]
const novaSearch = (exclude?: string): Step => ({ kind: 'SEARCH_TOP_DECK', amount: 5, traitsAny: supernovas, ...(exclude ? { excludeRulesName: exclude } : {}), maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' })

const abilities: EffectDefinition[] = [
  // OP07-019 Leader Jewelry Bonney: [On Your Opponent's Attack] [Once Per Turn] You may rest 1 of your DON!! cards: Rest up to 1 of your
  // opponent's Leader or Character cards (FAQ OP07-019: declining keeps it for a later attack).
  ability('OP07-019.opponent-attack-rest', def('OP07-019'), 'leader', 'ON_OPPONENT_ATTACK', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'cost', rested: false }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC', skipIfNone: true },
    rest('paid'), ...after('paid', [upTo(1, 'target', { side: 'OPPONENT', zone: 'leaderOrCharacters' }), rest('target')])], { usage: { kind: 'ONCE_PER_TURN_WHEN_CHOSEN' } }),
  // EB01-015 Scratchmen Apoo: [On Play] Rest up to 1 of your opponent's Characters with a cost of 2 or less.
  ability('EB01-015.on-play-rest', def('EB01-015'), 'characters', 'ON_PLAY', restOpposing(2)),
  // OP07-021 Urouge: [Blocker]; [End of Your Turn] Set up to 1 of your DON!! cards as active.
  ability('OP07-021.end-of-turn-don', def('OP07-021'), 'characters', 'END_OF_YOUR_TURN', donActive()),
  // OP07-025 Coribou: [On Play] Play up to 1 [Caribou] with a cost of 4 or less from your hand rested.
  ability('OP07-025.on-play-play', def('OP07-025'), 'characters', 'ON_PLAY', playChosen('play', 'hand', { categories: ['CHARACTER'], nameIs: 'Caribou', maxCost: 4 }, { rested: true })),
  // OP07-031 Bartolomeo: [Blocker]; [Your Turn] [Once Per Turn] If a Character is rested by your effect, draw 1 card and trash 1 card
  // from your hand (FAQ OP07-031: also a Character rested to pay an [Activate: Main] cost).
  ability('OP07-031.rested-by-effect-draw', def('OP07-031'), 'characters', 'ON_CHARACTER_RESTED_BY_OWN_EFFECT', drawThenTrash(1, 1), { condition: { kind: 'YOUR_TURN' }, usage: once }),
  // OP07-034 Roronoa Zoro: [When Attacking] If you have 3 or more Characters, this Character gains +2000 power during this turn.
  ability('OP07-034.when-attacking-power', def('OP07-034'), 'characters', 'WHEN_ATTACKING', [bindAll('self', { side: 'OWN', zone: 'characters', isSource: true }), power('self', 2000, 'THIS_TURN')],
    { condition: { kind: 'OWN_CHARACTERS_AT_LEAST', minimum: 3 } }),
  // OP07-036 Demonic Aura Nine-Sword Style Asura Demon Nine Flash: [Main] Up to 1 of your Leader or Character cards gains +3000 power
  // during this turn. Then, you may rest 1 of your Characters with a cost of 3 or more. If you do, rest up to 1 of your opponent's
  // Characters with a cost of 5 or less. [Trigger] Rest up to 1 of your opponent's Characters with a cost of 4 or less.
  ability('OP07-036.main-power-rest', def('OP07-036'), 'hand', 'MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'OWN_LEADER_OR_CHARACTER' }, optional: true, min: 0, max: 1, bind: 'boosted', visibility: 'PUBLIC' }, power('boosted', 3000, 'THIS_TURN'),
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters', minCost: 3, rested: false }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC' },
    rest('paid'), ...after('paid', restOpposing(5))]),
  ability('OP07-036.trigger-rest', def('OP07-036'), 'temporary', 'TRIGGER', restOpposing(4)),
  // OP07-037 More Pizza!!: [Main] Look at 5; reveal up to 1 {Supernovas} card other than [More Pizza!!] to hand, the rest at the bottom.
  // [Trigger] Draw 1 card.
  ability('OP07-037.main-search', def('OP07-037'), 'hand', 'MAIN', [novaSearch('More Pizza!!')]),
  ability('OP07-037.trigger-draw', def('OP07-037'), 'temporary', 'TRIGGER', [draw(1)]),
  // ST24-001 Capone"Gang"Bege: [Blocker]; [On Play] If you have 6 or more rested cards, draw 1 card and trash 1 card from your hand.
  ability('ST24-001.on-play-draw', def('ST24-001'), 'characters', 'ON_PLAY', drawThenTrash(1, 1), { condition: { kind: 'OWN_RESTED_CARDS_AT_LEAST', minimum: 6 } }),
  // ST24-002 Kid & Killer: [On Play] Look at 5; reveal up to 1 {Supernovas} card to hand, the rest at the bottom. [On Your Opponent's
  // Attack] You may trash this Character: Set up to 1 of your DON!! cards as active (FAQ ST24-002).
  ability('ST24-002.on-play-search', def('ST24-002'), 'characters', 'ON_PLAY', [novaSearch()]),
  ability('ST24-002.opponent-attack-don', def('ST24-002'), 'characters', 'ON_OPPONENT_ATTACK', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters', isSource: true }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PUBLIC', skipIfNone: true },
    { kind: 'OPERATION', operation: { primitive: 'trashCharacter', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'paid' }, whenBindingNonempty: 'paid' }, ...after('paid', donActive())]),
  // ST24-003 Basil Hawkins: [End of Your Turn] Set up to 1 of your DON!! cards as active.
  ability('ST24-003.end-of-turn-don', def('ST24-003'), 'characters', 'END_OF_YOUR_TURN', donActive()),
  // ST24-004 Law & Bepo: [On Play] Rest up to 1 of your opponent's Characters and that Character will not become active in your
  // opponent's next Refresh Phase. Then, if your opponent has 2 or more rested Characters, your Leader gains +2000 power until the end
  // of your opponent's next End Phase (FAQ ST24-004: also with no active opposing Character).
  ability('ST24-004.on-play-rest', def('ST24-004'), 'characters', 'ON_PLAY', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), rest('target'),
    { kind: 'OPERATION', operation: { primitive: 'lockRefresh', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'target' }, whenBindingNonempty: 'target' },
    check('two', { kind: 'OPPONENT_RESTED_CHARACTERS_AT_LEAST', minimum: 2 }), bindAll('leader', { side: 'OWN', zone: 'leader' }),
    { kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'CONTROLLER', audience: 'PUBLIC', subjectBinding: 'leader', amount: 2000, duration: 'UNTIL_END_OF_OPPONENT_NEXT_TURN' }, whenBindingNonempty: 'two' }]),
]
export const ST24_OFFICIAL_CONTINUOUS = [
  // OP07-023 Caribou: If you have 6 or more rested DON!! cards, this Character gains +1000 power.
  { id: 'OP07-023.rested-don-power', definitionId: def('OP07-023'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 1000, minimumAttachedDon: 0, minimumRestedDon: 6 },
]
// OP07-033 Monkey.D.Luffy: If you have 3 or more Characters, your Characters with a cost of 3 or less other than [Monkey.D.Luffy]
// cannot be K.O.'d by your opponent's effects.
export const ST24_OFFICIAL_KO_PROTECTIONS = [{ id: 'OP07-033.aura-no-opponent-effect-ko', definitionId: def('OP07-033'), zone: 'characters' as const, from: 'EFFECT' as const, opponentEffectsOnly: true as const, aura: { maxCost: 3, nameNot: 'Monkey.D.Luffy' }, minimumOwnCharacters: 3 }]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST24_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'OP07-019', { abilityIds: ids('OP07-019') }),
  officialCard(L, 'EB01-015', { abilityIds: ids('EB01-015') }),
  officialCard(L, 'OP07-021', { blocker: true, abilityIds: ids('OP07-021') }),
  officialCard(L, 'OP07-023', { blocker: true, abilityIds: ['OP07-023.rested-don-power'] }),
  officialCard(L, 'OP07-025', { abilityIds: ids('OP07-025') }),
  officialCard(L, 'OP07-031', { blocker: true, abilityIds: ids('OP07-031') }),
  officialCard(L, 'OP07-033', { abilityIds: ['OP07-033.aura-no-opponent-effect-ko'] }),
  officialCard(L, 'OP07-034', { abilityIds: ids('OP07-034') }),
  officialCard(L, 'OP07-036', { abilityIds: ids('OP07-036') }),
  officialCard(L, 'OP07-037', { abilityIds: ids('OP07-037') }),
  officialCard(L, 'ST24-001', { blocker: true, abilityIds: ids('ST24-001') }),
  officialCard(L, 'ST24-002', { abilityIds: ids('ST24-002') }),
  officialCard(L, 'ST24-003', { abilityIds: ids('ST24-003') }),
  officialCard(L, 'ST24-004', { abilityIds: ids('ST24-004') }),
]
export const ST24_OFFICIAL_ABILITY_DEFINITIONS = abilities
