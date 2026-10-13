import { resolveLeaderLife } from './leaderLife'
import type { AdapterResult, CardCategory, CardColor, CardInput } from './types'
const categories: Record<string, CardCategory> = { LEADER: 'LEADER', CHARACTER: 'CHARACTER', PERSONNAGE: 'CHARACTER', EVENT: 'EVENT', EVENEMENT: 'EVENT', EVENEMENTS: 'EVENT', STAGE: 'STAGE', LIEU: 'STAGE', DON: 'DON', 'DON!!': 'DON' }
const colors: Record<string, CardColor> = { RED: 'RED', ROUGE: 'RED', GREEN: 'GREEN', VERT: 'GREEN', BLUE: 'BLUE', BLEU: 'BLUE', PURPLE: 'PURPLE', VIOLET: 'PURPLE', BLACK: 'BLACK', NOIR: 'BLACK', YELLOW: 'YELLOW', JAUNE: 'YELLOW' }
const normalized = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()

// Only known artwork suffixes may be removed; never truncate an arbitrary identifier.
export function canonicalNumber(value: string): string | null {
  const match = /^(OP|EB|ST|PRB)-?(\d{2})-(\d{3})(?:_p\d+)?$/i.exec(value.trim())
  if (match) return `${match[1].toUpperCase()}${match[2]}-${match[3]}`
  const promo = /^P-(\d{3})(?:_p\d+)?$/i.exec(value.trim())
  return promo ? `P-${promo[1]}` : null
}
export function numericCharacteristic(value: unknown): number | null | 'INVALID' {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim()) || value === '-') return null
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : 'INVALID'
  return typeof value === 'string' && /^\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value)) ? Number(value) : 'INVALID'
}
export function adaptCard(input: CardInput): AdapterResult {
  const errors = [...(input.conflicts || []).map(c => `CONFLICT:${c}`)]
  const number = canonicalNumber(input.number)
  if (!number) errors.push('INVALID_NUMBER')
  if (number && !new RegExp(`^${number}::(?:standard|_p\\d+)$`, 'i').test(input.printingKey)) errors.push('INVALID_PRINTING_ID')
  const category = categories[normalized(input.category)]
  if (!category) errors.push('UNKNOWN_CATEGORY')
  const tokens = (Array.isArray(input.colors) ? input.colors : input.colors.split(/[\s/,]+/)).filter(Boolean)
  const mapped = tokens.map(c => colors[normalized(c)])
  if (!mapped.length || mapped.some(c => !c)) errors.push('UNKNOWN_COLOR')
  if (!input.nameFr.trim() || !input.rulesName.trim()) errors.push('MISSING_NAME')
  if (['LEADER', 'CHARACTER'].includes(category) && !input.attributes.length) errors.push('MISSING_ATTRIBUTE')
  if (!input.traits.length && category !== 'DON') errors.push('MISSING_TRAITS')
  const values = { cost: numericCharacteristic(input.cost), power: numericCharacteristic(input.power), counter: numericCharacteristic(input.counter), life: numericCharacteristic(input.life) }
  for (const [field, value] of Object.entries(values)) if (value === 'INVALID') errors.push(`INVALID_${field.toUpperCase()}`)
  if (category === 'LEADER' && values.life === null) errors.push('MISSING_LIFE')
  if (category === 'LEADER' && (resolveLeaderLife(input.lifeEvidence || []).status !== 'verified' || resolveLeaderLife(input.lifeEvidence || []).life !== values.life)) errors.push('UNVERIFIED_LIFE')
  if (['EVENT', 'STAGE', 'DON'].includes(category) && values.power !== null) errors.push('UNEXPECTED_POWER')
  if (category !== 'CHARACTER' && values.counter !== null) errors.push('UNEXPECTED_COUNTER')
  if (input.attributes.some(a => !['SLASH', 'STRIKE', 'RANGED', 'SPECIAL', 'WISDOM', '?'].includes(a))) errors.push('UNKNOWN_ATTRIBUTE')
  if (input.traits.some(t => !t.trim())) errors.push('INVALID_TRAITS')
  if (input.block !== null && !/^(?:[1-9]\d*|X)$/.test(input.block)) errors.push('INVALID_BLOCK')
  if (input.review && (JSON.stringify([...new Set([...input.review.effects.map(e => e.kind), ...(input.review.counterEvent ? ['counterEvent'] : []), ...(input.review.triggerOriginal.trim() ? ['trigger'] : [])])].sort()) !== JSON.stringify([...new Set(input.review.requiredCapabilities)].sort()))) errors.push('CAPABILITY_MISMATCH')
  if (input.review?.combatKeywords && (new Set(input.review.combatKeywords).size !== input.review.combatKeywords.length || input.review.combatKeywords.some(k => !['RUSH', 'RUSH_CHARACTER', 'DOUBLE_ATTACK', 'BANISH', 'UNBLOCKABLE'].includes(k)))) errors.push('INVALID_COMBAT_KEYWORD')
  if (input.review?.counterEvent && (category !== 'EVENT' || !Number.isSafeInteger(input.review.counterEvent.printedCost) || input.review.counterEvent.printedCost < 0 || (input.review.counterEvent.kind !== 'DECLARATIVE' && (!Number.isSafeInteger(input.review.counterEvent.powerBonus) || input.review.counterEvent.powerBonus <= 0))
    || (input.review.counterEvent.kind === 'DECLARATIVE' && (!/^[A-Za-z0-9_:@.-]+$/.test(input.review.counterEvent.abilityId) || input.review.counterEvent.programVersion !== '1.0.0' || !input.review.effects.some(e => e.kind === 'declarative' && e.abilityIds.includes(input.review!.counterEvent!.kind === 'DECLARATIVE' ? input.review!.counterEvent!.abilityId : ''))))
    || (input.review.counterEvent.kind === 'DON_MINUS_POWER' && (!Number.isSafeInteger(input.review.counterEvent.donMinus) || input.review.counterEvent.donMinus < 1)))) errors.push('INVALID_COUNTER_EVENT')
  if (['LEADER', 'CHARACTER'].includes(category) && values.power === null) errors.push('MISSING_POWER')
  if (['CHARACTER', 'EVENT', 'STAGE'].includes(category) && values.cost === null) errors.push('MISSING_COST')
  if (category !== 'LEADER' && values.life !== null) errors.push('UNEXPECTED_LIFE')
  if (['LEADER', 'DON'].includes(category) && values.cost !== null) errors.push('UNEXPECTED_COST')
  // Data-only local imports may be normalized before regulatory review. They remain non-playable until
  // reviewed and explicitly certified; FAQ/errata flags are enforced by certificationErrors().
  if (input.review === undefined || !input.review.revision || !input.review.references.length) errors.push('UNREVIEWED_DEFINITION')
  if (errors.length || !number || !category || !input.review) return { ok: false, errors }
  const definitionId = `${number}@${input.review.revision}`
  return { ok: true, card: {
    definition: { definitionId, number, revision: input.review.revision, nameFr: input.nameFr, rulesName: input.rulesName, category, colors: [...new Set(mapped)].sort(), attributes: [...input.attributes], traits: [...input.traits], cost: values.cost as number | null, power: values.power as number | null, counter: values.counter as number | null, life: values.life as number | null, block: input.block, lifeEvidence: structuredClone(input.lifeEvidence || []), review: structuredClone(input.review) },
    printing: { printingKey: input.printingKey, definitionId, databaseIds: [...input.databaseIds], extensions: [...input.extensions] },
  } }
}

