import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { after, ability, check, giveRestedDon, ko, opponentPower, ownLeaderOrCharacter, power, trashFromHand, upTo } from './dsl'

// M6 ST-15 (RED Edward.Newgate) and the cards it reprints (OP02, OP03). Texts are the official English card list (series 569015)
// archived with the ST-15 snapshot; the ST-15-20 FAQ (ST15-004), the OP-02 FAQ (OP02-001, OP02-018, OP02-023) and the errata
// snapshot are in docs/game/evidence/m6/sources/. No runtime branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-15'
const once = { kind: 'ONCE_PER_TURN' as const }
const whitebeard = 'Whitebeard Pirates'
const wbLeader = { kind: 'LEADER_TRAIT_INCLUDES' as const, text: whitebeard }
/** "Add 1 card from the top of your Life cards to your hand" (mandatory; nothing with no Life or while locked, FAQ OP02-001/ST15-004). */
const topLifeToHand = (bind = 'life'): Step[] => [
  { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'life', lifeEnd: 'TOP' }, optional: false, min: 1, max: 1, bind, visibility: 'PUBLIC', skipIfNone: true, whenCondition: { kind: 'CAN_ADD_LIFE_TO_HAND' } },
  { kind: 'OPERATION', operation: { primitive: 'lifeToHand', version: '1.0.0', audience: 'CONTROLLER', subjectBinding: bind } }]
const lockLife: Step = { kind: 'OPERATION', operation: { primitive: 'lockLifeToHand', version: '1.0.0', audience: 'PUBLIC', duration: 'THIS_TURN' } }
const leaderPower = (amount: number): Step[] => [upTo(1, 'leader', { side: 'OWN', zone: 'leader' }), power('leader', amount, 'THIS_TURN')]

