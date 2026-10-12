import { canonicalNumber, consolidateDefinitions } from '../../game/cards/adapter'
import { REVIEWED_CARDS } from '../../game/cards/reviewedCards'
import { M3_ABILITY_CARDS } from '../../game/cards/m3Abilities'
import { PURPLE_CARDS, M3_FULL_REGISTRY } from '../../game/cards/m3PurpleDeck'
import { effectiveStatus } from '../../game/cards/certification'
import { M3_RULESET } from '../../game/rulesets/m3'
import { M5_RULESET } from '../../game/rulesets/m5'
import { M5_CARDS } from '../../game/cards/m5Catalog'
import { validateRegistry, type EffectRegistry } from '../../game/effects/contracts'
import type { CardDefinition, CardInput, CardPrinting } from '../../game/cards/types'
import type { Ruleset } from '../../game/rulesets/decks'

// Engine catalogue = reviewed definitions only (M0 reviewed subset, M3 profiles, M3 purple deck). A Prisma
// card is playable only through a reviewed definition of the same number; the database never adds rules.
const reviewed: CardInput[] = Object.entries(REVIEWED_CARDS).map(([number, facts]) => ({ ...structuredClone(facts), number, printingKey: `${number}::standard`, extensions: [], databaseIds: [],
  life: facts.category === 'LEADER' ? 5 : null, lifeEvidence: facts.category === 'LEADER' ? [{ field: 'life' as const, value: 5, source: 'https://en.onepiece-cardgame.com/cardlist/?series=569001', checkedAt: '2026-10-10', language: 'en' as const }] : [] }))
function consolidated(cards: CardInput[]) {
  const catalog = consolidateDefinitions(cards)
  if (catalog.errors.length) throw new Error(`ENGINE_CATALOG:${catalog.errors.join(',')}`)
  return { definitions: catalog.definitions, printings: catalog.printings }
}
const m3Cards = () => [...reviewed, ...M3_ABILITY_CARDS.filter(card => !PURPLE_CARDS.some(p => p.number === card.number)), ...PURPLE_CARDS]
/** Frozen M3 catalogue (evidence and reproducible traces). */
export const m3EngineCatalog = (): { definitions: CardDefinition[]; printings: CardPrinting[] } => consolidated(m3Cards())
/** Catalogue used by /play: M3 plus the M5 recognised cards. */
export const engineCatalog = (): { definitions: CardDefinition[]; printings: CardPrinting[] } => consolidated([...m3Cards(), ...M5_CARDS])
export const engineRegistry = (): EffectRegistry => validateRegistry(structuredClone(M3_FULL_REGISTRY))
export const m3EngineRuleset = (): Ruleset => structuredClone(M3_RULESET)
export const engineRuleset = (): Ruleset => structuredClone(M5_RULESET)

export type PrismaCardRow = { id: string; code: string; name: string; type: string; color: string; cost: number | null; power: number | null; counter: string | null; imageUrl: string; isAltArt: boolean; isParallel: boolean; isSpecial: boolean }
export type CardDisplay = { definitionId: string; number: string; name: string; category: CardDefinition['category']; colors: string[]; cost: number | null; power: number | null; counter: number | null; life: number | null; text: string; trigger: string; imageUrl: string | null; certified: boolean }
export type CardConflict = { cardId: string; code: string; reasons: string[] }
export type CardBridge = { printings: CardPrinting[]; byCardId: Map<string, string>; conflicts: CardConflict[]; display: Record<string, CardDisplay> }

const category: Record<string, CardDefinition['category']> = { LEADER: 'LEADER', CHARACTER: 'CHARACTER', PERSONNAGE: 'CHARACTER', EVENT: 'EVENT', EVENEMENT: 'EVENT', EVENEMENTS: 'EVENT', STAGE: 'STAGE', LIEU: 'STAGE' }
const colour: Record<string, string> = { RED: 'RED', ROUGE: 'RED', GREEN: 'GREEN', VERT: 'GREEN', BLUE: 'BLUE', BLEU: 'BLUE', PURPLE: 'PURPLE', VIOLET: 'PURPLE', BLACK: 'BLACK', NOIR: 'BLACK', YELLOW: 'YELLOW', JAUNE: 'YELLOW' }
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()
const display = (d: CardDefinition, imageUrl: string | null): CardDisplay => ({ definitionId: d.definitionId, number: d.number, name: d.rulesName, category: d.category, colors: [...d.colors],
  cost: d.cost, power: d.power, counter: d.counter, life: d.life, text: d.review.effectOriginal, trigger: d.review.triggerOriginal, imageUrl, certified: effectiveStatus(d) === 'PLAYABLE_VERIFIED' })
export const officialImage = (number: string) => `https://en.onepiece-cardgame.com/images/cardlist/card/${number}.png`

/**
 * Maps Prisma Card rows onto engine printings. Standard rows map to `NUMBER::standard`; alternative arts get
 * `NUMBER::_pN` (same definition: art does not change rules). Any characteristic disagreeing with the
 * reviewed definition is reported as a conflict and the row stays unmapped: conflicts are never resolved silently.
 */
export function bridgeCards(rows: PrismaCardRow[], base = engineCatalog()): CardBridge {
  const printings = structuredClone(base.printings), byCardId = new Map<string, string>(), conflicts: CardConflict[] = [], images: Record<string, string> = {}
  const alternates = new Map<string, number>()
  for (const row of [...rows].sort((a, b) => a.id.localeCompare(b.id))) {
    const number = canonicalNumber(row.code.replace(/_p\d+$/i, ''))
    const definition = number ? base.definitions.find(d => d.number === number) : undefined
    if (!number || !definition) continue // not in the reviewed engine catalogue: simply not playable
    const reasons: string[] = []
    if (category[plain(row.type)] !== definition.category) reasons.push('CATEGORY')
    const colours = [...new Set(plain(row.color).split(/[\s/,]+/).filter(Boolean).map(c => colour[c]))].sort()
    if (JSON.stringify(colours) !== JSON.stringify(definition.colors)) reasons.push('COLOR')
    if (definition.category !== 'LEADER' && row.cost !== definition.cost) reasons.push('COST')
    if (row.power !== definition.power) reasons.push('POWER')
    const counter = row.counter === null || row.counter.trim() === '' || row.counter === '-' ? null : Number(row.counter.replace(/[^0-9]/g, ''))
    if (counter !== definition.counter) reasons.push('COUNTER')
    if (reasons.length) { conflicts.push({ cardId: row.id, code: row.code, reasons }); continue }
    let printingKey = `${number}::standard`
    if (row.isAltArt || row.isParallel || row.isSpecial) {
      const index = (alternates.get(number) ?? 0) + 1; alternates.set(number, index)
      printingKey = `${number}::_p${index}`
      printings.push({ printingKey, definitionId: definition.definitionId, databaseIds: [row.id], extensions: [] })
    } else {
      const printing = printings.find(p => p.printingKey === printingKey)!
      if (!printing.databaseIds.includes(row.id)) printing.databaseIds.push(row.id)
    }
    byCardId.set(row.id, printingKey); images[printingKey] = row.imageUrl
  }
  const out: Record<string, CardDisplay> = {}
  for (const p of printings) {
    const d = base.definitions.find(def => def.definitionId === p.definitionId)!
    out[p.printingKey] = display(d, images[p.printingKey] ?? (p.printingKey.endsWith('::standard') ? officialImage(d.number) : null))
  }
  return { printings, byCardId, conflicts, display: out }
}
