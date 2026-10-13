import { canonicalNumber } from '../../game/cards/adapter'
import { REVIEWED_CARDS } from '../../game/cards/reviewedCards'
import { M3_ABILITY_CARDS } from '../../game/cards/m3Abilities'
import { PURPLE_CARDS, M3_FULL_REGISTRY } from '../../game/cards/m3PurpleDeck'
import { effectiveStatus } from '../../game/cards/certification'
import { M3_RULESET } from '../../game/rulesets/m3'
import { M5_RULESET } from '../../game/rulesets/m5'
import { FREE_RULESET } from '../../game/rulesets/free'
import { M5_CARDS } from '../../game/cards/m5Catalog'
import { loadCardPacks } from '../../game/cards/packs'
import { ST01_LOCAL_ABILITY_DEFINITIONS, ST01_LOCAL_CARDS, ST01_LOCAL_CONTINUOUS, ST01_LOCAL_CONDITIONAL_KEYWORDS } from '../../game/cards/m6LocalStarterCards'
import { ST02_LOCAL_ABILITY_DEFINITIONS, ST02_LOCAL_CARDS, ST02_LOCAL_CONTINUOUS } from '../../game/cards/m6LocalST02Cards'
import { ST03_ST04_LOCAL_ABILITY_DEFINITIONS, ST03_ST04_LOCAL_CARDS } from '../../game/cards/m6LocalST03ST04Cards'
import { ST05_ST06_LOCAL_ABILITY_DEFINITIONS, ST05_ST06_LOCAL_CARDS, ST05_ST06_KO_PROTECTIONS, ST05_ST06_CONDITIONAL_KEYWORDS } from '../../game/cards/m6LocalST05ST06Cards'
import { ST07_LOCAL_ABILITY_DEFINITIONS, ST07_LOCAL_CARDS } from '../../game/cards/m6LocalST07Cards'
import { ST12_LOCAL_ABILITY_DEFINITIONS, ST12_LOCAL_CARDS } from '../../game/cards/m6LocalST12Cards'
import { ST09_LOCAL_ABILITY_DEFINITIONS, ST09_LOCAL_CARDS, ST09_LOCAL_CONTINUOUS, ST09_KO_PROTECTIONS, ST09_CONDITIONAL_KEYWORDS } from '../../game/cards/m6LocalST09Cards'
import { ST11_LOCAL_ABILITY_DEFINITIONS, ST11_LOCAL_CARDS } from '../../game/cards/m6LocalST11Cards'
import { ST10_LOCAL_ABILITY_DEFINITIONS, ST10_LOCAL_CARDS, ST10_LOCAL_CONTINUOUS } from '../../game/cards/m6LocalST10Cards'
import { ST08_LOCAL_ABILITY_DEFINITIONS, ST08_LOCAL_CARDS, ST08_KO_PROTECTIONS } from '../../game/cards/m6LocalST08Cards'
import { ST03_OP_LOCAL_ABILITY_DEFINITIONS, ST03_OP_LOCAL_CARDS } from '../../game/cards/m6LocalST03OPCards'
import { validateRegistry, type EffectRegistry } from '../../game/effects/contracts'
import type { CardDefinition, CardInput, CardPrinting } from '../../game/cards/types'
import type { Ruleset } from '../../game/rulesets/decks'

// Engine catalogue = reviewed definitions only (M0 reviewed subset, M3 profiles, M3 purple deck). A Prisma
// card is playable only through a reviewed definition of the same number; the database never adds rules.
const reviewed: CardInput[] = Object.entries(REVIEWED_CARDS).map(([number, facts]) => ({ ...structuredClone(facts), number, printingKey: `${number}::standard`, extensions: [], databaseIds: [],
  life: facts.category === 'LEADER' ? 5 : null, lifeEvidence: facts.category === 'LEADER' ? [{ field: 'life' as const, value: 5, source: 'https://en.onepiece-cardgame.com/cardlist/?series=569001', checkedAt: '2026-10-10', language: 'en' as const }] : [] }))