// Alternative arts may share rules, but contradictory characteristics cannot be collapsed.
export function consolidateDefinitions(cards: CardInput[]) {
  const definitions = new Map<string, NonNullable<Extract<AdapterResult, { ok: true }>>['card']['definition']>()
  const printings = new Map<string, NonNullable<Extract<AdapterResult, { ok: true }>>['card']['printing']>()
  const errors: string[] = []
  const conflicted = new Set<string>()
  for (const input of cards) {
    const result = adaptCard(input)
    if (!result.ok) {
      errors.push(...result.errors.map(e => `${input.printingKey}:${e}`))
      if (result.errors.some(e => e.startsWith('CONFLICT:')) && input.review && canonicalNumber(input.number)) conflicted.add(`${canonicalNumber(input.number)}@${input.review.revision}`)
      continue
    }
    const { definition, printing } = result.card
    const previous = definitions.get(definition.definitionId)
    if (previous && JSON.stringify(previous) !== JSON.stringify(definition)) { errors.push(`${definition.number}:CONFLICTING_VARIANTS`); conflicted.add(definition.definitionId); continue }
    const priorPrinting = printings.get(printing.printingKey)
    if (priorPrinting && JSON.stringify(priorPrinting) !== JSON.stringify(printing)) { errors.push(`${printing.printingKey}:CONFLICTING_PRINTING`); conflicted.add(definition.definitionId); continue }
    definitions.set(definition.definitionId, definition); printings.set(printing.printingKey, printing)
  }
  return { definitions: [...definitions.values()].filter(d => !conflicted.has(d.definitionId)), printings: [...printings.values()].filter(p => !conflicted.has(p.definitionId)), errors }
}
