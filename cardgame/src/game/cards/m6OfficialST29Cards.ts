import type { CardInput } from './types'
import type { EffectDefinition } from '../effects/contracts'
import { officialCard, officialDefinitionId as def } from './officialCards'
import { addToLife, after, ability, bindAll, check, draw, drawThenTrash, giveRestedDon, ko, lifeToHand, ownLeaderOrCharacter, playThisCardSteps, power, rest, trashFromHand, upTo } from './dsl'

// M6 ST-29 (YELLOW Monkey.D.Luffy, Egghead). Texts are the official English card list (series 569029) archived with the ST-29
// snapshot; the ST-29 FAQ (ST29-007, 008, 013, 014, 016) and the errata snapshot are in docs/game/evidence/m6/sources/. No runtime
// branch depends on a card number.
type Step = EffectDefinition['program'][number]
const L = 'ST-29'
const once = { kind: 'ONCE_PER_TURN' as const }
const luffyLeader = { kind: 'LEADER_NAME_IS' as const, name: 'Monkey.D.Luffy' }
/** "[Trigger] If your Leader is [Monkey.D.Luffy], play this card." */
const triggerPlayIfLuffy = (): Step[] => [check('ok', luffyLeader), ...after('ok', playThisCardSteps())]
const restByLife = (): Step[] => [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCostFromLife: 'OPPONENT' }), rest('target')]
const minusLeaderOrCharacter = (amount: number, whenCondition: Extract<Step, { kind: 'CHOICE' }>['whenCondition']): Step[] => [
  { ...upTo(1, 'minus', { side: 'OPPONENT', zone: 'leaderOrCharacters' }), whenCondition } as Step,
  { kind: 'OPERATION', operation: { primitive: 'addPower', version: '1.0.0', player: 'OPPONENT', audience: 'PUBLIC', subjectBinding: 'minus', amount, duration: 'THIS_TURN' } }]