const m3Cards = () => [...reviewed, ...M3_ABILITY_CARDS.filter(card => !PURPLE_CARDS.some(p => p.number === card.number)), ...PURPLE_CARDS]
/** Frozen M3 catalogue (evidence and reproducible traces). */
export const m3EngineCatalog = (): { definitions: CardDefinition[]; printings: CardPrinting[] } => {
  const compiled = loadCardPacks(M3_FULL_REGISTRY, [{ packId: 'M3_REVIEWED_BASE', schemaVersion: 1, rulesVersion: '1.2.1', cards: m3Cards() }])
  return { definitions: compiled.definitions, printings: compiled.printings }
}
const currentPacks = () => [
  { packId: 'M3_REVIEWED_BASE', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: m3Cards() },
  { packId: 'M5_RECOGNIZED_CARDS', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: M5_CARDS },
  { packId: 'M6_LOCAL_ST01', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST01_LOCAL_CARDS, effects: { definitions: ST01_LOCAL_ABILITY_DEFINITIONS, continuous: ST01_LOCAL_CONTINUOUS, conditionalKeywords: ST01_LOCAL_CONDITIONAL_KEYWORDS } },
  { packId: 'M6_LOCAL_ST02', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST02_LOCAL_CARDS, effects: { definitions: ST02_LOCAL_ABILITY_DEFINITIONS, continuous: ST02_LOCAL_CONTINUOUS } },
  { packId: 'M6_LOCAL_ST03_ST04', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST03_ST04_LOCAL_CARDS, effects: { definitions: ST03_ST04_LOCAL_ABILITY_DEFINITIONS } },
  { packId: 'M6_LOCAL_ST05_ST06', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST05_ST06_LOCAL_CARDS, effects: { definitions: ST05_ST06_LOCAL_ABILITY_DEFINITIONS, koProtections: ST05_ST06_KO_PROTECTIONS, conditionalKeywords: ST05_ST06_CONDITIONAL_KEYWORDS } },
  { packId: 'M6_LOCAL_ST07', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST07_LOCAL_CARDS, effects: { definitions: ST07_LOCAL_ABILITY_DEFINITIONS } },
  { packId: 'M6_LOCAL_ST08', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST08_LOCAL_CARDS, effects: { definitions: ST08_LOCAL_ABILITY_DEFINITIONS, koProtections: ST08_KO_PROTECTIONS } },
  { packId: 'M6_LOCAL_ST09', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST09_LOCAL_CARDS, effects: { definitions: ST09_LOCAL_ABILITY_DEFINITIONS, continuous: ST09_LOCAL_CONTINUOUS, koProtections: ST09_KO_PROTECTIONS, conditionalKeywords: ST09_CONDITIONAL_KEYWORDS } },
  { packId: 'M6_LOCAL_ST10', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST10_LOCAL_CARDS, effects: { definitions: ST10_LOCAL_ABILITY_DEFINITIONS, continuous: ST10_LOCAL_CONTINUOUS } },
  { packId: 'M6_LOCAL_ST11', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST11_LOCAL_CARDS, effects: { definitions: ST11_LOCAL_ABILITY_DEFINITIONS } },
  { packId: 'M6_LOCAL_ST12', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST12_LOCAL_CARDS, effects: { definitions: ST12_LOCAL_ABILITY_DEFINITIONS } },
  { packId: 'M6_LOCAL_ST03_OP', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST03_OP_LOCAL_CARDS, effects: { definitions: ST03_OP_LOCAL_ABILITY_DEFINITIONS } },
]
const compileCurrentCatalog = () => loadCardPacks(M3_FULL_REGISTRY, currentPacks())
/** Catalogue used by /play: M3 plus the M5 recognised cards. */
export const engineCatalog = (): { definitions: CardDefinition[]; printings: CardPrinting[] } => {
  const compiled = compileCurrentCatalog()
  return { definitions: compiled.definitions, printings: compiled.printings }
}
/** Historical M3 registry, kept paired with m3EngineCatalog for saved fixtures and M3 verification. */
export const engineRegistry = (): EffectRegistry => validateRegistry(structuredClone(M3_FULL_REGISTRY))
/** Registry paired with engineCatalog and used by the current server catalogue. */
export const currentEngineRegistry = (): EffectRegistry => compileCurrentCatalog().registry
export const m3EngineRuleset = (): Ruleset => structuredClone(M3_RULESET)
/** Ruleset of new /play games: the permanent free format. Existing games keep the ruleset stored in their state. */
export const engineRuleset = (): Ruleset => structuredClone(FREE_RULESET)
/** Official reviewed subset (restriction snapshot of 2026-10-12), kept for a future distinct official format. */
export const officialSubsetRuleset = (): Ruleset => structuredClone(M5_RULESET)

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
    // A Leader stores its Life in `cost` (catalogue convention, M6). NULL or 0 is legacy "not set" data (rows created
    // before the sync script); any other value must equal the reviewed Life.
    if (definition.category === 'LEADER' && row.cost !== null && row.cost !== 0 && row.cost !== definition.life) reasons.push('LIFE')
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
