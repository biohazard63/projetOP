import { z } from 'zod'

const id = z.string().regex(/^[A-Za-z0-9_:@.-]{1,256}$/).refine(value => !['__proto__', 'prototype', 'constructor'].includes(value))
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const player = z.enum(['CONTROLLER', 'OPPONENT'])
export const presenceSchema = z.strictObject({ instanceId: id, generation: integer })
export const sourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('SYNTHETIC'), extension: id }),
  z.strictObject({ kind: z.literal('CARD'), presence: presenceSchema, definitionId: id }),
  z.strictObject({ kind: z.literal('CARD_DEFINITION'), definitionId: id, zone: z.enum(['leader', 'characters', 'stage', 'temporary', 'hand']) }),
])
export type EffectSource = z.infer<typeof sourceSchema>
export const conditionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('ALWAYS') }),
  z.strictObject({ kind: z.literal('DON_AVAILABLE'), player }),
  z.strictObject({ kind: z.literal('SOURCE_ATTACHED_DON_AT_LEAST'), minimum: integer.max(10) }),
  z.strictObject({ kind: z.literal('HAND_AT_MOST'), player, maximum: integer.max(50) }),
  z.strictObject({ kind: z.literal('OPPONENT_CHARACTER_POWER_AT_LEAST'), minimum: z.number().int(), powerBasis: z.enum(['CURRENT', 'BASE']).default('CURRENT') }),
])
export type Condition = z.infer<typeof conditionSchema>
export const selectorSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('OWN_ZONE'), zone: z.enum(['hand', 'cost', 'donDeck', 'deck']), cardKind: z.enum(['CARD', 'DON']) }),
  z.strictObject({ kind: z.literal('OWN_RESTED_DON') }),
  z.strictObject({ kind: z.literal('OPPONENT_CHARACTER'), maximumPower: z.number().int(), powerBasis: z.enum(['CURRENT', 'BASE']).optional() }),
  z.strictObject({ kind: z.literal('OWN_FIELD'), trait: z.string().min(1).max(128).optional(), excludeSource: z.boolean().optional() }),
  z.strictObject({ kind: z.literal('OWN_LEADER_OR_CHARACTER') }),
  // CR 1.2.1 §3-10-2: a card leaving the Life area is the top card unless the text says otherwise.
  z.strictObject({ kind: z.literal('OPPONENT_TOP_LIFE') }),
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
])
export type EffectUsageLimit = z.infer<typeof usageSchema>
export const operationSpecSchema = z.discriminatedUnion('primitive', [
  z.strictObject({ primitive: z.literal('koCharacter'), version: z.literal('1.0.0'), player: z.literal('OPPONENT'), audience: z.literal('PUBLIC'), subjectBinding: id }),
  z.strictObject({ primitive: z.literal('attachRestedDon'), version: z.literal('1.0.0'), player, audience: z.enum(['PUBLIC', 'CONTROLLER']), subjectBinding: id, targetBinding: id }),
  z.strictObject({ primitive: z.literal('addPower'), version: z.literal('1.0.0'), player, audience: z.enum(['PUBLIC', 'CONTROLLER']), subjectBinding: id.optional(), amount: z.number().int().min(-100000).max(100000), duration: z.enum(['THIS_TURN', 'THIS_BATTLE']) }),
  z.strictObject({ primitive: z.literal('setBasePowerFromOpponentLeader'), version: z.literal('1.0.0'), player: z.literal('CONTROLLER'), audience: z.literal('PUBLIC'), duration: z.literal('UNTIL_START_OF_NEXT_TURN') }),
  z.strictObject({ primitive: z.literal('moveCard'), version: z.literal('1.0.0'), player, audience: z.enum(['PUBLIC', 'CONTROLLER']), subjectBinding: id, from: z.enum(['hand', 'deck', 'trash']), to: z.enum(['hand', 'deck', 'trash']) }).refine(o => o.from !== o.to && (!['hand','deck'].includes(o.to) || o.audience === 'CONTROLLER')),
  z.strictObject({ primitive: z.literal('drawCards'), version: z.literal('1.0.0'), player, audience: z.literal('CONTROLLER'), amount: integer.max(10) }),
  z.strictObject({ primitive: z.literal('giveRestedDon'), version: z.literal('1.0.0'), player, audience: z.enum(['PUBLIC', 'CONTROLLER']), subjectBinding: id.optional() }),
  z.strictObject({ primitive: z.literal('moveDon'), version: z.literal('1.0.0'), player, audience: z.enum(['PUBLIC', 'CONTROLLER']), subjectBinding: id.optional(), from: z.enum(['donDeck', 'cost']), to: z.enum(['donDeck', 'cost']), rested: z.boolean() })
    .refine(o => o.from !== o.to && (o.to !== 'donDeck' || !o.rested)),
  z.strictObject({ primitive: z.literal('trashLife'), version: z.literal('1.0.0'), player: z.literal('OPPONENT'), audience: z.literal('PUBLIC'), subjectBinding: id }),
])
export type OperationSpec = z.infer<typeof operationSpecSchema>
const searchTopDeckSchema = z.strictObject({ kind: z.literal('SEARCH_TOP_DECK'), amount: integer.min(1).max(10), trait: z.string().min(1).max(128).optional(), category: z.enum(['CHARACTER','EVENT','STAGE']).optional(), excludeRulesName: z.string().min(1).max(128).optional(), maxSelected: integer.min(1).max(10), bind: id, revealSelected: z.literal(true), destination: z.literal('hand'), remainder: z.literal('BOTTOM_ANY_ORDER') }).refine(step=>step.maxSelected<=step.amount)
const shuffleDeckSchema = z.strictObject({ kind: z.literal('SHUFFLE_DECK'), player })
const revealBindingSchema = z.strictObject({ kind: z.literal('REVEAL_BINDING'), bind: id })
export const stepSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('OPERATION'), operation: operationSpecSchema, whenCondition: conditionSchema.optional() }),
  z.strictObject({ kind: z.literal('CHOICE'), choiceType: z.enum(['SELECT', 'ORDER']), selector: selectorSchema,
    optional: z.boolean(), min: integer.max(10), max: integer.max(10), bind: id, visibility: z.enum(['PRIVATE', 'PUBLIC']), whenBindingNonempty: id.optional(), whenCondition: conditionSchema.optional() })
    .refine(c => c.min <= c.max && (!c.optional || c.min === 0)),
  searchTopDeckSchema, shuffleDeckSchema, revealBindingSchema,
])
export const effectDefinitionSchema = z.strictObject({
  id, revision: id, dslVersion: z.enum(['1.0.0', '1.1.0', '1.2.0', '1.3.0']), source: sourceSchema, timing: z.enum(['MAIN', 'ACTIVATE_MAIN', 'COUNTER', 'ON_PLAY', 'ON_KO', 'ON_CHARACTER_KO', 'WHEN_ATTACKING', 'ON_BLOCK', 'WHEN_ATTACKING_OR_ON_BLOCK', 'TRIGGER']),
  condition: conditionSchema, cost: costSchema, optionalCost: z.enum(['TAKE_TOP_LIFE_TO_HAND', 'RETURN_ONE_DON']).optional(), usage: usageSchema, program: z.array(stepSchema).min(1).max(32),
}).superRefine((d, ctx) => {
  if (d.dslVersion === '1.0.0' && d.source.kind !== 'SYNTHETIC') ctx.addIssue({ code: 'custom', message: 'CARD_BINDING_NOT_IMPLEMENTED' })
  if (d.timing === 'COUNTER' && (d.dslVersion !== '1.3.0' || d.source.kind !== 'CARD_DEFINITION' || d.source.zone !== 'hand' || d.cost.kind !== 'NONE')) ctx.addIssue({ code: 'custom', message: 'INVALID_COUNTER_PROGRAM' })
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
  if ((d.cost.kind !== 'DON_MINUS' && costParts.some(part => part.kind === 'DON_MINUS')) || (d.cost.kind === 'DON_MINUS' && (d.dslVersion !== '1.3.0' || d.timing !== 'ACTIVATE_MAIN'))) ctx.addIssue({ code:'custom', message:'COST_NOT_IMPLEMENTED' })
  if (d.dslVersion !== '1.3.0' && d.program.some(s => (s.kind === 'CHOICE' && s.selector.kind === 'OPPONENT_TOP_LIFE') || (s.kind === 'OPERATION' && s.operation.primitive === 'trashLife'))) ctx.addIssue({ code:'custom', message:'INCOMPATIBLE_VERSION' })
  if (d.timing === 'ON_KO' && (d.source.kind !== 'CARD_DEFINITION' || d.source.zone !== 'characters' || d.cost.kind !== 'NONE')) ctx.addIssue({ code: 'custom', message: 'ON_KO_COST_NOT_IMPLEMENTED' })
  const available = new Set<string>()
  for (const step of d.program) {
    if (step.kind === 'CHOICE') {
      if (step.whenBindingNonempty && !available.has(step.whenBindingNonempty)) ctx.addIssue({ code: 'custom', message: 'UNBOUND_GUARD' })
      if (step.visibility === 'PUBLIC' && step.selector.kind === 'OWN_ZONE' && ['hand','deck','life'].includes(step.selector.zone)) ctx.addIssue({ code:'custom', message:'PUBLIC_HIDDEN_ZONE_CHOICE' })
      available.add(step.bind)
    } else if (step.kind === 'SEARCH_TOP_DECK') {
      available.add(step.bind)
    } else if (step.kind === 'REVEAL_BINDING') {
      if (!available.has(step.bind)) ctx.addIssue({ code:'custom', message:'UNBOUND_REVEAL' })
    }
    else if (step.kind === 'OPERATION') {
      if ('subjectBinding' in step.operation && step.operation.subjectBinding && !available.has(step.operation.subjectBinding)) ctx.addIssue({ code: 'custom', message: 'UNBOUND_SUBJECT' })
      if (step.operation.primitive === 'attachRestedDon' && !available.has(step.operation.targetBinding)) ctx.addIssue({ code: 'custom', message: 'UNBOUND_TARGET' })
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
export const continuousDefinitionSchema = z.strictObject({ id, definitionId: id, zone: z.literal('characters'), characteristic: z.enum(['POWER', 'COST']), amount: z.number().int().min(-100000).max(100000), minimumAttachedDon: integer.max(10) })
export const cardReplacementSchema = z.strictObject({ id, definitionId: id, zone: z.literal('characters'), match: z.literal('SELF_KO_BY_EFFECT'), action: z.literal('TRASH_HAND_INSTEAD'), categories: z.array(z.enum(['EVENT', 'STAGE'])).min(1).max(2), usage: z.literal('ONCE_PER_TURN') })
export const cardOperationSchema = z.strictObject({ id, resolutionId: id, subject: presenceSchema, controllerId: id, type: z.enum(['KO', 'TRASH_HAND']), outcome: z.enum(['PROPOSED', 'CONFIRMED', 'REPLACED']), replacementId: id.optional() })
export const registrySchema = z.strictObject({ version: z.enum(['1.0.0', '1.1.0', '1.2.0', '1.3.0']), dslVersion: z.enum(['1.0.0', '1.1.0', '1.2.0', '1.3.0']),
  leaderReplacements: z.array(z.strictObject({ id, definitionId: id, minimumAttachedDon: integer, minimumPower: z.number().int(), amount: z.number().int().negative(), usage: z.literal('ONCE_PER_TURN') })).max(32).optional(),
  cardReplacements: z.array(cardReplacementSchema).max(32).optional(),
  continuous: z.array(continuousDefinitionSchema).max(256).optional(),
  definitions: z.array(effectDefinitionSchema).max(256), replacements: z.array(replacementSchema).max(32), restrictions: z.array(restrictionSchema).max(32),
}).superRefine((r, ctx) => {
  if (r.restrictions.some(rule => (!['1.2.0','1.3.0'].includes(r.version) && (rule.prohibited === 'REST' || rule.afterRestedDon !== undefined)) || (rule.afterRestedDon !== undefined && rule.prohibited !== 'REST'))) ctx.addIssue({ code:'custom', message:'INCOMPATIBLE_VERSION' })
  if (!['1.2.0','1.3.0'].includes(r.version) && r.leaderReplacements !== undefined) ctx.addIssue({ code: 'custom', message: 'INCOMPATIBLE_VERSION' })
  if (r.version !== r.dslVersion || r.definitions.some(d => d.dslVersion !== r.dslVersion) || (r.version === '1.0.0' && (r.continuous !== undefined || r.cardReplacements !== undefined))) ctx.addIssue({ code: 'custom', message: 'INCOMPATIBLE_VERSION' })
  for (const list of [r.leaderReplacements || [], r.cardReplacements || [], r.continuous || [], r.definitions, r.replacements, r.restrictions]) if (new Set(list.map(d => d.id)).size !== list.length) ctx.addIssue({ code: 'custom', message: 'DUPLICATE_REGISTRY_ID' })
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
const universalPrimitiveList = [...modernPrimitiveList, z.strictObject({ id: z.literal('drawCards'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('setBasePowerFromOpponentLeader'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('moveCard'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('shuffleDeck'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('searchTopDeck'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('revealCards'), version: z.literal('1.0.0') })] as const
export const primitiveRegistrySchema = z.union([legacyPrimitiveRegistrySchema,
  z.strictObject({ version: z.literal('1.1.0'), primitives: z.tuple(modernPrimitiveList) }),
  z.strictObject({ version: z.literal('1.2.0'), primitives: z.tuple([...modernPrimitiveList, z.strictObject({ id: z.literal('drawCards'), version: z.literal('1.0.0') }), z.strictObject({ id: z.literal('setBasePowerFromOpponentLeader'), version: z.literal('1.0.0') })]) }),
  // 1.3.0 saves created before M3-3 lack trashLife; they stay readable, and a program using it needs the longer manifest.
  z.strictObject({ version: z.literal('1.3.0'), primitives: z.union([z.tuple(universalPrimitiveList), z.tuple([...universalPrimitiveList, z.strictObject({ id: z.literal('trashLife'), version: z.literal('1.0.0') })])]) }),
])
export type PrimitiveRegistry = z.infer<typeof primitiveRegistrySchema>
export const PRIMITIVES: PrimitiveRegistry = { version: '1.0.0', primitives: [{ id: 'giveRestedDon', version: '1.0.0' }, { id: 'moveDon', version: '1.0.0' }] }
export const CARD_PRIMITIVES: PrimitiveRegistry = { version: '1.1.0', primitives: [{ id: 'giveRestedDon', version: '1.0.0' }, { id: 'moveDon', version: '1.0.0' }, { id: 'attachRestedDon', version: '1.0.0' }, { id: 'addPower', version: '1.0.0' }, { id: 'koCharacter', version: '1.0.0' }] }
export const UNIVERSAL_PRIMITIVES: PrimitiveRegistry = { version:'1.3.0', primitives:[...CARD_PRIMITIVES.primitives, {id:'drawCards',version:'1.0.0'}, {id:'setBasePowerFromOpponentLeader',version:'1.0.0'}, {id:'moveCard',version:'1.0.0'}, {id:'shuffleDeck',version:'1.0.0'}, {id:'searchTopDeck',version:'1.0.0'}, {id:'revealCards',version:'1.0.0'}, {id:'trashLife',version:'1.0.0'}] }
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
  bindings: z.record(id, z.array(presenceSchema).max(10)), interception: z.strictObject({ operation: cardOperationSchema, replacementId: id, ownerId: id }).optional(),
  searchFlow: z.strictObject({ stage: z.enum(['SELECT', 'ORDER']), topCards: z.array(presenceSchema).max(10), candidates: z.array(presenceSchema).max(10), selected: z.array(presenceSchema).max(10), remainder: z.array(presenceSchema).max(10), bind: id }).optional() })
export type SerializableContinuation = z.infer<typeof continuationSchema>
export const pendingChoiceSchema = z.strictObject({ id, actorId: id, expectedVersion: integer, choiceType: z.enum(['SELECT', 'ORDER']),
  optional: z.boolean(), min: integer.max(10), max: integer.max(10), visibility: z.enum(['PRIVATE', 'PUBLIC']),
  options: z.array(z.strictObject({ token: id, presence: presenceSchema })).max(50), continuationId: id, context: contextSchema, bind: id })
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
  causeId: id, timing: z.enum(['ON_PLAY', 'ON_KO', 'ON_CHARACTER_KO', 'WHEN_ATTACKING', 'ON_BLOCK', 'WHEN_ATTACKING_OR_ON_BLOCK', 'TRIGGER']), status: z.enum(['PENDING', 'RESOLVING', 'RESOLVED', 'INVALIDATED']),
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
  scheduler: schedulerSchema.optional(), operations: z.array(unifiedOperationSchema).optional(), payments: z.array(z.strictObject({ resolutionId: id, outcome: paymentOutcomeSchema, paidOperationIds: z.array(id) })).optional(),
  registry: registrySchema, primitives: primitiveRegistrySchema, nextId: integer,
  active: effectInstanceSchema.nullable(), continuation: continuationSchema.nullable(), choice: pendingChoiceSchema.nullable(),
  usage: z.record(z.string().min(1).max(2048), integer), events: z.array(committedEventSchema),
  trace: z.array(z.strictObject({ operation: operationSchema, outcome: z.enum(['CONFIRMED', 'PREVENTED', 'REPLACED']) })),
  choiceHistory: z.array(z.strictObject({ choiceId: id, actorId: id, tokens: z.array(id).max(10), visibility: z.enum(['PRIVATE', 'PUBLIC']) })),
  powerModifiers: z.array(z.strictObject({ id, subject: presenceSchema, source: sourceSchema, amount: z.number().int(), turnId: integer })).optional(),
  basePowerModifiers: z.array(z.strictObject({ id, subject: presenceSchema, source: sourceSchema, value: z.number().int().nonnegative(), expiresForPlayerId: id, expiresAtPlayerTurn: integer })).optional(),
  cardOperations: z.array(cardOperationSchema).optional(),
  cardEvents: z.array(z.strictObject({ sequence: integer, type: z.enum(['DON_ATTACHED_BY_EFFECT', 'SOURCE_RESTED', 'POWER_MODIFIER_CREATED', 'ABILITY_ACTIVATED', 'ABILITY_COMPLETED', 'ON_PLAY_CAPTURED', 'CARD_KO', 'HAND_CARD_TRASHED', 'KO_REPLACED', 'EVENT_ACTIVATED']), controllerId: id, subjectId: id, resolutionId: id })).optional(),
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
