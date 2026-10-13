import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { canonicalNumber, numericCharacteristic } from './adapter'
import { effectiveStatus } from './certification'
import type { CardDefinition, CardCategory, CardColor } from './types'

const starterIdSchema = z.string().regex(/^ST-(?:0[1-9]|[12][0-9]|3[0-6])$/)
const localCardSchema = z.object({
  id: z.string().min(1), code: z.string().min(1), rarity: z.string(), type: z.string().min(1), name: z.string().min(1),
  cost: z.union([z.string(), z.number()]), attribute: z.string(), power: z.union([z.string(), z.number()]),
  counter: z.union([z.string(), z.number()]), color: z.string().min(1), types: z.string(), effect: z.string(), trigger: z.string(),
  extension: z.string(), image: z.string(), url: z.string(), image_local: z.string(),
}).passthrough()
const localCardListSchema = z.array(localCardSchema).min(1)

type LocalCard = z.infer<typeof localCardSchema>
export type NormalizedStarterCard = {
  number: string
  printingKey: string
  name: string
  category: CardCategory
  colors: CardColor[]
  attributes: string[]
  traits: string[]
  cost: number | null
  power: number | null
  counter: number | null
  effectText: string
  triggerText: string
  rarity: string
  source: LocalCard
}
export type LocalStarterDeck = {
  deckId: string
  sourceFile: string
  records: NormalizedStarterCard[]
  uniqueNumbers: string[]
  leaders: string[]
}

const categories: Record<string, CardCategory> = {
  LEADER: 'LEADER', CHARACTER: 'CHARACTER', PERSONNAGE: 'CHARACTER', EVENT: 'EVENT', EVENEMENT: 'EVENT', EVENEMENTS: 'EVENT',
  STAGE: 'STAGE', LIEU: 'STAGE',
}
const colors: Record<string, CardColor> = {
  RED: 'RED', ROUGE: 'RED', GREEN: 'GREEN', VERT: 'GREEN', BLUE: 'BLUE', BLEU: 'BLUE',
  PURPLE: 'PURPLE', VIOLET: 'PURPLE', BLACK: 'BLACK', NOIR: 'BLACK', YELLOW: 'YELLOW', JAUNE: 'YELLOW',
}
const attributes: Record<string, string> = {
  STRIKE: 'STRIKE', FRAPPE: 'STRIKE', SLASH: 'SLASH', TRANCHE: 'SLASH', TRANCHANT: 'SLASH', RANGED: 'RANGED', DISTANCE: 'RANGED',
  SPECIAL: 'SPECIAL', WISDOM: 'WISDOM', SAGESSE: 'WISDOM',
}

function number(value: string | number): number | null {
  const normalized = typeof value === 'string' && /^\d{1,3}(?: \d{3})+$/.test(value.trim()) ? value.replaceAll(' ', '') : value
  const result = numericCharacteristic(normalized)
  if (result === 'INVALID') throw new Error('INVALID_STARTER_CHARACTERISTIC')
  return result
}

function normalizeCard(raw: LocalCard): NormalizedStarterCard {
  const cardNumber = canonicalNumber(raw.code)
  if (!cardNumber) throw new Error('INVALID_STARTER_CARD_NUMBER')
  const category = categories[raw.type.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()]
  if (!category) throw new Error('UNKNOWN_STARTER_CARD_TYPE')
  const colorValues = raw.color.split(/[\s/,]+/).filter(Boolean).map(value => colors[value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()])
  if (!colorValues.length || colorValues.some(value => !value)) throw new Error('UNKNOWN_STARTER_CARD_COLOR')
  const attr = raw.attribute === '-' ? [] : raw.attribute.split(/[\s/,]+/).filter(Boolean).map(value => {
    const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    const normalized = attributes[key]
    if (!normalized) throw new Error('UNKNOWN_STARTER_CARD_ATTRIBUTE')
    return normalized
  })
  const rawIdMatch = /_p(\d+)$/i.exec(raw.id)
  const printingKey = `${cardNumber}::${rawIdMatch ? `_p${rawIdMatch[1]}` : 'standard'}`
  return {
    number: cardNumber, printingKey, name: raw.name, category, colors: [...new Set(colorValues as CardColor[])].sort(),
    attributes: [...new Set(attr)], traits: raw.types.split('/').map(value => value.trim()).filter(Boolean),
    cost: number(raw.cost), power: number(raw.power), counter: number(raw.counter),
    effectText: raw.effect === '-' ? '' : raw.effect, triggerText: raw.trigger === '-' ? '' : raw.trigger,
    rarity: raw.rarity, source: structuredClone(raw),
  }
}

function sourcePath(deckId: string, root: string): string {
  const candidates = [join(root, deckId, `cards-${deckId}.json`), join(root, 'nouvelle', deckId, `cards-${deckId}.json`)]
    .filter(existsSync)
  if (candidates.length > 1) throw new Error('AMBIGUOUS_STARTER_SOURCE')
  if (!candidates.length) throw new Error('STARTER_SOURCE_NOT_FOUND')
  return candidates[0]
}

