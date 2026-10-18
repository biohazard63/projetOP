import { z } from 'zod'

const id = z.string().regex(/^[A-Za-z0-9_:@.-]{1,256}$/).refine(value => !['__proto__', 'prototype', 'constructor'].includes(value))
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const player = z.enum(['CONTROLLER', 'OPPONENT'])
export const presenceSchema = z.strictObject({ instanceId: id, generation: integer })
export const sourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('SYNTHETIC'), extension: id }),
  z.strictObject({ kind: z.literal('CARD'), presence: presenceSchema, definitionId: id }),
  // 'delayed': the "at the end of this turn" part scheduled by its own card (wherever that card is then); it resolves after all
  // [End of Your Turn] effects (FAQ ST24-005). 'trash' is the earlier form, kept readable for saved games.
  z.strictObject({ kind: z.literal('CARD_DEFINITION'), definitionId: id, zone: z.enum(['leader', 'characters', 'stage', 'temporary', 'hand', 'trash', 'delayed']) }),
])
export type EffectSource = z.infer<typeof sourceSchema>
const baseConditions = [
  z.strictObject({ kind: z.literal('ALWAYS') }),
  z.strictObject({ kind: z.literal('DON_AVAILABLE'), player }),
  z.strictObject({ kind: z.literal('SOURCE_ATTACHED_DON_AT_LEAST'), minimum: integer.max(10) }),
  z.strictObject({ kind: z.literal('HAND_AT_MOST'), player, maximum: integer.max(50) }),
  z.strictObject({ kind: z.literal('OPPONENT_CHARACTER_POWER_AT_LEAST'), minimum: z.number().int(), powerBasis: z.enum(['CURRENT', 'BASE']).default('CURRENT') }),
  z.strictObject({ kind: z.literal('HAND_AT_LEAST'), player, minimum: integer.min(1).max(50), traitsAny: z.array(z.string().min(1).max(128)).min(1).max(8).optional() }),
  z.strictObject({ kind: z.literal('OPPONENT_MORE_FIELD_DON') }),
  // The source is in the current battle and the card it battles is a Character with this attribute.
  z.strictObject({ kind: z.literal('BATTLE_OPPONENT_ATTRIBUTE'), attribute: z.enum(['STRIKE', 'SLASH', 'RANGED', 'SPECIAL', 'WISDOM']) }),
  z.strictObject({ kind: z.literal('OWN_CHARACTERS_AT_LEAST'), minimum: integer.min(1).max(5) }),
  z.strictObject({ kind: z.literal('FIELD_CHARACTER_COST_AT_MOST'), maximum: integer.max(20) }),
  // "If you have a Character with a cost of N or more" (current cost, continuous modifiers included).
  z.strictObject({ kind: z.literal('OWN_CHARACTER_COST_AT_LEAST'), minimum: integer.min(1).max(20) }),
  // "If this Character was played on this turn".
  z.strictObject({ kind: z.literal('SOURCE_PLAYED_THIS_TURN') }),
  // "If you have N or more rested Characters".
  z.strictObject({ kind: z.literal('OWN_RESTED_CHARACTERS_AT_LEAST'), minimum: integer.min(1).max(5) }),
  // The number of your Characters with a current cost of minCost or more is between atLeast and atMost ("if you do not have 5
  // Characters with a cost of 5 or more": atMost 4).
  // Optional filters: type, name, printed (base) power bounds ("2 or more Characters with 6000 base power", FAQ ST30-015).
  z.strictObject({ kind: z.literal('OWN_CHARACTER_COUNT'), minCost: integer.max(20), atLeast: integer.max(5).optional(), atMost: integer.max(5).optional(), traitsAny: z.array(z.string().min(1).max(128)).min(1).max(8).optional(), nameIs: z.string().min(1).max(128).optional(), minBasePower: integer.max(100000).optional(), maxBasePower: integer.max(100000).optional() }),
  // "If you have a Character with N power or more" (current power).
  z.strictObject({ kind: z.literal('OWN_CHARACTER_POWER_AT_LEAST'), minimum: z.number().int().min(0).max(100000) }),
  // The controller's trash holds N or more cards (a cost that places a trash card elsewhere needs one, FAQ ST19-004).
  z.strictObject({ kind: z.literal('TRASH_AT_LEAST'), minimum: integer.min(1).max(60) }),
  z.strictObject({ kind: z.literal('DON_DECK_AT_LEAST'), minimum: integer.min(1).max(10) }),
  z.strictObject({ kind: z.literal('LEADER_HAS_TRAIT'), trait: z.string().min(1).max(128) }),
  // "If your Leader's type includes \"X\"".
  z.strictObject({ kind: z.literal('LEADER_TRAIT_INCLUDES'), text: z.string().min(1).max(128) }),
  // The controller may add Life cards to its hand by its own effects this turn (no lockLifeToHand, FAQ OP02-023).
  z.strictObject({ kind: z.literal('CAN_ADD_LIFE_TO_HAND') }),
  // [On K.O.] only: "When this Character is K.O.'d by an effect" (not in battle).
  z.strictObject({ kind: z.literal('KO_BY_EFFECT') }),
  // [On DON!! returned] only: "When N or more DON!! cards on your field are returned ... " at the same time (one resolution, FAQ OP09-061).
  z.strictObject({ kind: z.literal('DON_RETURNED_TOGETHER_AT_LEAST'), minimum: integer.min(2).max(10) }),
  // DON!! on the controller's field (cost area and given DON!!), as counted by CR 1.2.1 §10-2-10-1 for DON!! −X.
  z.strictObject({ kind: z.literal('FIELD_DON_AT_LEAST'), minimum: integer.min(1).max(10), player: z.enum(['CONTROLLER', 'OPPONENT']).optional() }),
  // "If your Leader is multicolored".
  z.strictObject({ kind: z.literal('LEADER_MULTICOLORED') }),
  // "If the number of DON!! cards on your field is equal to or less than the number on your opponent's field".
  z.strictObject({ kind: z.literal('FIELD_DON_AT_MOST_OPPONENT') }),
  // "You may trash N cards from the top of your deck:" can be paid only with N cards in the deck.
  z.strictObject({ kind: z.literal('DECK_AT_LEAST'), minimum: integer.min(1).max(60) }),
  // "If you have N or more rested cards" (Leader, Characters, Stage, cost-area DON!!); "If your opponent has N or more rested Characters".
  z.strictObject({ kind: z.literal('OWN_RESTED_CARDS_AT_LEAST'), minimum: integer.min(1).max(30) }),
  z.strictObject({ kind: z.literal('OPPONENT_RESTED_CHARACTERS_AT_LEAST'), minimum: integer.min(1).max(5) }),
  // "If your Leader has the <Slash> attribute"; "If this Leader battles your opponent's Character during this turn" (FAQ OP12-020:
  // a Character that blocked counts, a Leader that blocked does not; no battle if the Character left before the damage).
  z.strictObject({ kind: z.literal('LEADER_HAS_ATTRIBUTE'), attribute: z.enum(['STRIKE', 'SLASH', 'RANGED', 'SPECIAL', 'WISDOM']) }),
  z.strictObject({ kind: z.literal('SOURCE_BATTLED_OPPONENT_CHARACTER_THIS_TURN') }),
  // [When your hand cards are trashed] only: "by your {X} type card's effect" (the source of the effect that trashed them).
  z.strictObject({ kind: z.literal('HAND_TRASH_SOURCE_HAS_TRAIT'), trait: z.string().min(1).max(128) }),
  // [Your Turn]: the controller is the turn player.
  z.strictObject({ kind: z.literal('YOUR_TURN') }),
  // Life counts (the Life area is secret but its size is public).
  z.strictObject({ kind: z.literal('LIFE_AT_MOST'), player, maximum: integer.max(20) }),
  z.strictObject({ kind: z.literal('LIFE_AT_LEAST'), player, minimum: integer.min(1).max(20) }),
  z.strictObject({ kind: z.literal('LIFE_LESS_THAN_OPPONENT') }),
  z.strictObject({ kind: z.literal('OWN_CHARACTERS_AT_MOST'), maximum: integer.max(5) }),
  // Active DON!! in the controller's cost area (an optional ➁ cost inside an automatic ability is paid in full or not at all).
  z.strictObject({ kind: z.literal('ACTIVE_DON_AT_LEAST'), minimum: integer.min(1).max(10) }),
  // [Opponent's Turn].
  z.strictObject({ kind: z.literal('OPPONENT_TURN') }),
  // "If your Leader is [X]" (card name).
  z.strictObject({ kind: z.literal('LEADER_NAME_IS'), name: z.string().min(1).max(128) }),
  z.strictObject({ kind: z.literal('FIELD_DON_AT_MOST'), maximum: integer.max(10) }),
  // M7, read when the effect resolves: "If this Character has N power or more" (current power of the source on the field); "If
  // there is a Character with a cost of N or more" (either player's, current cost); "you and your opponent have a total of N or
  // less Life cards".
  z.strictObject({ kind: z.literal('SOURCE_POWER_AT_LEAST'), minimum: z.number().int().min(0).max(100000) }),
  z.strictObject({ kind: z.literal('ANY_CHARACTER_COST_AT_LEAST'), minimum: integer.min(1).max(20) }),
  z.strictObject({ kind: z.literal('TOTAL_LIFE_AT_MOST'), maximum: integer.max(20) }),
  // "If you have N or more Events in your trash"; "If the number of your Life cards is equal to or less than your opponent's".
  z.strictObject({ kind: z.literal('TRASH_EVENTS_AT_LEAST'), minimum: integer.min(1).max(60) }),
  z.strictObject({ kind: z.literal('LIFE_AT_MOST_OPPONENT') }),
] as const
const baseConditionSchema = z.discriminatedUnion('kind', [...baseConditions])
// Several printed conditions of one ability ("[DON!! x1] [Your Turn]"), all required. Not nested.
export const conditionSchema = z.discriminatedUnion('kind', [...baseConditions, z.strictObject({ kind: z.literal('ALL_OF'), conditions: z.array(baseConditionSchema).min(2).max(4) }),
  // "If you have 0 ... or 8 or more ...": one of the printed alternatives.
  z.strictObject({ kind: z.literal('ANY_OF'), conditions: z.array(baseConditionSchema).min(2).max(4) })])
