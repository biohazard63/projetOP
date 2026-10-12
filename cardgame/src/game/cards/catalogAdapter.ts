import type { Variant } from '../../../scripts/catalog/core'
import { resolveLeaderLife, type LifeEvidence } from './leaderLife'
import { canonicalNumber } from './adapter'
import type { CardInput } from './types'
import type { ReviewedFacts } from './reviewedCards'

// IDs are copied from an existing snapshot, never regenerated from a rules number.
export function catalogCardInput(variant: Variant, lifeEvidence: LifeEvidence[], facts?: ReviewedFacts, databaseIds: string[] = []): CardInput {
  const number = canonicalNumber(variant.number)
  const life = resolveLeaderLife(lifeEvidence)
  const conflicts: string[] = []
  if (facts) for (const field of ['cost', 'power', 'counter'] as const) {
    if (facts.category === 'LEADER' && field === 'cost') continue // Explicitly remove historical Life-as-cost from engine view only.
    if (variant[field] !== facts[field]) conflicts.push(`${field}:catalogue_does_not_match_verified_card`)
  }
  return {
    number: number || variant.number, printingKey: variant.key, databaseIds: [...databaseIds], extensions: [...variant.extensions],
    nameFr: facts?.nameFr || variant.text.name.fr || '', rulesName: facts?.rulesName || variant.text.name.original,
    category: facts?.category || variant.text.type.original, colors: facts?.colors || variant.text.color.original,
    attributes: facts?.attributes || variant.text.attribute.original.toUpperCase().split('/').filter(Boolean), traits: facts?.traits || variant.text.traits.original.split('/').filter(Boolean),
    cost: facts?.category === 'LEADER' || variant.text.type.original === 'LEADER' ? null : variant.cost,
    power: variant.power, counter: variant.counter,
    life: facts?.category === 'LEADER' || variant.text.type.original === 'LEADER' ? life.life : null,
    block: facts?.block || variant.block,
    lifeEvidence: life.evidence,
    review: facts?.review,
    conflicts: [...conflicts, ...(life.status === 'ambiguous' ? ['ambiguous_life'] : [])],
  }
}