/** Reads cardJson without modifying it; rows are card/printing data and never imply product quantities. */
export function loadStarterDeckSource(deckIdInput: string, root = resolve(process.cwd(), 'carteJson')): LocalStarterDeck {
  const checked = starterIdSchema.safeParse(deckIdInput)
  if (!checked.success) throw new Error('INVALID_STARTER_ID')
  const deckId = checked.data
  const file = sourcePath(deckId, resolve(root))
  let json: unknown
  try { json = JSON.parse(readFileSync(file, 'utf8')) as unknown } catch { throw new Error('INVALID_STARTER_JSON') }
  const parsed = localCardListSchema.safeParse(json)
  if (!parsed.success) throw new Error('INVALID_STARTER_CARD_RECORD')
  const records = parsed.data.map(normalizeCard)
  if (new Set(records.map(card => card.printingKey)).size !== records.length) throw new Error('DUPLICATE_STARTER_PRINTING')
  const leaders = [...new Set(records.filter(card => card.category === 'LEADER').map(card => card.number))]
  if (!leaders.length) throw new Error('STARTER_LEADER_MISSING')
  return { deckId, sourceFile: file, records, uniqueNumbers: [...new Set(records.map(card => card.number))].sort(), leaders }
}

/** Joins existing DeckCard quantities to local cardJson rows without mutating either source. */
export function attachDatabaseQuantities(deck: LocalStarterDeck, rows: DatabaseDeckCardRow[]): DatabaseStarterComposition {
  if (!rows.length) throw new Error('DATABASE_STARTER_COMPOSITION_EMPTY')
  const localNumbers = new Set(deck.uniqueNumbers)
  const quantities = new Map<string, number>()
  for (const row of rows) {
    const number = canonicalNumber(row.code)
    if (!number || !Number.isSafeInteger(row.quantity) || row.quantity <= 0) throw new Error('INVALID_DATABASE_DECK_QUANTITY')
    if (!localNumbers.has(number)) throw new Error('DATABASE_CARD_NOT_IN_STARTER_SOURCE')
    quantities.set(number, (quantities.get(number) ?? 0) + row.quantity)
  }
  const entries = [...quantities.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([number, quantity]) => ({
    number,
    quantity,
    matchedLocalPrintings: deck.records.filter(card => card.number === number).map(card => card.printingKey).sort(),
  }))
  return { source: 'DATABASE_DECK_CARDS', entries, totalCards: entries.reduce((sum, entry) => sum + entry.quantity, 0) }
}

export type DatabaseDeckCardRow = { code: string; quantity: number }
export type DatabaseStarterComposition = {
  source: 'DATABASE_DECK_CARDS'
  entries: Array<{ number: string; quantity: number; matchedLocalPrintings: string[] }>
  totalCards: number
}

export type StarterEngineCoverage = {
  printingRows: number
  cardTypes: number
  leaderCount: number
  databaseCompositionStatus: 'NOT_ATTACHED'
  recognized: Array<{ number: string; definitionId: string; certified: boolean }>
  unrecognized: Array<{ number: string; name: string }>
  unverifiedEffects: Array<{ number: string; unsupportedText: string[] }>
  dataConflicts: Array<{ number: string; fields: string[] }>
}

/** Maps local records to reviewed definitions by canonical card number; it never promotes a card or infers quantities. */
export function compareStarterDeckToEngine(deck: LocalStarterDeck, definitions: CardDefinition[]): StarterEngineCoverage {
  const byNumber = new Map(definitions.map(definition => [definition.number, definition]))
  const recognized: StarterEngineCoverage['recognized'] = [], unrecognized: StarterEngineCoverage['unrecognized'] = []
  const unverifiedEffects: StarterEngineCoverage['unverifiedEffects'] = [], dataConflicts: StarterEngineCoverage['dataConflicts'] = []
  const uniqueCards = new Map(deck.records.map(card => [card.number, card]))
  for (const [number, card] of uniqueCards) {
    const definition = byNumber.get(card.number)
    if (!definition) { unrecognized.push({ number: card.number, name: card.name }) }
    else {
      const fields: string[] = []
      if (definition.category !== card.category) fields.push('category')
      if (definition.cost !== card.cost) fields.push('cost')
      if (definition.power !== card.power) fields.push('power')
      if (definition.counter !== card.counter) fields.push('counter')
      if (JSON.stringify(definition.colors) !== JSON.stringify(card.colors)) fields.push('colors')
      const printings = deck.records.filter(candidate => candidate.number === number)
      if (printings.some(candidate => candidate.category !== card.category || candidate.cost !== card.cost || candidate.power !== card.power || candidate.counter !== card.counter || JSON.stringify(candidate.colors) !== JSON.stringify(card.colors))) fields.push('local_printing_conflict')
      if (fields.length) dataConflicts.push({ number: card.number, fields })
      recognized.push({ number: card.number, definitionId: definition.definitionId, certified: effectiveStatus(definition) === 'PLAYABLE_VERIFIED' })
    }
    const texts = deck.records.filter(candidate => candidate.number === number).flatMap(candidate => [candidate.effectText, candidate.triggerText]).filter(Boolean)
    if (texts.length && (!definition || effectiveStatus(definition) !== 'PLAYABLE_VERIFIED')) {
      unverifiedEffects.push({ number: card.number, unsupportedText: [...new Set(texts)] })
    }
  }
  return { printingRows: deck.records.length, cardTypes: deck.uniqueNumbers.length, leaderCount: deck.leaders.length, databaseCompositionStatus: 'NOT_ATTACHED',
    recognized, unrecognized, unverifiedEffects, dataConflicts }
}