export type Condition = z.infer<typeof conditionSchema>
// M6 generic card filter. Hidden zones (hand, trash list order is public but hand is secret) can only be read on the
// controller's own side; the cost zone holds DON!! cards. Every filter is optional and combined with AND.
export const cardsSelectorSchema = z.strictObject({ kind: z.literal('CARDS'), side: z.enum(['OWN', 'OPPONENT', 'ANY']),
  // 'ownCards': "your cards" to rest — Leader, Characters, Stage and cost-area DON!! (FAQ OP14-029), the controller's side only.
  zone: z.enum(['characters', 'leader', 'leaderOrCharacters', 'stage', 'hand', 'trash', 'handOrTrash', 'deck', 'cost', 'fieldDon', 'givenDon', 'life', 'ownCards']),
  categories: z.array(z.enum(['CHARACTER', 'EVENT', 'STAGE'])).min(1).max(3).optional(),
  minCost: integer.max(20).optional(), maxCost: integer.max(20).optional(),
  // "base cost": the printed cost, not modified; "a cost equal to or less than the number of your opponent's Life cards".
  costBasis: z.enum(['CURRENT', 'BASE']).optional(), maxCostFromLife: z.enum(['OWN', 'OPPONENT', 'TOTAL']).optional(), maxPower: z.number().int().optional(), minPower: z.number().int().optional(), powerBasis: z.enum(['CURRENT', 'BASE']).optional(),
  rested: z.boolean().optional(), traitsAny: z.array(z.string().min(1).max(128)).min(1).max(8).optional(),
  nameIs: z.string().min(1).max(128).optional(), nameNot: z.string().min(1).max(128).optional(), hasBlocker: z.literal(true).optional(), excludeSource: z.boolean().optional(),
  topN: integer.min(1).max(10).optional(),
  // "with a cost equal to or less than the number of DON!! cards on your opponent's field".
  maxCostFromFieldDon: z.literal('OPPONENT').optional(),
  // "either [Name] or has the <Slash> attribute": these names are an alternative to attributesAny.
  orNamesAny: z.array(z.string().min(1).max(128)).min(1).max(4).optional(),
  colorsAny: z.array(z.enum(['RED', 'GREEN', 'BLUE', 'PURPLE', 'BLACK', 'YELLOW'])).min(1).max(6).optional(),
  // The card the effect's source battled in the battle that just ended (CHARACTER_BATTLED announcement).
  battledWithSource: z.literal(true).optional(),
  // Life (CR 1.2.1 §3-10-2): only the top card, or the top and the bottom card ("from the top or bottom of your Life").
  lifeEnd: z.enum(['TOP', 'TOP_OR_BOTTOM', 'ALL']).optional(),
  attributesAny: z.array(z.enum(['STRIKE', 'SLASH', 'RANGED', 'SPECIAL', 'WISDOM'])).min(1).max(5).optional(),
  // "{X} type or <Y> attribute": traitsAny and attributesAny are alternatives instead of both being required.
  traitOrAttribute: z.literal(true).optional(),
  // "with no base effect": no printed card text and no [Trigger]; a Counter value does not count (FAQ P-011).
  noBaseEffect: z.literal(true).optional(),
  // "a card with a [Trigger]"; a Life card's orientation ("turn 1 card from the top of your Life cards face-up").
  hasTrigger: z.literal(true).optional(), faceUp: z.boolean().optional(),
  // "a card with a type including \"X\""; "this card" (the effect's source, wherever it now is).
  traitIncludesAny: z.array(z.string().min(1).max(128)).min(1).max(4).optional(), isSource: z.literal(true).optional(),
  // Only cards still bound (same presence) by an earlier step ("the revealed card", "the rest").
  inBinding: id.optional(),
  // Not a card already bound ("up to 2 of your Characters ... each": the second target differs from the first).
  excludeBinding: id.optional() })
  .refine(c => !c.traitOrAttribute || (c.traitsAny !== undefined && c.attributesAny !== undefined))
  .refine(c => (c.zone === 'life') === (c.lifeEnd !== undefined), { message: 'LIFE_END_ONLY_FOR_LIFE' })
  .refine(c => c.zone !== 'ownCards' || c.side === 'OWN', { message: 'OWN_CARDS_ONLY_OWN' })
  .refine(c => c.topN === undefined || c.zone === 'deck', { message: 'TOP_N_ONLY_FOR_DECK' })
  // The opponent's hand only for a concealed choice ("choose 2 cards from your opponent's hand face-down", checked per program).
  // The opponent's deck only as its top N cards ("look at 1 card from the top of your opponent's deck", revealed to the chooser).
  .refine(c => !['hand', 'trash', 'handOrTrash', 'deck', 'fieldDon', 'givenDon'].includes(c.zone) || c.side === 'OWN' || (c.zone === 'hand' && c.side === 'OPPONENT') || (c.zone === 'deck' && c.side === 'OPPONENT' && c.topN !== undefined), { message: 'HIDDEN_ZONE_SELECTOR' })
  .refine(c => c.minCost === undefined || c.maxCost === undefined || c.minCost <= c.maxCost)