const abilities: EffectDefinition[] = [
  // ST29-001 Leader Monkey.D.Luffy: [When Attacking] If you have 2 or less Life cards, draw 1 card and trash 1 card from your hand.
  ability('ST29-001.when-attacking-draw', def('ST29-001'), 'leader', 'WHEN_ATTACKING', drawThenTrash(1, 1), { condition: { kind: 'LIFE_AT_MOST', player: 'CONTROLLER', maximum: 2 } }),
  // ST29-002 Usopp: [On Play]/[When Attacking] Rest up to 1 opposing Character with a cost equal to or less than the opposing Life count.
  ability('ST29-002.on-play-rest', def('ST29-002'), 'characters', 'ON_PLAY', restByLife()),
  ability('ST29-002.when-attacking-rest', def('ST29-002'), 'characters', 'WHEN_ATTACKING', restByLife()),
  // ST29-003 Kaku: (+1000 with no more Life than the opponent, below); [Trigger] K.O. up to 1 opposing Character with a cost of 3 or less.
  ability('ST29-003.trigger-ko', def('ST29-003'), 'temporary', 'TRIGGER', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 3 }), ko('target')]),
  // ST29-004 Sanji: [On Play] Look at 4; reveal up to 1 {Straw Hat Crew} card to hand, the rest at the bottom. [Trigger] You may trash 1
  // card from your hand: Play this card.
  ability('ST29-004.on-play-search', def('ST29-004'), 'characters', 'ON_PLAY', [{ kind: 'SEARCH_TOP_DECK', amount: 4, traitsAny: ['Straw Hat Crew'], maxSelected: 1, bind: 'found', revealSelected: true, destination: 'hand', remainder: 'BOTTOM_ANY_ORDER' }]),
  ability('ST29-004.trigger-play', def('ST29-004'), 'temporary', 'TRIGGER', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand' }, optional: true, min: 0, max: 1, bind: 'discard', visibility: 'PRIVATE' }, trashFromHand('discard', 'discard'), ...after('discard', playThisCardSteps())]),
  ability('ST29-005.trigger-play', def('ST29-005'), 'temporary', 'TRIGGER', triggerPlayIfLuffy()),
  // ST29-007 Tony Tony.Chopper: [On K.O.] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1 card from
  // your hand to the top of your Life cards (FAQ ST29-007: not with 0 Life). [Trigger] Up to 1 of your [Monkey.D.Luffy] cards +2000 this turn.
  ability('ST29-007.on-ko-life', def('ST29-007'), 'characters', 'ON_KO', [...lifeToHand('paid'), upTo(1, 'toLife', { side: 'OWN', zone: 'hand' }, { whenBindingNonempty: 'paid' }), addToLife('toLife', 'hand', false, 'toLife')]),
  ability('ST29-007.trigger-power', def('ST29-007'), 'temporary', 'TRIGGER', [upTo(1, 'luffy', { side: 'OWN', zone: 'leaderOrCharacters', nameIs: 'Monkey.D.Luffy' }), power('luffy', 2000, 'THIS_TURN')]),
  ability('ST29-008.trigger-play', def('ST29-008'), 'temporary', 'TRIGGER', triggerPlayIfLuffy()),
  ability('ST29-009.trigger-play', def('ST29-009'), 'temporary', 'TRIGGER', triggerPlayIfLuffy()),
  // ST29-012 Monkey.D.Luffy: [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! card to 1 of your [Monkey.D.Luffy] cards.
  // [Trigger] Play this card.
  ability('ST29-012.activate-main-don', def('ST29-012'), 'characters', 'ACTIVATE_MAIN', [upTo(1, 'luffy', { side: 'OWN', zone: 'leaderOrCharacters', nameIs: 'Monkey.D.Luffy' }), ...giveRestedDon('luffy')], { usage: once }),
  ability('ST29-012.trigger-play', def('ST29-012'), 'temporary', 'TRIGGER', playThisCardSteps()),
  // ST29-013 Rob Lucci: [Trigger] K.O. up to 1 opposing Character with a cost equal to or less than the total of both players' Life
  // cards (FAQ ST29-013: the triggering card is not counted).
  ability('ST29-013.trigger-ko', def('ST29-013'), 'temporary', 'TRIGGER', [upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCostFromLife: 'TOTAL' }), ko('target')]),
  // ST29-014 Roronoa Zoro: [Rush: Character] (FAQ ST29-014: rested Characters only); [Activate: Main] [Once Per Turn] You may trash 1
  // card with a [Trigger] from your hand: Draw 1 card and give up to 1 rested DON!! card to your Leader or 1 of your Characters.
  ability('ST29-014.activate-main-draw', def('ST29-014'), 'characters', 'ACTIVATE_MAIN', [
    { kind: 'CHOICE', choiceType: 'SELECT', selector: { kind: 'CARDS', side: 'OWN', zone: 'hand', hasTrigger: true }, optional: true, min: 0, max: 1, bind: 'paid', visibility: 'PRIVATE' }, trashFromHand('paid', 'paid'),
    ...after('paid', [draw(1), ownLeaderOrCharacter(1, 'donTarget'), ...giveRestedDon('donTarget')])], { usage: once }),
  // ST29-015 Raw Heat Strike: [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if you have
  // 1 or less Life cards, give up to 1 opposing Leader or Character -2000 power during this turn. [Trigger] Draw 1 card.
  ability('ST29-015.counter', def('ST29-015'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 2000, 'THIS_BATTLE'), ...minusLeaderOrCharacter(-2000, { kind: 'LIFE_AT_MOST', player: 'CONTROLLER', maximum: 1 })]),
  ability('ST29-015.trigger-draw', def('ST29-015'), 'temporary', 'TRIGGER', [draw(1)]),
  // ST29-016 Kizaru!! ...: [Main] Your [Monkey.D.Luffy] Leader gains [Unblockable] during this turn (FAQ ST29-016: an effect may still
  // change the target). [Counter] Your Leader gains +3000 power during this battle.
  ability('ST29-016.main-unblockable', def('ST29-016'), 'hand', 'MAIN', [bindAll('leader', { side: 'OWN', zone: 'leader', nameIs: 'Monkey.D.Luffy' }),
    { kind: 'OPERATION', operation: { primitive: 'grantKeyword', version: '1.0.0', audience: 'PUBLIC', keyword: 'UNBLOCKABLE', duration: 'THIS_TURN', subjectBinding: 'leader' }, whenBindingNonempty: 'leader' }]),
  ability('ST29-016.counter', def('ST29-016'), 'hand', 'COUNTER', [bindAll('leader', { side: 'OWN', zone: 'leader' }), power('leader', 3000, 'THIS_BATTLE')]),
  // ST29-017 Iai Death Lion Song: [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if you
  // have 2 or less Life cards, K.O. up to 1 opposing Character with a cost of 3 or less. [Trigger] Draw 2 cards and trash 1 from hand.
  ability('ST29-017.counter', def('ST29-017'), 'hand', 'COUNTER', [ownLeaderOrCharacter(1, 'boosted'), power('boosted', 4000, 'THIS_BATTLE'),
    { ...upTo(1, 'target', { side: 'OPPONENT', zone: 'characters', maxCost: 3 }), whenCondition: { kind: 'LIFE_AT_MOST', player: 'CONTROLLER', maximum: 2 } } as Step, ko('target')]),
  ability('ST29-017.trigger-draw', def('ST29-017'), 'temporary', 'TRIGGER', drawThenTrash(2, 1)),
]
export const ST29_OFFICIAL_CONTINUOUS = [
  // ST29-003 Kaku: If the number of your Life cards is equal to or less than the number of your opponent's Life cards, +1000 power.
  { id: 'ST29-003.life-power', definitionId: def('ST29-003'), zone: 'characters' as const, characteristic: 'POWER' as const, amount: 1000, minimumAttachedDon: 0, whenOwnLifeAtMostOpponent: true as const },
]
// ST29-008 Nami: If your {Egghead} type Character would be K.O.'d by your opponent's effect, you may turn 1 card from the top of your Life
// cards face-up instead (FAQ ST29-008: not when it is already face-up).
export const ST29_OFFICIAL_REPLACEMENTS = [{ id: 'ST29-008.guard-life-face-up', definitionId: def('ST29-008'), zone: 'characters' as const, match: 'GUARD' as const, event: 'KO' as const, cause: 'OPPONENT_EFFECT' as const,
  protects: { traitsAny: ['Egghead'] }, action: 'TURN_LIFE_FACE_UP' as const, usage: 'UNLIMITED' as const }]
