import { z } from 'zod'
import { consolidateDefinitions } from './adapter'
import type { CardDefinition, CardInput, CardPrinting } from './types'
import {
  attackProhibitionSchema, cardReplacementSchema, conditionalKeywordSchema, continuousDefinitionSchema, effectDefinitionSchema, koProtectionSchema,
  replacementSchema, restrictionSchema, validateRegistry,
  type EffectRegistry,
} from '../effects/contracts'

/** A versioned, data-only contribution to the engine catalogue. No card-number hooks are supported. */
export type CardPack = {
  packId: string
  schemaVersion: 1
  rulesVersion: '1.2.1'
  cards: CardInput[]
  effects?: {
    definitions?: EffectRegistry['definitions']
    replacements?: EffectRegistry['replacements']
    restrictions?: EffectRegistry['restrictions']
    continuous?: NonNullable<EffectRegistry['continuous']>
    conditionalKeywords?: NonNullable<EffectRegistry['conditionalKeywords']>
    koProtections?: NonNullable<EffectRegistry['koProtections']>
    attackProhibitions?: NonNullable<EffectRegistry['attackProhibitions']>
    cardReplacements?: NonNullable<EffectRegistry['cardReplacements']>
    leaderReplacements?: NonNullable<EffectRegistry['leaderReplacements']>
  }
}

const packSchema = z.strictObject({
  packId: z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/),
  schemaVersion: z.literal(1),
  rulesVersion: z.literal('1.2.1'),
  cards: z.array(z.unknown()),
  effects: z.strictObject({
    definitions: z.array(effectDefinitionSchema).optional(),
    replacements: z.array(replacementSchema).optional(),
    restrictions: z.array(restrictionSchema).optional(),
    continuous: z.array(continuousDefinitionSchema).optional(),
    conditionalKeywords: z.array(conditionalKeywordSchema).optional(),
    koProtections: z.array(koProtectionSchema).optional(),
    attackProhibitions: z.array(attackProhibitionSchema).optional(),
    cardReplacements: z.array(cardReplacementSchema).optional(),
    leaderReplacements: z.array(z.strictObject({ id: z.string(), definitionId: z.string(), minimumAttachedDon: z.number().int().nonnegative(), minimumPower: z.number().int(), amount: z.number().int().negative(), usage: z.literal('ONCE_PER_TURN') })).optional(),
  }).optional(),
})

const sourceReferenceSchema = z.strictObject({ source: z.string(), checkedAt: z.string(), language: z.enum(['fr', 'en']), detail: z.string() })
const effectSpecSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('declarative'), abilityIds: z.array(z.string()) }),
  z.strictObject({ kind: z.literal('giveRestedDon'), timing: z.literal('ACTIVATE_MAIN'), oncePerTurn: z.literal(true), amount: z.strictObject({ min: z.literal(0), max: z.literal(1) }), from: z.literal('OWN_COST_RESTED'), target: z.literal('OWN_LEADER_OR_CHARACTER') }),
  z.strictObject({ kind: z.literal('blocker'), timing: z.literal('BLOCK'), cost: z.literal('REST_SELF'), target: z.literal('SELF') }),
])
const reviewSchema = z.strictObject({
  revision: z.string(), references: z.array(sourceReferenceSchema), faqChecked: z.boolean(), errataChecked: z.boolean(),
  effects: z.array(effectSpecSchema), effectOriginal: z.string(), effectFr: z.string(),
  translationStatus: z.literal('non_official_review_required'), triggerOriginal: z.string(), triggerFr: z.string(),
  requiredCapabilities: z.array(z.string()),
  playabilityStatus: z.enum(['PLAYABLE_VERIFIED', 'DATA_VALID_EFFECT_PENDING', 'UNSUPPORTED_MECHANIC', 'AMBIGUOUS_RULE', 'INVALID_DATA']).optional(),
  combatKeywords: z.array(z.enum(['RUSH', 'RUSH_CHARACTER', 'DOUBLE_ATTACK', 'BANISH', 'UNBLOCKABLE'])).optional(),
  counterEvent: z.union([
    z.strictObject({ kind: z.literal('DON_MINUS_POWER'), printedCost: z.number().int().nonnegative(), donMinus: z.number().int().nonnegative(), powerBonus: z.number().int().positive() }),
    z.strictObject({ kind: z.literal('OPTIONAL_LIFE_POWER'), printedCost: z.number().int().nonnegative(), powerBonus: z.number().int().positive() }),
    z.strictObject({ kind: z.literal('DECLARATIVE'), printedCost: z.number().int().nonnegative(), abilityId: z.string(), programVersion: z.literal('1.0.0') }),
  ]).optional(),
})
const cardInputSchema = z.strictObject({
  number: z.string(), printingKey: z.string(), databaseIds: z.array(z.string()), nameFr: z.string(), rulesName: z.string(),
  category: z.string(), colors: z.union([z.string(), z.array(z.string())]), attributes: z.array(z.string()), traits: z.array(z.string()),
  cost: z.unknown(), power: z.unknown(), counter: z.unknown(), life: z.unknown(), block: z.string().nullable(),
  extensions: z.array(z.string()),
  lifeEvidence: z.array(z.strictObject({ value: z.number(), source: z.string(), language: z.enum(['fr', 'en', 'local']), field: z.enum(['life', 'cost']), printing: z.string().optional(), checkedAt: z.string().optional() })).optional(),
  review: reviewSchema.optional(), conflicts: z.array(z.string()).optional(),
})