export const selectorSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('OWN_ZONE'), zone: z.enum(['hand', 'cost', 'donDeck', 'deck']), cardKind: z.enum(['CARD', 'DON']) }),
  z.strictObject({ kind: z.literal('OWN_RESTED_DON') }),
  // If no maximum is supplied, any opposing Character is a legal target.
  z.strictObject({ kind: z.literal('OPPONENT_CHARACTER'), maximumPower: z.number().int().optional(), powerBasis: z.enum(['CURRENT', 'BASE']).optional() }),
  z.strictObject({ kind: z.literal('OPPONENT_BLOCKER_COST_AT_MOST'), maximumCost: integer.max(10) }),
  z.strictObject({ kind: z.literal('OPPONENT_RESTED_CHARACTER_COST_AT_MOST'), maximumCost: integer.max(10) }),
  z.strictObject({ kind: z.literal('OWN_FIELD'), trait: z.string().min(1).max(128).optional(), excludeSource: z.boolean().optional() }),
  z.strictObject({ kind: z.literal('OWN_LEADER_OR_CHARACTER'), excludeSource: z.boolean().optional() }),
  // CR 1.2.1 §3-10-2: a card leaving the Life area is the top card unless the text says otherwise.
  z.strictObject({ kind: z.literal('OPPONENT_TOP_LIFE') }),
  cardsSelectorSchema,
])
export type Selector = z.infer<typeof selectorSchema>
const atomicCostSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('NONE') }),
  z.strictObject({ kind: z.literal('REST_DON'), amount: integer }),
  z.strictObject({ kind: z.literal('REST_SOURCE') }),
  // CR 1.2.1 §10-2-10-1 DON!! −X: the player selects X DON!! from Leader, Character and cost areas and returns them.
  z.strictObject({ kind: z.literal('DON_MINUS'), amount: integer.min(1).max(10) }),
])
export const costSchema = z.union([atomicCostSchema, z.strictObject({ kind: z.literal('SEQUENCE'), parts: z.array(atomicCostSchema).min(1).max(10) }), z.strictObject({ kind: z.literal('ALTERNATIVE'), options: z.array(atomicCostSchema).min(2).max(10) })])
export type Cost = z.infer<typeof costSchema>
export const durationSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('TURN'), turnId: integer }),
  z.strictObject({ kind: z.literal('BATTLE'), battleId: id }),
  z.strictObject({ kind: z.literal('SOURCE_PRESENCE'), source: presenceSchema }),
  z.strictObject({ kind: z.literal('BOUNDARY'), playerId: id, playerTurn: integer, phase: z.enum(['REFRESH', 'END']), edge: z.enum(['START', 'END']) }),
])
export type EffectDuration = z.infer<typeof durationSchema>
export const usageSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('UNLIMITED') }),
  z.strictObject({ kind: z.literal('ONCE_PER_TURN') }),
  // M6 "[Once Per Turn] This effect can be activated when ...": declining (choosing nothing) does not use it (FAQ OP09-001).
  z.strictObject({ kind: z.literal('ONCE_PER_TURN_WHEN_CHOSEN') }),
])
export type EffectUsageLimit = z.infer<typeof usageSchema>
export const operationSpecSchema = z.discriminatedUnion('primitive', [
  // player ANY (M6): the bound Characters of both players ("K.O. all Characters ...", "K.O. this Character"); several bound
  // Characters are K.O.'d one after the other in binding order. `resultBinding` receives the ones actually K.O.'d ("If you do").
  z.strictObject({ primitive: z.literal('koCharacter'), version: z.literal('1.0.0'), player: z.enum(['OPPONENT', 'ANY']), audience: z.literal('PUBLIC'), subjectBinding: id, resultBinding: id.optional() }),
  z.strictObject({ primitive: z.literal('attachRestedDon'), version: z.literal('1.0.0'), player, audience: z.enum(['PUBLIC', 'CONTROLLER']), subjectBinding: id, targetBinding: id }),
  // perBinding: "+N power for every <bound> card" (amount multiplied by the size of that binding).
  z.strictObject({ primitive: z.literal('addPower'), version: z.literal('1.0.0'), player, audience: z.enum(['PUBLIC', 'CONTROLLER']), subjectBinding: id.optional(), perBinding: id.optional(), amount: z.number().int().min(-100000).max(100000), duration: z.enum(['THIS_TURN', 'THIS_BATTLE', 'UNTIL_START_OF_YOUR_NEXT_TURN', 'UNTIL_END_OF_YOUR_NEXT_TURN', 'UNTIL_END_OF_OPPONENT_NEXT_TURN']) }),
  z.strictObject({ primitive: z.literal('setBasePowerFromOpponentLeader'), version: z.literal('1.0.0'), player: z.literal('CONTROLLER'), audience: z.literal('PUBLIC'), duration: z.literal('UNTIL_START_OF_NEXT_TURN') }),
  z.strictObject({ primitive: z.literal('moveCard'), version: z.literal('1.0.0'), player, audience: z.enum(['PUBLIC', 'CONTROLLER']), subjectBinding: id, from: z.enum(['hand', 'deck', 'trash']), to: z.enum(['hand', 'deck', 'trash']),
    // M6 "place 1 card from your hand at the top of your deck": TOP; a card moved to the deck goes to the bottom otherwise.
    deckPosition: z.literal('TOP').optional() }).refine(o => o.from !== o.to && (!['hand','deck'].includes(o.to) || o.audience === 'CONTROLLER') && (o.deckPosition === undefined || o.to === 'deck')),
  // amountFromTrigger: "draw cards equal to the number of cards trashed" (the hand cards trashed by the cause of this trigger).
  z.strictObject({ primitive: z.literal('drawCards'), version: z.literal('1.0.0'), player, audience: z.literal('CONTROLLER'), amount: integer.max(10), amountFromTrigger: z.literal('HAND_TRASHED').optional() }),
  z.strictObject({ primitive: z.literal('giveRestedDon'), version: z.literal('1.0.0'), player, audience: z.enum(['PUBLIC', 'CONTROLLER']), subjectBinding: id.optional() }),
  z.strictObject({ primitive: z.literal('moveDon'), version: z.literal('1.0.0'), player, audience: z.enum(['PUBLIC', 'CONTROLLER']), subjectBinding: id.optional(), from: z.enum(['donDeck', 'cost']), to: z.enum(['donDeck', 'cost']), rested: z.boolean() })
    .refine(o => o.from !== o.to && (o.to !== 'donDeck' || !o.rested)),
  z.strictObject({ primitive: z.literal('trashLife'), version: z.literal('1.0.0'), player: z.enum(['OPPONENT', 'CONTROLLER']), audience: z.literal('PUBLIC'), subjectBinding: id }),
  z.strictObject({ primitive: z.literal('preventBlocker'), version: z.literal('1.0.0'), player: z.literal('OPPONENT'), audience: z.literal('PUBLIC'), subjectBinding: id.optional(), minimumBlockerPower: integer.optional(), duration: z.enum(['THIS_BATTLE', 'THIS_TURN']) }),
  // CR 1.2.1 §3-7-6-1: with 5 Characters, the Character bound by `replaceBinding` is trashed (rule processing) first.
  z.strictObject({ primitive: z.literal('playSelfFromTrigger'), version: z.literal('1.0.0'), player: z.literal('CONTROLLER'), audience: z.literal('PUBLIC'), replaceBinding: id.optional() }),
  // M6 generic field moves. The subject may belong to either player; it always goes to its OWNER's hand / deck bottom.
  z.strictObject({ primitive: z.literal('returnToHand'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id }),
  // M6 "<bound Characters> cannot attack until the end of your opponent's next turn".
  z.strictObject({ primitive: z.literal('preventAttack'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id, duration: z.literal('UNTIL_END_OF_OPPONENT_NEXT_TURN') }),
  // M6 "trash <bound opposing Character>": not a K.O. ([On K.O.] does not activate, FAQ ST19-003).
  z.strictObject({ primitive: z.literal('trashCharacter'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id }),
  // M6 "<bound opposing Character> cannot activate [Blocker] during this turn".
  // M6 "return N of your currently given DON!! cards to your cost area rested" (cost of ST28-004).
  z.strictObject({ primitive: z.literal('returnGivenDon'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id }),
  // M6 "look at all your Life cards; place 1 at the top of your deck" / "place the rest back in your Life area in any order".
  z.strictObject({ primitive: z.literal('lifeToDeckTop'), version: z.literal('1.0.0'), audience: z.literal('CONTROLLER'), subjectBinding: id }),
  // M6 "turn 1 card from the top of your Life cards face-up" (public from then on).
  // M6 "you cannot add Life cards to your hand using your own effects during this turn".
  // M6 "<bound cards> will not become active in your opponent's next Refresh Phase" (FAQ P-057: a card active by then is unaffected).
  // M6 "<bound card>'s base power becomes N until the end of your opponent's next End Phase" (FAQ ST26-005: twice, still N).
  z.strictObject({ primitive: z.literal('setBasePower'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id, value: integer.max(100000), duration: z.enum(['UNTIL_END_OF_OPPONENT_NEXT_END_PHASE', 'THIS_TURN']), player: z.enum(['CONTROLLER', 'OPPONENT']).optional() }),
  // M6 "reveal 1 card from the top of your opponent's deck. If the revealed card has the chosen cost": the card stays on top;
  // resultBinding is non-empty when its printed cost is the cost chosen by modeBinding (chooseValue 'COST').
  z.strictObject({ primitive: z.literal('revealDeckTopCostMatch'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), player: z.literal('OPPONENT'), modeBinding: id, resultBinding: id }),
  // M6 "<bound card> cannot be rested until the end of your opponent's next End Phase" (FAQ EB02-011/OP11-034: it cannot attack,
  // activate [Blocker], pay a "rest this Character" cost or be rested by any effect).
  // M6 "turn 1 of your face-up Life cards face-down" (FAQ ST13-009: any position).
  // M6 "Your opponent's [On Play] effects are negated until the end of your opponent's next turn" (FAQ OP09-081).
  z.strictObject({ primitive: z.literal('negateOnPlay'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), player: z.literal('OPPONENT'), duration: z.literal('UNTIL_END_OF_OPPONENT_NEXT_TURN') }),
  z.strictObject({ primitive: z.literal('turnLifeFaceDown'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id }),
  z.strictObject({ primitive: z.literal('preventRest'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id, duration: z.literal('UNTIL_END_OF_OPPONENT_NEXT_TURN') }),
  // M6 "this Leader cannot attack your opponent's Characters with a base cost of N or less during this turn".
  z.strictObject({ primitive: z.literal('limitAttackTargets'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), maxBaseCost: integer.max(20), duration: z.literal('THIS_TURN') }),
  z.strictObject({ primitive: z.literal('lockRefresh'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id }),
  // M6 "... at the end of this turn": schedules the source card's own delayed [End of Your Turn] definition (source zone 'trash').
  z.strictObject({ primitive: z.literal('scheduleEndOfTurn'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), definitionId: id }),
  z.strictObject({ primitive: z.literal('lockLifeToHand'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), duration: z.literal('THIS_TURN') }),
  z.strictObject({ primitive: z.literal('turnLifeFaceUp'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id }),
  z.strictObject({ primitive: z.literal('arrangeLife'), version: z.literal('1.0.0'), audience: z.literal('CONTROLLER'), orderBinding: id }),
  z.strictObject({ primitive: z.literal('disableBlocker'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id, duration: z.literal('THIS_TURN') }),
  z.strictObject({ primitive: z.literal('moveToDeckBottom'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id }),
  z.strictObject({ primitive: z.literal('restCard'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id }),
  // Without a binding, setActive applies to the effect's own source card.
  z.strictObject({ primitive: z.literal('setActive'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id.optional() }),
  // Plays the bound own Character/Stage without paying its cost (its On Play is captured as usual); full area: §3-7-6-1.
  z.strictObject({ primitive: z.literal('playCard'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id, from: z.enum(['hand', 'deck', 'trash', 'life', 'handOrTrash']), replaceBinding: id.optional(), rested: z.literal(true).optional() }),
  // CR 1.2.1 §10-2-10-1 DON!! −X paid inside a program: the bound field DON!! return to the DON!! deck (active, detached).
  z.strictObject({ primitive: z.literal('returnDon'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id }),
  // "Look at N cards from the top of your deck and return them to the top or bottom in any order" (FAQ ST03-010: all
  // N go to the same place). `orderBinding` holds the N in the chosen order; a non-empty `bottomBinding` sends them all down.
  // No bottomBinding: "place them at the top of your deck in any order".
  z.strictObject({ primitive: z.literal('arrangeTopDeck'), version: z.literal('1.0.0'), audience: z.literal('CONTROLLER'), orderBinding: id, bottomBinding: id.optional() }),
  // "Give up to 1 of your opponent's Characters −X cost during this turn" (cost never below 0, rules FAQ).
  z.strictObject({ primitive: z.literal('addCost'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id, amount: z.number().int().min(-20).max(20), duration: z.enum(['THIS_TURN', 'UNTIL_END_OF_OPPONENT_NEXT_TURN']) }),
  // "... cannot be K.O.'d during this turn" (by effects and in battle) for the bound cards or the source.
  z.strictObject({ primitive: z.literal('preventKO'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id.optional(), duration: z.literal('THIS_TURN') }),
  // "This Character gains [Rush] during this turn": a temporary keyword on the bound card or the source.
  z.strictObject({ primitive: z.literal('grantKeyword'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), keyword: z.enum(['RUSH', 'DOUBLE_ATTACK', 'BANISH', 'UNBLOCKABLE']), duration: z.enum(['THIS_TURN', 'THIS_BATTLE']), subjectBinding: id.optional() }),
  // M6 "Reveal 1 card from the top of your deck. If that card's type includes \"X\"": the card stays on top; resultBinding is
  // non-empty on a match.
  z.strictObject({ primitive: z.literal('revealDeckTopMatch'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), player: z.enum(['CONTROLLER', 'OPPONENT']), traitIncludesAny: z.array(z.string().min(1).max(128)).min(1).max(4), resultBinding: id }),
  // M6 Life family. lifeToHand: the bound card of the controller's Life (top or bottom) goes to the controller's hand.
  z.strictObject({ primitive: z.literal('lifeToHand'), version: z.literal('1.0.0'), audience: z.literal('CONTROLLER'), subjectBinding: id }),
  // addToLife: the bound card (controller's hand / deck, or a Character on the field) goes to the top of its OWNER's Life,
  // face-down or face-up as printed.
  z.strictObject({ primitive: z.literal('addToLife'), version: z.literal('1.0.0'), audience: z.enum(['PUBLIC', 'CONTROLLER']), subjectBinding: id, from: z.enum(['hand', 'deck', 'characters', 'trash', 'handOrTrash']), faceUp: z.boolean(),
    // An opposing Character (ST09-015) goes to ITS owner's Life; `bottomBinding` non-empty places it at the bottom.
    side: z.enum(['OWN', 'OPPONENT']).optional(), bottomBinding: id.optional() }),
  // "... and add this card to your hand": the resolving [Trigger] card goes from its temporary area to its owner's hand.
  z.strictObject({ primitive: z.literal('triggerCardToHand'), version: z.literal('1.0.0'), audience: z.literal('CONTROLLER') }),
  // placeLife: the bound top Life card (either player) stays on top, or goes to the bottom when `bottomBinding` is non-empty.
  z.strictObject({ primitive: z.literal('placeLife'), version: z.literal('1.0.0'), audience: z.literal('PUBLIC'), subjectBinding: id, bottomBinding: id }),
])
export type OperationSpec = z.infer<typeof operationSpecSchema>
const searchTopDeckSchema = z.strictObject({ kind: z.literal('SEARCH_TOP_DECK'), amount: integer.min(1).max(10), trait: z.string().min(1).max(128).optional(),
  // M6: "{A}, {B} or {C} type" and "purple {X} type" searches.
  traitsAny: z.array(z.string().min(1).max(128)).min(1).max(8).optional(), colorsAny: z.array(z.enum(['RED', 'GREEN', 'BLUE', 'PURPLE', 'BLACK', 'YELLOW'])).min(1).max(6).optional(),
  // "with a cost of N or more", "[Name]", "type including \"X\"" (any of these alternatives with traitsAny).
  minCost: integer.max(20).optional(), maxCost: integer.max(20).optional(), namesAny: z.array(z.string().min(1).max(128)).min(1).max(4).optional(), traitIncludesAny: z.array(z.string().min(1).max(128)).min(1).max(4).optional(), category: z.enum(['CHARACTER','EVENT','STAGE']).optional(), excludeRulesName: z.string().min(1).max(128).optional(),
  // "<Slash> attribute card or green Event": further alternatives to traitsAny/traitIncludesAny/namesAny.
  // "Character card with 6000 power" (exactly, FAQ ST30-002): printed power bounds.
  minPower: z.number().int().optional(), maxPower: z.number().int().optional(),
  attributesAny: z.array(z.enum(['STRIKE', 'SLASH', 'RANGED', 'SPECIAL', 'WISDOM'])).min(1).max(5).optional(), eventColorsAny: z.array(z.enum(['RED', 'GREEN', 'BLUE', 'PURPLE', 'BLACK', 'YELLOW'])).min(1).max(6).optional(),
  maxSelected: integer.min(1).max(10), bind: id, revealSelected: z.literal(true), destination: z.enum(['hand', 'LIFE_TOP_FACE_UP']), remainder: z.enum(['BOTTOM_ANY_ORDER', 'TRASH']), whenBindingNonempty: id.optional() }).refine(step=>step.maxSelected<=step.amount)
const shuffleDeckSchema = z.strictObject({ kind: z.literal('SHUFFLE_DECK'), player })
const revealBindingSchema = z.strictObject({ kind: z.literal('REVEAL_BINDING'), bind: id })
// "All of your ... gain": binds every matching card at resolution, without a choice.
const bindAllSchema = z.strictObject({ kind: z.literal('BIND_ALL'), selector: z.lazy(() => cardsSelectorSchema), bind: id })
// "If ..., <two operations>": the condition is evaluated once; the bind holds the source when it was met, else nothing.
// `whenBindingNonempty`: checked only once an optional cost bound there was paid ("You may ...: If ..., ..."); otherwise false.
const checkSchema = z.strictObject({ kind: z.literal('CHECK'), condition: z.lazy(() => conditionSchema), bind: id, whenBindingNonempty: id.optional() })
// "You may rest A or B:": the union of the bindings filled by the alternatives (each a separate choice).
const unionSchema = z.strictObject({ kind: z.literal('UNION'), bind: id, from: z.array(id).min(2).max(4) })
// "(Your opponent) chooses one: - A - B": the chooser picks one mode; `${bind}.${index}` holds the source for the chosen
// mode and nothing for the others (later steps are guarded with whenBindingNonempty).
// chooseValue 'COST': "Choose a cost" — mode k is the cost k (0..10, the printed costs of the game).
const modeSchema = z.strictObject({ kind: z.literal('MODE'), modes: integer.min(2).max(11), bind: id, chooser: z.literal('OPPONENT').optional(), whenBindingNonempty: id.optional(), chooseValue: z.literal('COST').optional() })
  .refine(m => m.chooseValue === 'COST' ? m.modes === 11 : m.modes <= 4, { message: 'INVALID_MODE_COUNT' })
export const stepSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('OPERATION'), operation: operationSpecSchema, whenCondition: conditionSchema.optional(), whenBindingNonempty: id.optional() }),
  z.strictObject({ kind: z.literal('CHOICE'), choiceType: z.enum(['SELECT', 'ORDER']), selector: selectorSchema,
    optional: z.boolean(), min: integer.max(10), max: integer.max(10), bind: id, visibility: z.enum(['PRIVATE', 'PUBLIC']), whenBindingNonempty: id.optional(), whenCondition: conditionSchema.optional(),
    // Skipped when that binding is non-empty ("up to 1 of A or B": B offered only when no A was chosen).
    whenBindingEmpty: id.optional(),
    // allOrNone: exactly 0 or `max` options ("DON!! −X" paid in full or not at all). clampMin: a mandatory choice takes
    // every available option when fewer than `min` exist ("trash 2 cards" whenever possible).
    allOrNone: z.literal(true).optional(), clampMin: z.literal(true).optional(),
    // "Your opponent chooses ...": the opponent makes the choice; OWN in the selector then means the chooser's side.
    chooser: z.literal('OPPONENT').optional(),
    // "Look at ...": the chooser sees the hidden cards offered (a private peek, never shown to the other player).
    reveal: z.literal('CHOOSER').optional(),
    // "Add up to 1 card from the top of your deck to ...": a hidden card chosen without being looked at (position only).
    conceal: z.literal(true).optional(),
    // With no eligible card the step is skipped (nothing to choose, e.g. the revealed card was played).
    skipIfNone: z.literal(true).optional() })
    .refine(c => !c.reveal || c.visibility === 'PRIVATE')
    .refine(c => !(c.reveal && c.conceal))
    .refine(c => c.min <= c.max && (!c.optional || c.min === 0) && (!c.allOrNone || c.optional) && (!c.clampMin || !c.optional)),
  searchTopDeckSchema, shuffleDeckSchema, revealBindingSchema, bindAllSchema, checkSchema, modeSchema, unionSchema,
])
export const effectDefinitionSchema = z.strictObject({
  id, revision: id, dslVersion: z.enum(['1.0.0', '1.1.0', '1.2.0', '1.3.0']), source: sourceSchema, timing: z.enum(['MAIN', 'ACTIVATE_MAIN', 'COUNTER', 'ON_PLAY', 'ON_KO', 'ON_CHARACTER_KO', 'WHEN_ATTACKING', 'ON_BLOCK', 'WHEN_ATTACKING_OR_ON_BLOCK', 'TRIGGER', 'END_OF_YOUR_TURN', 'END_OF_BATTLE_WITH_CHARACTER', 'ON_BATTLE_PAIRED', 'ON_DON_RETURNED', 'ON_OPPONENT_BLOCKER', 'ON_OPPONENT_ATTACK', 'ON_OPPONENT_EVENT', 'ON_OWN_HAND_TRASHED', 'ON_SOURCE_RESTED', 'ON_CHARACTER_RESTED_BY_OWN_EFFECT']),
  condition: conditionSchema, cost: costSchema, optionalCost: z.enum(['TAKE_TOP_LIFE_TO_HAND', 'RETURN_ONE_DON']).optional(), usage: usageSchema, program: z.array(stepSchema).min(1).max(32),
}).superRefine((d, ctx) => {
  if (d.dslVersion === '1.0.0' && d.source.kind !== 'SYNTHETIC') ctx.addIssue({ code: 'custom', message: 'CARD_BINDING_NOT_IMPLEMENTED' })
  if (d.timing === 'COUNTER' && (d.dslVersion !== '1.3.0' || d.source.kind !== 'CARD_DEFINITION' || d.source.zone !== 'hand' || d.cost.kind !== 'NONE')) ctx.addIssue({ code: 'custom', message: 'INVALID_COUNTER_PROGRAM' })
  if (JSON.stringify(d.condition).includes('"KO_BY_EFFECT"') && d.timing !== 'ON_KO') ctx.addIssue({ code: 'custom', message: 'KO_BY_EFFECT_ONLY_ON_KO' })
  if (JSON.stringify(d.condition).includes('"HAND_TRASH_SOURCE_HAS_TRAIT"') && d.timing !== 'ON_OWN_HAND_TRASHED') ctx.addIssue({ code: 'custom', message: 'HAND_TRASH_SOURCE_ONLY_ON_HAND_TRASHED' })
  if (JSON.stringify(d.condition).includes('"DON_RETURNED_TOGETHER_AT_LEAST"') && d.timing !== 'ON_DON_RETURNED') ctx.addIssue({ code: 'custom', message: 'DON_RETURNED_COUNT_ONLY_ON_DON_RETURNED' })
  if (d.source.kind === 'CARD_DEFINITION' && (d.source.zone === 'trash' || d.source.zone === 'delayed') && (d.timing !== 'END_OF_YOUR_TURN' || d.dslVersion !== '1.3.0' || d.cost.kind !== 'NONE')) ctx.addIssue({ code: 'custom', message: 'TRASH_SOURCE_ONLY_FOR_DELAYED_END_OF_TURN' })
  if (d.usage.kind === 'ONCE_PER_TURN_WHEN_CHOSEN' && (d.dslVersion !== '1.3.0' || d.program[0]?.kind !== 'CHOICE')) ctx.addIssue({ code: 'custom', message: 'INVALID_USAGE' })
  if (d.optionalCost === 'RETURN_ONE_DON' && d.timing !== 'COUNTER') ctx.addIssue({code:'custom',message:'INVALID_OPTIONAL_COST_WINDOW'})
  if ((!['1.2.0','1.3.0'].includes(d.dslVersion) && d.cost.kind === 'REST_DON') || (d.dslVersion === '1.0.0' && d.cost.kind !== 'NONE')) ctx.addIssue({ code: 'custom', message: 'COST_NOT_IMPLEMENTED' })
  if (d.dslVersion !== '1.0.0' && d.source.kind !== 'CARD_DEFINITION') ctx.addIssue({ code: 'custom', message: 'INVALID_CARD_BINDING' })
  if (d.dslVersion === '1.0.0' && (d.timing !== 'MAIN' || d.program.some(s => s.kind === 'OPERATION' ? !['giveRestedDon', 'moveDon'].includes(s.operation.primitive) : s.kind !== 'CHOICE' || s.selector.kind !== 'OWN_ZONE' || s.selector.zone === 'deck' || !!s.whenBindingNonempty))) ctx.addIssue({ code: 'custom', message: 'UNSUPPORTED_LEGACY_PROGRAM' })
  if (d.dslVersion !== '1.2.0' && d.dslVersion !== '1.3.0' && d.program.some(s => s.kind === 'SEARCH_TOP_DECK')) ctx.addIssue({ code: 'custom', message: 'INCOMPATIBLE_VERSION' })
  if (d.dslVersion !== '1.3.0' && (d.optionalCost !== undefined || (d.source.kind === 'CARD_DEFINITION' && d.source.zone === 'hand') || d.program.some(s => s.kind === 'SHUFFLE_DECK' || s.kind === 'REVEAL_BINDING' || (s.kind === 'OPERATION' && s.operation.primitive === 'moveCard') || (s.kind === 'CHOICE' && (s.selector.kind === 'OWN_LEADER_OR_CHARACTER' || s.whenCondition !== undefined)) || (s.kind === 'SEARCH_TOP_DECK' && s.trait === undefined)))) ctx.addIssue({ code:'custom', message:'INCOMPATIBLE_VERSION' })
  if (!['1.2.0','1.3.0'].includes(d.dslVersion) && (['ON_KO','ON_CHARACTER_KO'].includes(d.timing) || d.program.some(s => s.kind === 'CHOICE' && s.selector.kind === 'OPPONENT_CHARACTER' && s.selector.powerBasis))) ctx.addIssue({ code: 'custom', message: 'UNSUPPORTED_LEGACY_PROGRAM' })
  if ((d.timing === 'TRIGGER') !== (d.source.kind === 'CARD_DEFINITION' && d.source.zone === 'temporary') || (d.timing === 'TRIGGER' && !['1.2.0','1.3.0'].includes(d.dslVersion))) ctx.addIssue({ code: 'custom', message: 'INVALID_TRIGGER_SOURCE' })
  if (d.cost.kind === 'ALTERNATIVE' || (!['1.2.0','1.3.0'].includes(d.dslVersion) && d.cost.kind === 'SEQUENCE')) ctx.addIssue({ code:'custom', message:'COST_NOT_IMPLEMENTED' })
  const costParts = d.cost.kind === 'SEQUENCE' ? d.cost.parts : d.cost.kind === 'ALTERNATIVE' ? d.cost.options : [d.cost]
  // DON!! −X: an [Activate: Main] cost on its own, or one part of a SEQUENCE ("DON!! −1 You may rest this Leader:", M7), once.
  const donMinusParts = costParts.filter(part => part.kind === 'DON_MINUS').length
  if (d.cost.kind === 'ALTERNATIVE' && donMinusParts) ctx.addIssue({ code:'custom', message:'COST_NOT_IMPLEMENTED' })
  if (donMinusParts && (d.dslVersion !== '1.3.0' || d.timing !== 'ACTIVATE_MAIN' || donMinusParts > 1)) ctx.addIssue({ code:'custom', message:'COST_NOT_IMPLEMENTED' })
  if (d.dslVersion !== '1.3.0' && (['END_OF_YOUR_TURN', 'END_OF_BATTLE_WITH_CHARACTER', 'ON_BATTLE_PAIRED', 'ON_DON_RETURNED', 'ON_OPPONENT_BLOCKER', 'ON_OPPONENT_ATTACK', 'ON_OPPONENT_EVENT', 'ON_OWN_HAND_TRASHED', 'ON_SOURCE_RESTED', 'ON_CHARACTER_RESTED_BY_OWN_EFFECT'].includes(d.timing) || d.condition.kind === 'HAND_AT_LEAST' || d.condition.kind === 'OWN_CHARACTERS_AT_LEAST' || d.condition.kind === 'FIELD_CHARACTER_COST_AT_MOST' || d.condition.kind === 'OWN_CHARACTER_COST_AT_LEAST' || d.condition.kind === 'SOURCE_PLAYED_THIS_TURN' || d.condition.kind === 'OWN_RESTED_CHARACTERS_AT_LEAST' || d.condition.kind === 'OWN_CHARACTER_COUNT' || d.condition.kind === 'LEADER_TRAIT_INCLUDES' || d.condition.kind === 'CAN_ADD_LIFE_TO_HAND' || d.condition.kind === 'KO_BY_EFFECT' || d.condition.kind === 'LEADER_MULTICOLORED' || d.condition.kind === 'FIELD_DON_AT_MOST_OPPONENT' || d.condition.kind === 'DECK_AT_LEAST' || d.condition.kind === 'OWN_RESTED_CARDS_AT_LEAST' || d.condition.kind === 'OPPONENT_RESTED_CHARACTERS_AT_LEAST' || d.condition.kind === 'LEADER_HAS_ATTRIBUTE' || d.condition.kind === 'SOURCE_BATTLED_OPPONENT_CHARACTER_THIS_TURN' || d.condition.kind === 'HAND_TRASH_SOURCE_HAS_TRAIT' || d.condition.kind === 'DON_RETURNED_TOGETHER_AT_LEAST' || d.condition.kind === 'OWN_CHARACTER_POWER_AT_LEAST' || d.condition.kind === 'TRASH_AT_LEAST' || d.condition.kind === 'DON_DECK_AT_LEAST' || d.condition.kind === 'LEADER_HAS_TRAIT' || d.condition.kind === 'FIELD_DON_AT_LEAST' || d.condition.kind === 'OPPONENT_MORE_FIELD_DON' || d.condition.kind === 'BATTLE_OPPONENT_ATTRIBUTE' || d.condition.kind === 'YOUR_TURN' || d.condition.kind === 'ALL_OF' || d.condition.kind === 'OWN_CHARACTERS_AT_MOST' || d.condition.kind === 'ACTIVE_DON_AT_LEAST' || d.condition.kind === 'OPPONENT_TURN' || d.condition.kind === 'LEADER_NAME_IS' || d.condition.kind === 'ANY_OF' || d.condition.kind === 'FIELD_DON_AT_MOST' || d.condition.kind === 'SOURCE_POWER_AT_LEAST' || d.condition.kind === 'ANY_CHARACTER_COST_AT_LEAST' || d.condition.kind === 'TOTAL_LIFE_AT_MOST' || d.condition.kind === 'TRASH_EVENTS_AT_LEAST' || d.condition.kind === 'LIFE_AT_MOST_OPPONENT' || d.program.some(s => (s.kind === 'OPERATION' && (s.whenBindingNonempty !== undefined || ['returnToHand','moveToDeckBottom','restCard','setActive','playCard','returnDon','grantKeyword','arrangeTopDeck','addCost','preventKO'].includes(s.operation.primitive)) || s.kind === 'BIND_ALL' || s.kind === 'CHECK' || (s.kind === 'CHOICE' && s.chooser !== undefined)) || (s.kind === 'CHOICE' && s.selector.kind === 'CARDS')))) ctx.addIssue({ code:'custom', message:'INCOMPATIBLE_VERSION' })
  if (d.dslVersion !== '1.3.0' && d.program.some(s => (s.kind === 'CHOICE' && (s.selector.kind === 'OPPONENT_TOP_LIFE' || s.selector.kind === 'OPPONENT_BLOCKER_COST_AT_MOST' || s.selector.kind === 'OPPONENT_RESTED_CHARACTER_COST_AT_MOST')) || (s.kind === 'OPERATION' && ['trashLife','preventBlocker','playSelfFromTrigger'].includes(s.operation.primitive)))) ctx.addIssue({ code:'custom', message:'INCOMPATIBLE_VERSION' })
  if (d.dslVersion !== '1.3.0' && (['LIFE_AT_MOST', 'LIFE_AT_LEAST', 'LIFE_LESS_THAN_OPPONENT'].includes(d.condition.kind) || d.program.some(s => s.kind === 'MODE' || (s.kind === 'OPERATION' && ['lifeToHand', 'addToLife', 'placeLife', 'triggerCardToHand'].includes(s.operation.primitive))))) ctx.addIssue({ code:'custom', message:'INCOMPATIBLE_VERSION' })
  if (d.dslVersion !== '1.3.0' && d.program.some(s => s.kind === 'OPERATION' && s.operation.primitive === 'koCharacter' && (s.operation.player !== 'OPPONENT' || s.operation.resultBinding !== undefined || s.whenBindingNonempty !== undefined || s.whenCondition !== undefined))) ctx.addIssue({ code:'custom', message:'INCOMPATIBLE_VERSION' })
  if (d.timing === 'ON_KO' && (d.source.kind !== 'CARD_DEFINITION' || d.source.zone !== 'characters' || d.cost.kind !== 'NONE')) ctx.addIssue({ code: 'custom', message: 'ON_KO_COST_NOT_IMPLEMENTED' })
  const available = new Set<string>()
  for (const step of d.program) {
    if (step.kind === 'CHOICE') {
      if (step.whenBindingNonempty && !available.has(step.whenBindingNonempty)) ctx.addIssue({ code: 'custom', message: 'UNBOUND_GUARD' })
      if (step.visibility === 'PUBLIC' && step.selector.kind === 'OWN_ZONE' && ['hand','deck','life'].includes(step.selector.zone)) ctx.addIssue({ code:'custom', message:'PUBLIC_HIDDEN_ZONE_CHOICE' })
      if (step.visibility === 'PUBLIC' && step.selector.kind === 'CARDS' && ['hand','deck'].includes(step.selector.zone)) ctx.addIssue({ code:'custom', message:'PUBLIC_HIDDEN_ZONE_CHOICE' })
      if (step.selector.kind === 'CARDS' && step.selector.zone === 'hand' && step.selector.side !== 'OWN' && !(step.conceal && step.selector.side === 'OPPONENT' && !step.chooser)) ctx.addIssue({ code:'custom', message:'HIDDEN_ZONE_SELECTOR' })
      available.add(step.bind)
    } else if (step.kind === 'UNION') {
      if (step.from.some(b => !available.has(b))) ctx.addIssue({ code: 'custom', message: 'UNBOUND_UNION' })
      available.add(step.bind)
    } else if (step.kind === 'BIND_ALL' || step.kind === 'CHECK') {
      if (step.kind === 'BIND_ALL' && step.selector.zone === 'hand' && step.selector.side !== 'OWN') ctx.addIssue({ code:'custom', message:'HIDDEN_ZONE_SELECTOR' })
      available.add(step.bind)
    } else if (step.kind === 'MODE') {
      if (step.whenBindingNonempty && !available.has(step.whenBindingNonempty)) ctx.addIssue({ code: 'custom', message: 'UNBOUND_GUARD' })
      for (let index = 0; index < step.modes; index++) available.add(`${step.bind}.${index}`)
    } else if (step.kind === 'SEARCH_TOP_DECK') {
      if (step.whenBindingNonempty && !available.has(step.whenBindingNonempty)) ctx.addIssue({ code: 'custom', message: 'UNBOUND_GUARD' })
      available.add(step.bind)
    } else if (step.kind === 'REVEAL_BINDING') {
      if (!available.has(step.bind)) ctx.addIssue({ code:'custom', message:'UNBOUND_REVEAL' })
    }
    else if (step.kind === 'OPERATION') {
      if ('subjectBinding' in step.operation && step.operation.subjectBinding && !available.has(step.operation.subjectBinding)) ctx.addIssue({ code: 'custom', message: 'UNBOUND_SUBJECT' })
      if (step.operation.primitive === 'attachRestedDon' && !available.has(step.operation.targetBinding)) ctx.addIssue({ code: 'custom', message: 'UNBOUND_TARGET' })
      if (step.operation.primitive === 'koCharacter' && step.operation.resultBinding) available.add(step.operation.resultBinding)
      if (step.operation.primitive === 'revealDeckTopCostMatch' || step.operation.primitive === 'revealDeckTopMatch') available.add(step.operation.resultBinding)
      if (step.whenBindingNonempty && !available.has(step.whenBindingNonempty)) ctx.addIssue({ code: 'custom', message: 'UNBOUND_GUARD' })
      if (step.operation.primitive === 'placeLife' && !available.has(step.operation.bottomBinding)) ctx.addIssue({ code: 'custom', message: 'UNBOUND_SUBJECT' })
      if (step.operation.primitive === 'addToLife' && step.operation.bottomBinding && !available.has(step.operation.bottomBinding)) ctx.addIssue({ code: 'custom', message: 'UNBOUND_SUBJECT' })
      if (step.operation.primitive === 'arrangeTopDeck' && (!available.has(step.operation.orderBinding) || (step.operation.bottomBinding !== undefined && !available.has(step.operation.bottomBinding)))) ctx.addIssue({ code: 'custom', message: 'UNBOUND_SUBJECT' })
    }
  }
  const binds = d.program.filter(s => s.kind === 'CHOICE').map(s => s.bind)
  if (new Set(binds).size !== binds.length) ctx.addIssue({ code: 'custom', message: 'DUPLICATE_BINDING' })
})
export type EffectDefinition = z.infer<typeof effectDefinitionSchema>
export const replacementSchema = z.strictObject({ id, condition: conditionSchema,
  match: z.strictObject({ primitive: z.enum(['giveRestedDon', 'moveDon']), recipient: z.enum(['CONTROLLER', 'OPPONENT', 'EITHER']) }),
  action: z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('PREVENT') }), z.strictObject({ kind: z.literal('REPLACE'), operation: operationSpecSchema })]),
})
export const restrictionSchema = z.strictObject({ id, playerId: id, prohibited: z.enum(['ADD_DON', 'MOVE_DON', 'REST']), afterRestedDon: integer.max(10).optional() })
// M6 optional conditions: count of the controller's Characters (source included), the controller's turn only, the
// source being rested. `targets` makes an aura over the controller's Leader/Characters having at least one trait
// (each source applies once per card, FAQ ST02-014); without it the modifier applies to the source itself.
export const continuousDefinitionSchema = z.strictObject({ id, definitionId: id, zone: z.enum(['characters', 'leader', 'stage', 'hand']), characteristic: z.enum(['POWER', 'COST']), amount: z.number().int().min(-100000).max(100000), minimumAttachedDon: integer.max(10),
  // "If you have a Character with a cost of N or more": POWER only, so that a cost never depends on itself.
  whenOwnCharacterCostAtLeast: integer.min(1).max(20).optional(),
  // "If you have N or more DON!! cards on your field" (cost area and given DON!!).
  minimumFieldDon: integer.min(1).max(10).optional(),
  // "If you have N or more Characters with a base cost of X or more" (base cost: no dependency on modified costs).
  minimumBaseCostCharacters: z.strictObject({ count: integer.min(1).max(5), minCost: integer.min(0).max(20) }).optional(),
  // "If you (your opponent) have a [Name] Character with N (base) power or more" — e.g. a cost reduction of this card in hand.
  whenCharacter: z.strictObject({ side: z.enum(['OWN', 'OPPONENT']), namesAny: z.array(z.string().min(1).max(128)).min(1).max(4).optional(), minPower: z.number().int().min(0).max(100000), powerBasis: z.enum(['CURRENT', 'BASE']) }).optional(),
  minimumOwnCharacters: integer.min(1).max(5).optional(), duringYourTurn: z.literal(true).optional(), sourceRested: z.literal(true).optional(),
  // [Opponent's Turn]; "If you have N or less Life cards".
  duringOpponentTurn: z.literal(true).optional(), maximumOwnLife: integer.max(20).optional(), minimumOwnLife: integer.min(1).max(20).optional(),
  // "If you have a total of N or more given DON!! cards" (all of your Leader and Characters, FAQ ST31-003).
  minimumGivenDon: integer.min(1).max(10).optional(),
  // "During the turn in which a card in your hand is trashed by an effect" (any player's effect, FAQ ST33-004); "If you have N or
  // more cards in your hand".
  whenOwnHandTrashedThisTurn: z.literal(true).optional(), minimumHandSize: integer.min(1).max(50).optional(),
  // "If the number of your Life cards is equal to or less than the number of your opponent's Life cards".
  whenOwnLifeAtMostOpponent: z.literal(true).optional(),
  // M7 zone-count conditions (no characteristic read, so no dependency loop): "If you have N or less cards in your hand", "N or more
  // cards in your trash", "N or less cards in your deck", "your opponent has N or more rested Characters", "your Leader is
  // multicolored", "If you have [Name]" (a Character of that name).
  maximumHandSize: integer.max(50).optional(), minimumTrash: integer.min(1).max(60).optional(), maximumDeckSize: integer.max(60).optional(),
  minimumOpponentRestedCharacters: integer.min(1).max(5).optional(), leaderMulticolored: z.literal(true).optional(), whenOwnNamed: z.string().min(1).max(128).optional(),
  // "N or less DON!! cards on your field", "N or more Events in your trash"; "If there is a Character with a cost of N or more" (either
  // player's current cost: POWER and keywords only, so that no cost depends on a cost).
  maximumFieldDon: integer.max(10).optional(), minimumTrashEvents: integer.min(1).max(60).optional(), whenAnyCharacterCostAtLeast: integer.min(1).max(20).optional(),
  // "+N for every 4 cards in your trash": amount multiplied by floor(trash / perTrashCards) (the card itself only).
  perTrashCards: integer.min(1).max(60).optional(),
  // "If you have N or more rested DON!! cards".
  minimumRestedDon: integer.min(1).max(10).optional(),
  // "If your Leader has the {X} type"; "If you have N or more rested cards" (Leader, Characters, Stage, cost-area DON!!, FAQ
  // ST16-003: the source counts); "If you have a rested [Name]" (Leader or Character).
  whenLeaderHasTrait: z.string().min(1).max(128).optional(), minimumOwnRestedCards: integer.min(1).max(30).optional(), whenOwnRestedNamed: z.string().min(1).max(128).optional(),
  // An aura over the controller's other cards: {type} and/or colour filters; charactersOnly excludes the Leader ("all of
  // your Characters"). A stage source is always an aura.
  targets: z.strictObject({ traitsAny: z.array(z.string().min(1).max(128)).min(1).max(8).optional(), colorsAny: z.array(z.enum(['RED', 'GREEN', 'BLUE', 'PURPLE', 'BLACK', 'YELLOW'])).min(1).max(6).optional(),
    charactersOnly: z.literal(true).optional(), leaderOnly: z.literal(true).optional(), traitIncludesAny: z.array(z.string().min(1).max(128)).min(1).max(4).optional(), maxBasePower: z.number().int().optional(),
    minBasePower: z.number().int().optional(), namesAny: z.array(z.string().min(1).max(128)).min(1).max(4).optional() }).optional() })
  .refine(m => m.whenOwnCharacterCostAtLeast === undefined || m.characteristic === 'POWER', { message: 'COST_CONDITION_ONLY_FOR_POWER' })
  .refine(m => m.whenAnyCharacterCostAtLeast === undefined || m.characteristic === 'POWER', { message: 'COST_CONDITION_ONLY_FOR_POWER' })
  .refine(m => m.zone !== 'stage' || m.targets !== undefined, { message: 'STAGE_CONTINUOUS_NEEDS_TARGETS' })
  // A card in hand only changes its own cost ("give this card in your hand −N cost").
  .refine(m => m.zone !== 'hand' || (m.characteristic === 'COST' && !m.targets && m.minimumAttachedDon === 0), { message: 'HAND_CONTINUOUS_IS_OWN_COST' })
export const conditionalKeywordSchema = z.strictObject({ id, definitionId: id, zone: z.enum(['characters', 'leader']), keyword: z.enum(['RUSH', 'RUSH_CHARACTER', 'DOUBLE_ATTACK', 'BANISH', 'UNBLOCKABLE', 'BLOCKER', 'ATTACK_ACTIVE_CHARACTERS']), minimumAttachedDon: integer.max(10),
  // M6: only while a Character (either side) has a current cost of at most this value (FAQ ST06-004: checked continuously).
  whenAnyCharacterCostAtMost: integer.max(20).optional(),
  // "If you have a Character with a cost of N or more, this Character gains [Rush]".
  whenOwnCharacterCostAtLeast: integer.min(1).max(20).optional(),
  // "If you have N or more DON!! cards on your field".
  minimumFieldDon: integer.min(1).max(10).optional(),
  leaderHasAttribute: z.enum(['STRIKE', 'SLASH', 'RANGED', 'SPECIAL', 'WISDOM']).optional(), leaderHasTrait: z.string().min(1).max(128).optional(),
  // "If you have a purple {X} type Character other than [Name]".
  whenOtherOwnCharacter: z.strictObject({ colorsAny: z.array(z.enum(['RED', 'GREEN', 'BLUE', 'PURPLE', 'BLACK', 'YELLOW'])).min(1).max(6).optional(), traitsAny: z.array(z.string().min(1).max(128)).min(1).max(8).optional(), nameNot: z.string().min(1).max(128) }).optional(),
  // "If your Leader's type includes \"X\""; "If you have N or less Life cards".
  leaderTraitIncludes: z.string().min(1).max(128).optional(), maximumOwnLife: integer.max(20).optional(),
  // [Opponent's Turn]; "If you have a total of N or more given DON!! cards" (FAQ ST31-003: Leader and Characters).
  duringOpponentTurn: z.literal(true).optional(), minimumGivenDon: integer.min(1).max(10).optional(),
  // "If you have N or more Characters with a base cost of X or more".
  minimumBaseCostCharacters: z.strictObject({ count: integer.min(1).max(5), minCost: integer.min(0).max(20) }).optional(),
  // M7 zone-count conditions (no characteristic read, so no dependency loop): "If you have N or less cards in your hand", "N or more
  // cards in your trash", "N or less cards in your deck", "your opponent has N or more rested Characters", "your Leader is
  // multicolored", "If you have [Name]" (a Character of that name).
  maximumHandSize: integer.max(50).optional(), minimumTrash: integer.min(1).max(60).optional(), maximumDeckSize: integer.max(60).optional(),
  minimumOpponentRestedCharacters: integer.min(1).max(5).optional(), leaderMulticolored: z.literal(true).optional(), whenOwnNamed: z.string().min(1).max(128).optional(),
  // "N or less DON!! cards on your field", "N or more Events in your trash"; "If there is a Character with a cost of N or more" (either
  // player's current cost: POWER and keywords only, so that no cost depends on a cost).
  maximumFieldDon: integer.max(10).optional(), minimumTrashEvents: integer.min(1).max(60).optional(), whenAnyCharacterCostAtLeast: integer.min(1).max(20).optional() })
// M6 continuous K.O. protection of a printed card: in battle or by effects, optionally with N field DON!! (FAQ ST05-008).
export const koProtectionSchema = z.strictObject({ id, definitionId: id, zone: z.literal('characters'), from: z.enum(['BATTLE', 'EFFECT']), minimumFieldDon: integer.max(10).optional(),
  // "cannot be K.O.'d in battle by Leaders" (BATTLE only): the attacker is a Leader.
  byLeaders: z.literal(true).optional(),
  // [DON!! xN] and "If you have N or less Life cards" (ST09-004).
  minimumAttachedDon: integer.min(1).max(10).optional(), maximumOwnLife: integer.max(20).optional(),
  // [Opponent's Turn]; "If you have a Character with a cost of N or more".
  duringOpponentTurn: z.literal(true).optional(), whenOwnCharacterCostAtLeast: integer.min(1).max(20).optional(),
  // "cannot be K.O.'d by your opponent's effects" (EFFECT only): the K.O.ing effect is controlled by the opponent.
  opponentEffectsOnly: z.literal(true).optional(),
  // "If your opponent has N or less Life cards".
  maximumOpponentLife: integer.max(20).optional(),
  // An aura while the source is on the field: "your Characters with a cost of N or less other than [Name] cannot be K.O.'d", "If you
  // have N or more Characters".
  aura: z.strictObject({ maxCost: integer.max(20), nameNot: z.string().min(1).max(128) }).optional(), minimumOwnCharacters: integer.min(1).max(5).optional(),
  // "If you have a [Name] or [Name] Character" (another Character).
  whenOwnCharacterNamed: z.array(z.string().min(1).max(128)).min(1).max(4).optional() }).refine(k => !k.byLeaders || k.from === 'BATTLE').refine(k => !k.opponentEffectsOnly || k.from === 'EFFECT')
// M6 printed attack prohibitions: "This Character cannot attack" (self) and "If your Leader is [Name], all Characters with a cost
// of A to B cannot attack" (all Characters of both players while the source is on its controller's field).
// M6 a Leader's Life rule: "Your face-up Life cards are placed at the bottom of your deck instead of being added to your hand,
// according to the rules" (FAQ ST13-003: no [Trigger]; also an effect adding it to hand, whose cost is then not paid).
// NEGATE_OWN_ON_PLAY: "Your [On Play] effects are negated" (FAQ OP09-081: also a [Trigger] activating an [On Play]).
export const lifeRuleSchema = z.strictObject({ id, definitionId: id, zone: z.literal('leader'), rule: z.enum(['FACE_UP_LIFE_TO_DECK_BOTTOM', 'NEGATE_OWN_ON_PLAY']) })
// zone 'leader': "This Leader cannot attack" (the card itself only).
export const attackProhibitionSchema = z.strictObject({ id, definitionId: id, zone: z.enum(['characters', 'leader']), self: z.literal(true).optional(),
  all: z.strictObject({ minCost: integer.max(20), maxCost: integer.max(20) }).optional(), leaderName: z.string().min(1).max(128).optional() }).refine(p => !!p.self !== !!p.all).refine(p => p.zone === 'characters' || p.self, { message: 'LEADER_PROHIBITION_IS_SELF' })
export const blockerRestrictionSchema = z.strictObject({ id, source: sourceSchema, subject: presenceSchema, controllerId: id, scope: z.enum(['BATTLE', 'TURN']), battleId: id.optional(), turnId: integer.optional(), minimumBlockerPower: integer.optional() }).superRefine((value, ctx) => {
  if ((value.scope === 'BATTLE') !== (value.battleId !== undefined) || (value.scope === 'TURN') !== (value.turnId !== undefined)) ctx.addIssue({ code: 'custom', message: 'INVALID_BLOCKER_RESTRICTION_DURATION' })
})
export const cardReplacementSchema = z.union([z.strictObject({ id, definitionId: id, zone: z.literal('characters'), match: z.literal('SELF_KO_BY_EFFECT'), action: z.literal('TRASH_HAND_INSTEAD'), categories: z.array(z.enum(['EVENT', 'STAGE'])).min(1).max(2), usage: z.literal('ONCE_PER_TURN') }),
  // M6 "If your Character [Name] would be K.O.'d by an effect, you may trash this Character instead" (OP09-012).
  z.strictObject({ id, definitionId: id, zone: z.literal('characters'), match: z.literal('NAMED_ALLY_KO_BY_EFFECT'), protectedName: z.string().min(1).max(128), action: z.literal('TRASH_SELF_INSTEAD') }),
  // M6 generic guard: "If <this Character | your <filter> Character> would be K.O.'d | removed from the field by (your opponent's)
  // effect, you may <action> instead". REMOVAL covers every move out of the field by an effect (K.O. included). The card with
  // the ability is the guard; REST_SOURCE rests it, POWER_THIS_TURN changes the protected card's power (amount, negative).
  z.strictObject({ id, definitionId: id, zone: z.literal('characters'), match: z.literal('GUARD'), event: z.enum(['KO', 'REMOVAL']),
    // ANY: by effects (any player) and in battle ("If this Character would be K.O.'d").
    cause: z.enum(['EFFECT', 'OPPONENT_EFFECT', 'ANY']),
    protects: z.strictObject({ self: z.literal(true).optional(), others: z.literal(true).optional(), traitsAny: z.array(z.string().min(1).max(128)).min(1).max(8).optional(),
      attributesAny: z.array(z.enum(['STRIKE', 'SLASH', 'RANGED', 'SPECIAL', 'WISDOM'])).min(1).max(5).optional(), maxCost: integer.max(20).optional(),
      // "your Character with 6000 base power" (exactly, FAQ ST30-009/011): printed power bounds.
      minBasePower: integer.max(100000).optional(), maxBasePower: integer.max(100000).optional() }),
    // TRASH_SOURCE(_DRAW): "you may trash this Character (and draw 1 card) instead"; POWER_SOURCE_THIS_TURN: "give this Character -N".
    // TURN_LIFE_FACE_UP: "turn 1 card from the top of your Life cards face-up instead"; count: "trash N cards from your hand".
    action: z.enum(['TRASH_HAND', 'TRASH_LIFE_TOP', 'TRASH_LIFE_TOP_OR_BOTTOM', 'REST_SOURCE', 'POWER_THIS_TURN', 'TRASH_SOURCE', 'TRASH_SOURCE_DRAW', 'POWER_SOURCE_THIS_TURN', 'TURN_LIFE_FACE_UP']), amount: z.number().int().min(-100000).max(0).optional(),
    count: integer.min(2).max(5).optional(),
    usage: z.enum(['ONCE_PER_TURN', 'UNLIMITED']) })
    .refine(g => (g.action === 'POWER_THIS_TURN' || g.action === 'POWER_SOURCE_THIS_TURN') === (g.amount !== undefined) && !(g.protects.self && g.protects.others) && (g.count === undefined || g.action === 'TRASH_HAND'))])
export const cardOperationSchema = z.strictObject({ id, resolutionId: id, subject: presenceSchema, controllerId: id, type: z.enum(['KO', 'TRASH_HAND', 'TRASH_CHARACTER', 'REMOVE', 'TRASH_LIFE']), outcome: z.enum(['PROPOSED', 'CONFIRMED', 'REPLACED']), replacementId: id.optional() })
export const registrySchema = z.strictObject({ version: z.enum(['1.0.0', '1.1.0', '1.2.0', '1.3.0']), dslVersion: z.enum(['1.0.0', '1.1.0', '1.2.0', '1.3.0']),
  leaderReplacements: z.array(z.strictObject({ id, definitionId: id, minimumAttachedDon: integer, minimumPower: z.number().int(), amount: z.number().int().negative(), usage: z.literal('ONCE_PER_TURN') })).max(32).optional(),
  cardReplacements: z.array(cardReplacementSchema).max(32).optional(),
  continuous: z.array(continuousDefinitionSchema).max(1024).optional(),
  conditionalKeywords: z.array(conditionalKeywordSchema).max(1024).optional(),
  koProtections: z.array(koProtectionSchema).max(256).optional(),
  attackProhibitions: z.array(attackProhibitionSchema).max(64).optional(),
  lifeRules: z.array(lifeRuleSchema).max(16).optional(),
  blockerRestrictions: z.array(blockerRestrictionSchema).max(256).optional(),
  // Bounds of the whole catalogue registry (M7 compiled packs included); a game only keeps the definitions of its two decks.
  definitions: z.array(effectDefinitionSchema).max(4096), replacements: z.array(replacementSchema).max(32), restrictions: z.array(restrictionSchema).max(32),
}).superRefine((r, ctx) => {
  if (r.restrictions.some(rule => (!['1.2.0','1.3.0'].includes(r.version) && (rule.prohibited === 'REST' || rule.afterRestedDon !== undefined)) || (rule.afterRestedDon !== undefined && rule.prohibited !== 'REST'))) ctx.addIssue({ code:'custom', message:'INCOMPATIBLE_VERSION' })
  if (!['1.2.0','1.3.0'].includes(r.version) && r.leaderReplacements !== undefined) ctx.addIssue({ code: 'custom', message: 'INCOMPATIBLE_VERSION' })
  if ((r.continuous ?? []).some(m => m.minimumOwnCharacters !== undefined || m.duringYourTurn || m.sourceRested || m.targets || m.duringOpponentTurn || m.maximumOwnLife !== undefined || m.minimumOwnLife !== undefined || m.zone !== 'characters') && r.version !== '1.3.0') ctx.addIssue({ code: 'custom', message: 'INCOMPATIBLE_VERSION' })
  if (r.version !== r.dslVersion || r.definitions.some(d => d.dslVersion !== r.dslVersion) || (r.version === '1.0.0' && (r.continuous !== undefined || r.cardReplacements !== undefined || r.conditionalKeywords !== undefined)) || (r.version !== '1.3.0' && r.conditionalKeywords !== undefined)) ctx.addIssue({ code: 'custom', message: 'INCOMPATIBLE_VERSION' })
  for (const list of [r.leaderReplacements || [], r.cardReplacements || [], r.continuous || [], r.conditionalKeywords || [], r.definitions, r.replacements, r.restrictions]) if (new Set(list.map(d => d.id)).size !== list.length) ctx.addIssue({ code: 'custom', message: 'DUPLICATE_REGISTRY_ID' })
})
export type EffectRegistry = z.infer<typeof registrySchema>
const legacyPrimitiveRegistrySchema = z.strictObject({ version: z.literal('1.0.0'), primitives: z.tuple([
  z.strictObject({ id: z.literal('giveRestedDon'), version: z.literal('1.0.0') }),
  z.strictObject({ id: z.literal('moveDon'), version: z.literal('1.0.0') }),
]) })
const modernPrimitiveList = [
  z.strictObject({ id: z.literal('giveRestedDon'), version: z.literal('1.0.0') }),
  z.strictObject({ id: z.literal('moveDon'), version: z.literal('1.0.0') }),
  z.strictObject({ id: z.literal('attachRestedDon'), version: z.literal('1.0.0') }),
  z.strictObject({ id: z.literal('addPower'), version: z.literal('1.0.0') }),
  z.strictObject({ id: z.literal('koCharacter'), version: z.literal('1.0.0') }),
] as const
const preBlockerUniversalList = [...modernPrimitiveList, z.strictObject({ id: z.literal('drawCards'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('setBasePowerFromOpponentLeader'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('moveCard'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('shuffleDeck'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('searchTopDeck'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('revealCards'), version: z.literal('1.0.0') })] as const
const universalPrimitiveList = [...preBlockerUniversalList, z.strictObject({ id: z.literal('preventBlocker'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('playSelfFromTrigger'), version: z.literal('1.0.0') })] as const
const starterPrimitiveListBase = [...universalPrimitiveList, z.strictObject({ id: z.literal('trashLife'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('returnToHand'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('moveToDeckBottom'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('restCard'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('setActive'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('playCard'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('returnDon'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('grantKeyword'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('arrangeTopDeck'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('addCost'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('preventKO'), version: z.literal('1.0.0') })] as const
// M6 Life family (ST-07). Saves created before it keep the previous manifest.
const starterPrimitiveList = [...starterPrimitiveListBase, z.strictObject({ id: z.literal('lifeToHand'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('addToLife'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('placeLife'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('triggerCardToHand'), version: z.literal('1.0.0') })] as const
// M6 audited Starter Decks (ST-19): attack restriction and trashing a Character. Earlier saves keep the previous manifest.
const starterPrimitiveListAudited = [...starterPrimitiveList, z.strictObject({ id: z.literal('preventAttack'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('trashCharacter'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('disableBlocker'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('returnGivenDon'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('lifeToDeckTop'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('arrangeLife'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('turnLifeFaceUp'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('lockLifeToHand'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('lockRefresh'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('setBasePower'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('scheduleEndOfTurn'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('revealDeckTopCostMatch'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('preventRest'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('turnLifeFaceDown'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('revealDeckTopMatch'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('negateOnPlay'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('limitAttackTargets'), version: z.literal('1.0.0') })] as const
// The audited list only grows at its end: a game saved by an earlier deployment carries one of its prefixes and stays
// readable (its registry only uses the primitives it declares).
const auditedPrefixes = Array.from({ length: starterPrimitiveListAudited.length - starterPrimitiveList.length }, (_, i) =>
  z.tuple(starterPrimitiveListAudited.slice(0, starterPrimitiveList.length + i + 1) as unknown as typeof starterPrimitiveListAudited))
export const primitiveRegistrySchema = z.union([legacyPrimitiveRegistrySchema,
  z.strictObject({ version: z.literal('1.1.0'), primitives: z.tuple(modernPrimitiveList) }),
  z.strictObject({ version: z.literal('1.2.0'), primitives: z.tuple([...modernPrimitiveList, z.strictObject({ id: z.literal('drawCards'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('setBasePowerFromOpponentLeader'), version: z.literal('1.0.0') })]) }),
  // Older 1.3.0 saves stay readable; newly created states advertise the extended combat primitive.
  z.strictObject({ version: z.literal('1.3.0'), primitives: z.union([z.tuple(preBlockerUniversalList), z.tuple([...preBlockerUniversalList, z.strictObject({ id: z.literal('trashLife'), version: z.literal('1.0.0') })]), z.tuple([...preBlockerUniversalList, z.strictObject({ id: z.literal('preventBlocker'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('trashLife'), version: z.literal('1.0.0') })]), z.tuple([...universalPrimitiveList, z.strictObject({ id: z.literal('trashLife'), version: z.literal('1.0.0') })]), z.tuple(starterPrimitiveListBase), z.tuple(starterPrimitiveList), ...auditedPrefixes]) }),
])
export type PrimitiveRegistry = z.infer<typeof primitiveRegistrySchema>
export const PRIMITIVES: PrimitiveRegistry = { version: '1.0.0', primitives: [{ id: 'giveRestedDon', version: '1.0.0' }, { id: 'moveDon', version: '1.0.0' }] }
export const CARD_PRIMITIVES: PrimitiveRegistry = { version: '1.1.0', primitives: [{ id: 'giveRestedDon', version: '1.0.0' }, { id: 'moveDon', version: '1.0.0' }, { id: 'attachRestedDon', version: '1.0.0' }, { id: 'addPower', version: '1.0.0' }, { id: 'koCharacter', version: '1.0.0' }] }
export const UNIVERSAL_PRIMITIVES: PrimitiveRegistry = { version:'1.3.0', primitives:[...CARD_PRIMITIVES.primitives, {id:'drawCards',version:'1.0.0'}, {id:'setBasePowerFromOpponentLeader',version:'1.0.0'}, {id:'moveCard',version:'1.0.0'}, {id:'shuffleDeck',version:'1.0.0'}, {id:'searchTopDeck',version:'1.0.0'}, {id:'revealCards',version:'1.0.0'}, {id:'preventBlocker',version:'1.0.0'}, {id:'playSelfFromTrigger',version:'1.0.0'}, {id:'trashLife',version:'1.0.0'}, {id:'returnToHand',version:'1.0.0'}, {id:'moveToDeckBottom',version:'1.0.0'}, {id:'restCard',version:'1.0.0'}, {id:'setActive',version:'1.0.0'}, {id:'playCard',version:'1.0.0'}, {id:'returnDon',version:'1.0.0'}, {id:'grantKeyword',version:'1.0.0'}, {id:'arrangeTopDeck',version:'1.0.0'}, {id:'addCost',version:'1.0.0'}, {id:'preventKO',version:'1.0.0'}, {id:'lifeToHand',version:'1.0.0'}, {id:'addToLife',version:'1.0.0'}, {id:'placeLife',version:'1.0.0'}, {id:'triggerCardToHand',version:'1.0.0'}, {id:'preventAttack',version:'1.0.0'}, {id:'trashCharacter',version:'1.0.0'}, {id:'disableBlocker',version:'1.0.0'}, {id:'returnGivenDon',version:'1.0.0'}, {id:'lifeToDeckTop',version:'1.0.0'}, {id:'arrangeLife',version:'1.0.0'}, {id:'turnLifeFaceUp',version:'1.0.0'}, {id:'lockLifeToHand',version:'1.0.0'}, {id:'lockRefresh',version:'1.0.0'}, {id:'setBasePower',version:'1.0.0'}, {id:'scheduleEndOfTurn',version:'1.0.0'}, {id:'revealDeckTopCostMatch',version:'1.0.0'}, {id:'preventRest',version:'1.0.0'}, {id:'turnLifeFaceDown',version:'1.0.0'}, {id:'revealDeckTopMatch',version:'1.0.0'}, {id:'negateOnPlay',version:'1.0.0'}, {id:'limitAttackTargets',version:'1.0.0'}] }
export const contextSchema = z.strictObject({ controllerId: id, source: sourceSchema, effectInstanceId: id, turnId: integer, windowId: id })
export type EffectContext = z.infer<typeof contextSchema>
export type ResolutionContext = EffectContext
export const resolutionStatusSchema = z.enum(['RESOLVING', 'SUSPENDED', 'COMPLETED'])
export type ResolutionStatus = z.infer<typeof resolutionStatusSchema>
export const operationSchema = z.strictObject({ id, resolutionId: id, context: contextSchema, spec: operationSpecSchema,
  subject: presenceSchema, playerId: id, from: z.enum(['donDeck', 'cost']), to: z.enum(['donDeck', 'cost', 'attached']), targetId: id.optional(), rested: z.boolean(), appliedReplacements: z.array(id).max(32) })
export type ProposedOperation = z.infer<typeof operationSchema>
export const committedEventSchema = z.strictObject({ sequence: integer, operationId: id, resolutionId: id,
  type: z.literal('DON_MOVED'), subjectId: id, playerId: id, from: z.enum(['donDeck', 'cost']), to: z.enum(['donDeck', 'cost', 'attached']), targetId: id.optional(), rested: z.boolean(), appliedReplacements: z.array(id).max(32), audience: z.enum(['PUBLIC', 'CONTROLLER']), controllerId: id })
export type CommittedEvent = z.infer<typeof committedEventSchema>
export const continuationSchema = z.strictObject({ id, definitionId: id, definitionRevision: id, pc: integer.max(32), context: contextSchema,
  bindings: z.record(id, z.array(presenceSchema).max(10)), koCursor: integer.max(9).optional(),
  // M6: a GUARD replacement paid during a batch also protects the other cards of that step it covers (FAQ ST25-003).
  guardedBatch: z.strictObject({ pc: integer, ruleId: id, guard: presenceSchema }).optional(), interception: z.strictObject({ operation: cardOperationSchema, replacementId: id, ownerId: id, guard: presenceSchema.optional(), declined: z.array(id).max(16).optional() }).optional(),
  searchFlow: z.strictObject({ stage: z.enum(['SELECT', 'ORDER']), topCards: z.array(presenceSchema).max(10), candidates: z.array(presenceSchema).max(10), selected: z.array(presenceSchema).max(10), remainder: z.array(presenceSchema).max(10), bind: id }).optional() })
export type SerializableContinuation = z.infer<typeof continuationSchema>
export const pendingChoiceSchema = z.strictObject({ id, actorId: id, expectedVersion: integer, choiceType: z.enum(['SELECT', 'ORDER']),
  optional: z.boolean(), min: integer.max(10), max: integer.max(10), visibility: z.enum(['PRIVATE', 'PUBLIC']),
  options: z.array(z.strictObject({ token: id, presence: presenceSchema })).max(50), continuationId: id, context: contextSchema, bind: id, allOrNone: z.literal(true).optional(),
  reveal: z.literal('CHOOSER').optional(), conceal: z.literal(true).optional(), modes: integer.min(2).max(11).optional(), modeValue: z.literal('COST').optional() })
export type PendingChoice = z.infer<typeof pendingChoiceSchema>
export const effectInstanceSchema = z.strictObject({ id, definitionId: id, revision: id, context: contextSchema, status: resolutionStatusSchema })
export type EffectInstance = z.infer<typeof effectInstanceSchema>
export const modifierSchema = z.strictObject({ id, subject: presenceSchema, source: sourceSchema,
  characteristic: z.enum(['COST', 'POWER', 'BASE_POWER', 'COLOR', 'TYPE', 'KEYWORD', 'PERMISSION', 'RESTRICTION']),
  printed: z.number().int().nullable(), base: z.number().int().nullable(), current: z.number().int().nullable(),
  mode: z.enum(['ADD', 'SET_BASE', 'GRANT', 'REMOVE', 'PROHIBIT']), value: z.union([z.number().int(), id]),
  condition: conditionSchema, zone: z.enum(['hand', 'characters', 'leader', 'stage', 'trash', 'cost']),
  duration: durationSchema, dependencies: z.array(id).max(32) })
export type CharacteristicModifier = z.infer<typeof modifierSchema>
export const scheduledTriggerSchema = z.strictObject({
  id, definitionId: id, revision: id, controllerId: id, source: sourceSchema,
  causeId: id, timing: z.enum(['ON_PLAY', 'ON_KO', 'ON_CHARACTER_KO', 'WHEN_ATTACKING', 'ON_BLOCK', 'WHEN_ATTACKING_OR_ON_BLOCK', 'TRIGGER', 'END_OF_YOUR_TURN', 'END_OF_BATTLE_WITH_CHARACTER', 'ON_BATTLE_PAIRED', 'ON_DON_RETURNED', 'ON_OPPONENT_BLOCKER', 'ON_OPPONENT_ATTACK', 'ON_OPPONENT_EVENT', 'ON_OWN_HAND_TRASHED', 'ON_SOURCE_RESTED', 'ON_CHARACTER_RESTED_BY_OWN_EFFECT']), status: z.enum(['PENDING', 'RESOLVING', 'RESOLVED', 'INVALIDATED']),
  activatedOnField: z.boolean(), expectedTrashGeneration: integer.optional(),
})
export type ScheduledTrigger = z.infer<typeof scheduledTriggerSchema>
export const triggerBatchSchema = z.strictObject({ id, activePlayerId: id, triggers: z.array(scheduledTriggerSchema).min(1).max(256) })
export type TriggerBatch = z.infer<typeof triggerBatchSchema>
export const orderChoiceSchema = z.strictObject({ id, actorId: id, expectedVersion: integer, batchId: id, options: z.array(z.strictObject({ token: id, triggerId: id })).min(2).max(256) })
export const schedulerSchema = z.strictObject({ batches: z.array(triggerBatchSchema), history: z.array(scheduledTriggerSchema), orderChoice: orderChoiceSchema.nullable(), resolvingId: id.nullable() })
export type SchedulerState = z.infer<typeof schedulerSchema>
export const operationOutcomeSchema = z.enum(['CONFIRMED', 'PREVENTED', 'REPLACED', 'UNAVAILABLE'])
export type OperationOutcome = z.infer<typeof operationOutcomeSchema>
export const paymentOutcomeSchema = z.enum(['INITIAL_UNPAYABLE', 'PAID', 'INTERRUPTED'])
export type PaymentOutcome = z.infer<typeof paymentOutcomeSchema>
export const unifiedOperationSchema = z.strictObject({ id, resolutionId: id, subject: presenceSchema, controllerId: id,
  type: z.enum(['REST', 'MOVE_DON', 'ATTACH_DON', 'ADD_POWER', 'KO', 'MOVE_CARD']), intent: z.enum(['COST', 'EFFECT', 'RULE']),
  outcome: operationOutcomeSchema, amount: z.number().int().optional(), from: id.optional(), to: id.optional(), replacementId: id.optional(),
})
export type UnifiedOperation = z.infer<typeof unifiedOperationSchema>
export const runtimeSchema = z.strictObject({ version: z.enum(['1.0.0', '1.1.0', '1.2.0', '1.3.0']), engineVersion: z.enum(['m1.5b-1', 'm1.5c-1', 'm1.5d-1', 'm1.5e-1']), rulesVersion: z.literal('1.2.1'),
  blockerRestrictions: z.array(blockerRestrictionSchema).max(256).optional(),
  keywordGrants: z.array(z.strictObject({ id, subject: presenceSchema, keyword: z.enum(['RUSH', 'DOUBLE_ATTACK', 'BANISH', 'UNBLOCKABLE']), turnId: integer, battleId: id.optional() })).max(256).optional(),
  // untilTurn (exclusive): "until the end of your opponent's next turn" lasts through the next turn.
  costModifiers: z.array(z.strictObject({ id, subject: presenceSchema, amount: z.number().int(), turnId: integer, untilTurn: integer.optional() })).max(256).optional(),
  // M6 "cannot attack" restrictions; untilTurn is exclusive.
  attackRestrictions: z.array(z.strictObject({ id, subject: presenceSchema, untilTurn: integer })).max(256).optional(),
  // M6 players who cannot add Life cards to their hand by their own effects during turnId.
  lifeToHandLocks: z.array(z.strictObject({ id, playerId: id, turnId: integer })).max(64).optional(),
  // M6 cards of playerId that stay rested in its next Refresh Phase; delayed [End of Your Turn] parts scheduled for turnId.
  refreshLocks: z.array(z.strictObject({ id, subject: presenceSchema, playerId: id })).max(64).optional(),
  // M6 the resolution that returned each announced DON_RETURNED event (last 64), to group DON!! returned at the same time.
  // M6 hand cards trashed by an effect (cost, effect or replacement): one group per trashing step (last 64).
  // M6 cards rested by an effect or by a rule (attack, [Blocker]) (last 64): causes of the rest observers.
  restEvents: z.array(z.strictObject({ id, instanceId: id, generation: integer, turnId: integer, byEffectOf: id.optional() })).max(64).optional(),
  onPlayNegations: z.array(z.strictObject({ id, playerId: id, untilTurn: integer })).max(64).optional(),
  restLocks: z.array(z.strictObject({ id, subject: presenceSchema, untilTurn: integer })).max(64).optional(),
  attackTargetLimits: z.array(z.strictObject({ id, subject: presenceSchema, maxBaseCost: integer, turnId: integer })).max(64).optional(),
  handTrashes: z.array(z.strictObject({ group: id, playerId: id, turnId: integer, controllerId: id, sourceDefinitionId: id.optional() })).max(64).optional(),
  donReturnCauses: z.array(z.strictObject({ sequence: integer, resolutionId: id, playerId: id })).max(64).optional(),
  delayedTriggers: z.array(z.strictObject({ id, definitionId: id, subject: presenceSchema, controllerId: id, turnId: integer, fired: z.literal(true).optional() })).max(64).optional(),
  // M6 Characters that cannot activate [Blocker] during turnId.
  blockerDisables: z.array(z.strictObject({ id, subject: presenceSchema, turnId: integer })).max(256).optional(),
  koImmunities: z.array(z.strictObject({ id, subject: presenceSchema, turnId: integer })).max(256).optional(),
  scheduler: schedulerSchema.optional(), operations: z.array(unifiedOperationSchema).optional(), payments: z.array(z.strictObject({ resolutionId: id, outcome: paymentOutcomeSchema, paidOperationIds: z.array(id) })).optional(),
  registry: registrySchema, primitives: primitiveRegistrySchema, nextId: integer,
  active: effectInstanceSchema.nullable(), continuation: continuationSchema.nullable(), choice: pendingChoiceSchema.nullable(),
  usage: z.record(z.string().min(1).max(2048), integer), events: z.array(committedEventSchema),
  trace: z.array(z.strictObject({ operation: operationSchema, outcome: z.enum(['CONFIRMED', 'PREVENTED', 'REPLACED']) })),
  choiceHistory: z.array(z.strictObject({ choiceId: id, actorId: id, tokens: z.array(id).max(10), visibility: z.enum(['PRIVATE', 'PUBLIC']) })),
  powerModifiers: z.array(z.strictObject({ id, subject: presenceSchema, source: sourceSchema, amount: z.number().int(), turnId: integer, untilTurn: integer.optional() })).optional(),
  basePowerModifiers: z.array(z.strictObject({ id, subject: presenceSchema, source: sourceSchema, value: z.number().int().nonnegative(), expiresForPlayerId: id, expiresAtPlayerTurn: integer })).optional(),
  cardOperations: z.array(cardOperationSchema).optional(),
  cardEvents: z.array(z.strictObject({ sequence: integer, type: z.enum(['DON_ATTACHED_BY_EFFECT', 'SOURCE_RESTED', 'POWER_MODIFIER_CREATED', 'BLOCKER_RESTRICTION_CREATED', 'ABILITY_ACTIVATED', 'ABILITY_COMPLETED', 'ON_PLAY_CAPTURED', 'CARD_KO', 'HAND_CARD_TRASHED', 'KO_REPLACED', 'EVENT_ACTIVATED', 'CARD_RESTED', 'CARD_SET_ACTIVE', 'REMOVAL_REPLACED']), controllerId: id, subjectId: id, resolutionId: id })).optional(),
  modifiers: z.array(modifierSchema).max(0), // Contract exists; evaluator deliberately unavailable.
})
export type EffectRuntime = z.infer<typeof runtimeSchema>
export function validateRegistry(value: unknown): EffectRegistry {
  const parsed = registrySchema.safeParse(value)
  if (!parsed.success) {
    if (parsed.error.issues.some(i => i.path.includes('primitive'))) throw new Error('UNKNOWN_EFFECT_PRIMITIVE')
    if (parsed.error.issues.some(i => i.path.includes('version') || i.path.includes('dslVersion'))) throw new Error('INCOMPATIBLE_EFFECT_VERSION')
    if (parsed.error.issues.some(i => i.message.endsWith('NOT_IMPLEMENTED'))) throw new Error('UNSUPPORTED_EFFECT_FEATURE')
    throw new Error('INVALID_EFFECT_REGISTRY')
  }
  return parsed.data
}
export function validateModifier(value: unknown): CharacteristicModifier {
  const result = modifierSchema.safeParse(value)
  if (!result.success) throw new Error('INVALID_CHARACTERISTIC_MODIFIER')
  return result.data
}
// Graph diagnostic only. No arbitrary priority or numerical fixed-point rule.
export function inspectModifierDependencies(modifiers: CharacteristicModifier[]): 'ACYCLIC_NOT_IMPLEMENTED' | 'CYCLIC_UNSUPPORTED' {
  const byId = new Map(modifiers.map(m => [m.id, m]))
  if (byId.size !== modifiers.length || modifiers.some(m => m.dependencies.some(d => !byId.has(d)))) throw new Error('INVALID_MODIFIER_DEPENDENCIES')
  const visiting = new Set<string>(), done = new Set<string>()
  function visit(id: string): boolean {
    if (visiting.has(id)) return true
    if (done.has(id)) return false
    visiting.add(id)
    if (byId.get(id)!.dependencies.some(visit)) return true
    visiting.delete(id); done.add(id); return false
  }
  return modifiers.some(m => visit(m.id)) ? 'CYCLIC_UNSUPPORTED' : 'ACYCLIC_NOT_IMPLEMENTED'
}