const ids = (number: string, extra: string[] = []) => [...abilities.filter(e => e.source.kind === 'CARD_DEFINITION' && e.source.definitionId === def(number)).map(e => e.id), ...extra]
export const ST29_OFFICIAL_CARDS: CardInput[] = [
  officialCard(L, 'ST29-001', { abilityIds: ids('ST29-001') }),
  officialCard(L, 'ST29-002', { abilityIds: ids('ST29-002') }),
  officialCard(L, 'ST29-003', { abilityIds: ids('ST29-003', ['ST29-003.life-power']) }),
  officialCard(L, 'ST29-004', { abilityIds: ids('ST29-004') }),
  officialCard(L, 'ST29-005', { abilityIds: ids('ST29-005') }),
  officialCard(L, 'ST29-007', { abilityIds: ids('ST29-007') }),
  officialCard(L, 'ST29-008', { abilityIds: ids('ST29-008', ['ST29-008.guard-life-face-up']) }),
  officialCard(L, 'ST29-009', { blocker: true, abilityIds: ids('ST29-009') }),
  officialCard(L, 'ST29-012', { abilityIds: ids('ST29-012') }),
  officialCard(L, 'ST29-013', { abilityIds: ids('ST29-013') }),
  officialCard(L, 'ST29-014', { keywords: ['RUSH_CHARACTER'], abilityIds: ids('ST29-014') }),
  officialCard(L, 'ST29-015', { abilityIds: ids('ST29-015'), counterEvent: { abilityId: 'ST29-015.counter' } }),
  officialCard(L, 'ST29-016', { abilityIds: ids('ST29-016'), counterEvent: { abilityId: 'ST29-016.counter' } }),
  officialCard(L, 'ST29-017', { abilityIds: ids('ST29-017'), counterEvent: { abilityId: 'ST29-017.counter' } }),
]
export const ST29_OFFICIAL_ABILITY_DEFINITIONS = abilities