const abilities: EffectDefinition[] = [
  // OP02-001 Leader Edward.Newgate: [End of Your Turn] Add 1 card from the top of your Life cards to your hand (FAQ OP02-001: with
  // no Life nothing happens and this does not cause a loss).
  ability('OP02-001.end-of-turn-life', def('OP02-001'), 'leader', 'END_OF_YOUR_TURN', topLifeToHand()),
  // OP02-018 Marco: [Blocker]; [On K.O.] You may trash 1 card with a type including "Whitebeard Pirates" from your hand: If you have
  // 2 or less Life cards, play this Character card from your trash rested (FAQ OP02-018: it is then a new card).
  ability('OP02-018.on-ko-replay', def('OP02-018'), 'characters', 'ON_KO', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand', traitIncludesAny: [whitebeard] }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE' },
    trashFromHand('paid', 'paid'),
    ...after('paid', [{ kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'trash', isSource: true }, optional: false, min: 1, max: 1, bind: 'self', visibility: 'PUBLIC', skipIfNone: true, whenCondition: { kind: 'LIFE_AT_MOST', player: 'CONTROLLER', maximum: 2 } },
      { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'characters' }, optional: false, min: 1, max: 1, bind: 'self.replace', visibility: 'PUBLIC', whenBindingNonempty: 'self', whenCondition: { kind: 'OWN_CHARACTERS_AT_LEAST', minimum: 5 } },
      { kind: 'OPERATION', operation: { primitive: 'playCard', version: '1.0.0', audience: 'PUBLIC', subjectBinding: 'self', from: 'trash', replaceBinding: 'self.replace', rested: true } }])]),
  // OP02-023 You May Be a Fool...but I Still Love You: [Main] If you have 3 or less Life cards, you cannot add Life cards to your
  // hand using your own effects during this turn (FAQ OP02-023: current Life; with 4 or more nothing happens; "You may add 1
  // card from the top of your Life cards to your hand:" costs cannot be paid). [Trigger] Up to 1 of your Leader +1000 this turn.
  ability('OP02-023.main-lock', def('OP02-023'), 'hand', 'MAIN', [{ ...lockLife, whenCondition: { kind: 'LIFE_AT_MOST', player: 'CONTROLLER', maximum: 3 } }]),
  ability('OP02-023.trigger-power', def('OP02-023'), 'temporary', 'TRIGGER', leaderPower(1000)),
  // OP03-003 Izo: [On Play] Look at 5 cards from the top of your deck; reveal up to 1 card with a type including "Whitebeard
  // Pirates" other than [Izo] and add it to your hand. Then, place the rest at the bottom of your deck in any order.
  ability('OP03-003.on-play-search', def('OP03-003'), 'characters', 'ON_PLAY', [{ kind: 'SEARCH_TOP_DECK', amount: 5, traitIncludesAny: [whitebeard], excludeRulesName: 'Izo', maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }]),
  // OP03-009 Haruta: [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.
  ability('OP03-009.activate-main-don', def('OP03-009'), 'characters', 'ACTIVATE_MAIN', [ownLeaderOrCharacter(1, 'donTarget'), ...giveRestedDon('donTarget')], { usage: once }),
  // ST15-001 Atmos: [When Attacking] If your Leader is [Edward.Newgate], you cannot add Life cards to your hand using your own
  // effects during this turn.
  ability('ST15-001.when-attacking-lock', def('ST15-001'), 'characters', 'WHEN_ATTACKING', [lockLife], { condition: { kind: 'LEADER_NAME_IS', name: 'Edward.Newgate' } }),
  // ST15-002 Edward.Newgate: [On Play] Give up to 1 rested DON!! card to your Leader or 1 of your Characters. [Activate: Main] You
  // may rest this Character: K.O. up to 1 of your opponent's Characters with 5000 power or less.
  ability('ST15-002.on-play-don', def('ST15-002'), 'characters', 'ON_PLAY', [ownLeaderOrCharacter(1, 'donTarget'), ...giveRestedDon('donTarget')]),
  ability('ST15-002.activate-main-ko', def('ST15-002'), 'characters', 'ACTIVATE_MAIN', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxPower: 5000 }), ko('target')], { cost: { kind: 'REST_SOURCE' } }),
  // ST15-003 Kingdew: [Blocker]; [Opponent's Turn] When this Character is K.O.'d by an effect, up to 1 of your Leader gains +2000
  // power during this turn.
  ability('ST15-003.on-ko-power', def('ST15-003'), 'characters', 'ON_KO', leaderPower(2000), { condition: { kind: 'ALL_OF', conditions: [{ kind: 'OPPONENT_TURN' }, { kind: 'KO_BY_EFFECT' }] } }),
  // ST15-004 Thatch: [On Play] If your Leader's type includes "Whitebeard Pirates", give up to 1 of your opponent's Characters
  // -2000 power during this turn. Then, add 1 card from the top of your Life cards to your hand (FAQ ST15-004: with such a Leader
  // the Life card is added whenever possible, even if no power is given; FAQ EB03-017 and OP14-112: when the Leader condition
  // is not met, the "Then," part is not applied either).
  ability('ST15-004.on-play-power-life', def('ST15-004'), 'characters', 'ON_PLAY', [check('wb', wbLeader),
    ...after('wb', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters' }), opponentPower(-2000), ...topLifeToHand()])]),
]
export const ST15_OFFICIAL_CONTINUOUS = [
  // OP02-019 Rakuyo: [DON!! x1] [Your Turn] All of your Characters with a type including "Whitebeard Pirates" gain +1000 power.
  { id: 'OP02-019.your-turn-aura', definitionId: def('OP02-019'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 1000, minimumAttachedDon: 1, duringYourTurn: true as const, targets: { charactersOnly: true as const, traitIncludesAny: [whitebeard] } },
]
export const ST15_OFFICIAL_CONDITIONAL_KEYWORDS = [
  // OP02-008 Jozu: [DON!! x1] If you have 2 or less Life cards and your Leader's type includes "Whitebeard Pirates", [Rush].
  { id: 'OP02-008.conditional-rush', definitionId: def('OP02-008'), zone: 'characters' as const, keyword: 'RUSH' as const, minimumAttachedDon: 1, maximumOwnLife: 2, leaderTraitIncludes: whitebeard },
  // ST15-005 Portgas.D.Ace: If your Leader's type includes "Whitebeard Pirates", this Character gains [Rush].
  { id: 'ST15-005.conditional-rush', definitionId: def('ST15-005'), zone: 'characters' as const, keyword: 'RUSH' as const, minimumAttachedDon: 0, leaderTraitIncludes: whitebeard },
]
// ST15-005 Portgas.D.Ace: [Once Per Turn] If this Character would be removed from the field by your opponent's effect, you may
// give this Character -2000 power during this turn instead.
export const ST15_OFFICIAL_REPLACEMENTS = [{ id: 'ST15-005.guard-power', definitionId: def('ST15-005'), zone: 'characters' as const, match: 'GUARD' as const, event: 'REMOVAL' as const, cause: 'OPPONENT_EFFECT' as const,
  protects: { self: true as const }, action: 'POWER_THIS_TURN' as const, amount: -2000, usage: 'ONCE_PER_TURN' as const }]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST15_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'OP02-001', { abilityIds: ids('OP02-001') }),
  officialCard(L, 'OP02-008', { abilityIds: ids('OP02-008', ['OP02-008.conditional-rush']) }),
  officialCard(L, 'OP02-018', { blocker: true, abilityIds: ids('OP02-018') }),
  officialCard(L, 'OP02-019', { abilityIds: ids('OP02-019', ['OP02-019.your-turn-aura']) }),
  officialCard(L, 'OP02-023', { abilityIds: ids('OP02-023') }),
  officialCard(L, 'OP03-003', { abilityIds: ids('OP03-003') }),
  officialCard(L, 'OP03-009', { abilityIds: ids('OP03-009') }),
  officialCard(L, 'ST15-001', { abilityIds: ids('ST15-001') }),
  officialCard(L, 'ST15-002', { abilityIds: ids('ST15-002') }),
  officialCard(L, 'ST15-003', { blocker: true, abilityIds: ids('ST15-003') }),
  officialCard(L, 'ST15-004', { abilityIds: ids('ST15-004') }),
  officialCard(L, 'ST15-005', { abilityIds: ids('ST15-005', ['ST15-005.conditional-rush', 'ST15-005.guard-power']) }),
]
export const ST15_OFFICIAL_ABILITY_DEFINITIONS = abilities