function appendUnique<T extends { id: string }>(base: T[] | undefined, additions: T[] | undefined, label: string): T[] {
  const values = [...(base ?? []), ...(additions ?? [])]
  if (new Set(values.map(value => value.id)).size !== values.length) throw new Error(`DUPLICATE_PACK_${label}`)
  return values
}

/** Validates and compiles data packs against an existing registry without executing card text. */
export function loadCardPacks(baseRegistry: EffectRegistry, input: unknown): {
  definitions: CardDefinition[]
  printings: CardPrinting[]
  registry: EffectRegistry
} {
  if (!Array.isArray(input)) throw new Error('INVALID_CARD_PACKS')
  const parsed = input.map(pack => {
    const result = packSchema.safeParse(pack)
    if (!result.success) throw new Error('INVALID_CARD_PACK')
    const cards = result.data.cards.map(value => {
      const parsedCard = cardInputSchema.safeParse(value)
      if (!parsedCard.success) throw new Error('INVALID_PACK_CARD')
      return parsedCard.data as CardInput
    })
    return { ...result.data, cards } as CardPack
  })
  if (new Set(parsed.map(pack => pack.packId)).size !== parsed.length) throw new Error('DUPLICATE_PACK_ID')

  const catalog = consolidateDefinitions(parsed.flatMap(pack => pack.cards))
  if (catalog.errors.length) throw new Error(`INVALID_PACK_CATALOG:${catalog.errors.join(',')}`)
  const contributions = parsed.map(pack => pack.effects)
  const registry = validateRegistry({
    ...structuredClone(baseRegistry),
    definitions: appendUnique(baseRegistry.definitions, contributions.flatMap(e => e?.definitions ?? []), 'EFFECT_ID'),
    replacements: appendUnique(baseRegistry.replacements, contributions.flatMap(e => e?.replacements ?? []), 'REPLACEMENT_ID'),
    restrictions: appendUnique(baseRegistry.restrictions, contributions.flatMap(e => e?.restrictions ?? []), 'RESTRICTION_ID'),
    continuous: appendUnique(baseRegistry.continuous, contributions.flatMap(e => e?.continuous ?? []), 'CONTINUOUS_ID'),
    conditionalKeywords: appendUnique(baseRegistry.conditionalKeywords, contributions.flatMap(e => e?.conditionalKeywords ?? []), 'CONDITIONAL_KEYWORD_ID'),
    koProtections: appendUnique(baseRegistry.koProtections, contributions.flatMap(e => e?.koProtections ?? []), 'KO_PROTECTION_ID'),
    cardReplacements: appendUnique(baseRegistry.cardReplacements, contributions.flatMap(e => e?.cardReplacements ?? []), 'CARD_REPLACEMENT_ID'),
    leaderReplacements: appendUnique(baseRegistry.leaderReplacements, contributions.flatMap(e => e?.leaderReplacements ?? []), 'LEADER_REPLACEMENT_ID'),
    // Only present when a pack declares one, so that earlier registries keep their exact shape.
    ...(contributions.some(e => e?.attackProhibitions?.length) ? { attackProhibitions: appendUnique(baseRegistry.attackProhibitions, contributions.flatMap(e => e?.attackProhibitions ?? []), 'ATTACK_PROHIBITION_ID') } : {}),
  })

  const definitionIds = new Set(catalog.definitions.map(card => card.definitionId))
  const knownAbilityIds = new Set([
    ...registry.definitions.map(effect => effect.id),
    ...(registry.continuous ?? []).map(effect => effect.id),
    ...(registry.conditionalKeywords ?? []).map(effect => effect.id),
    ...(registry.koProtections ?? []).map(effect => effect.id),
    ...(registry.attackProhibitions ?? []).map(effect => effect.id),
    ...(registry.cardReplacements ?? []).map(effect => effect.id),
    ...(registry.leaderReplacements ?? []).map(effect => effect.id),
  ])
  for (const card of catalog.definitions) {
    for (const spec of card.review.effects) {
      if (spec.kind !== 'declarative') continue
      if (spec.abilityIds.some(id => !knownAbilityIds.has(id))) throw new Error(`UNRESOLVED_CARD_ABILITY:${card.definitionId}`)
    }
  }
  for (const effect of registry.definitions) {
    if (effect.source.kind === 'CARD_DEFINITION' && !definitionIds.has(effect.source.definitionId)) {
      throw new Error(`EFFECT_SOURCE_NOT_IN_PACKED_CATALOG:${effect.source.definitionId}`)
    }
  }
  for (const effect of registry.conditionalKeywords ?? []) {
    const definition = catalog.definitions.find(card => card.definitionId === effect.definitionId)
    if (!definition || (effect.zone === 'leader' ? definition.category !== 'LEADER' : definition.category !== 'CHARACTER')) {
      throw new Error(`CONDITIONAL_KEYWORD_SOURCE_NOT_IN_PACKED_CATALOG:${effect.definitionId}`)
    }
  }
  return { definitions: catalog.definitions, printings: catalog.printings, registry }
}
