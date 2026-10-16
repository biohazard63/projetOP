import { canonicalNumber } from '../../game/cards/adapter'
import DISPLAY_FR from '../../game/cards/display-fr.json'
import { unofficialText } from '../cards/frenchText'
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
import { ST09_LOCAL_ABILITY_DEFINITIONS, ST09_LOCAL_CARDS, ST09_LOCAL_CONTINUOUS, ST09_KO_PROTECTIONS, ST09_CONDITIONAL_KEYWORDS, ST09_CARD_REPLACEMENTS } from '../../game/cards/m6LocalST09Cards'
import { ST11_LOCAL_ABILITY_DEFINITIONS, ST11_LOCAL_CARDS } from '../../game/cards/m6LocalST11Cards'
import { ST10_LOCAL_ABILITY_DEFINITIONS, ST10_LOCAL_CARDS, ST10_LOCAL_CONTINUOUS } from '../../game/cards/m6LocalST10Cards'
import { ST08_LOCAL_ABILITY_DEFINITIONS, ST08_LOCAL_CARDS, ST08_KO_PROTECTIONS } from '../../game/cards/m6LocalST08Cards'
import { ST03_OP_LOCAL_ABILITY_DEFINITIONS, ST03_OP_LOCAL_CARDS } from '../../game/cards/m6LocalST03OPCards'
import { REPRINT_LOCAL_ABILITY_DEFINITIONS, REPRINT_LOCAL_CARDS } from '../../game/cards/m6LocalReprintCards'
import { ST20_OFFICIAL_ABILITY_DEFINITIONS, ST20_OFFICIAL_CARDS, ST20_OFFICIAL_REPLACEMENTS } from '../../game/cards/m6OfficialST20Cards'
import { ST24_OFFICIAL_ABILITY_DEFINITIONS, ST24_OFFICIAL_CARDS, ST24_OFFICIAL_CONTINUOUS, ST24_OFFICIAL_KO_PROTECTIONS } from '../../game/cards/m6OfficialST24Cards'
import { ST27_OFFICIAL_ABILITY_DEFINITIONS, ST27_OFFICIAL_CARDS, ST27_OFFICIAL_CONDITIONAL_KEYWORDS, ST27_OFFICIAL_CONTINUOUS, ST27_OFFICIAL_KO_PROTECTIONS, ST27_OFFICIAL_LEADER_RULES } from '../../game/cards/m6OfficialST27Cards'
import { ST29_OFFICIAL_ABILITY_DEFINITIONS, ST29_OFFICIAL_CARDS, ST29_OFFICIAL_CONTINUOUS, ST29_OFFICIAL_REPLACEMENTS } from '../../game/cards/m6OfficialST29Cards'
import { ST22_OFFICIAL_ABILITY_DEFINITIONS, ST22_OFFICIAL_CARDS, ST22_OFFICIAL_REPLACEMENTS } from '../../game/cards/m6OfficialST22Cards'
import { ST30_OFFICIAL_ABILITY_DEFINITIONS, ST30_OFFICIAL_CARDS, ST30_OFFICIAL_CONTINUOUS, ST30_OFFICIAL_REPLACEMENTS } from '../../game/cards/m6OfficialST30Cards'
import { ST35_OFFICIAL_ABILITY_DEFINITIONS, ST35_OFFICIAL_CARDS, ST35_OFFICIAL_CONDITIONAL_KEYWORDS, ST35_OFFICIAL_CONTINUOUS, ST35_OFFICIAL_REPLACEMENTS } from '../../game/cards/m6OfficialST35Cards'
import { ST13_OFFICIAL_ABILITY_DEFINITIONS, ST13_OFFICIAL_CARDS, ST13_OFFICIAL_LIFE_RULES } from '../../game/cards/m6OfficialST13Cards'
import { ST32_OFFICIAL_ABILITY_DEFINITIONS, ST32_OFFICIAL_CARDS, ST32_OFFICIAL_CONDITIONAL_KEYWORDS, ST32_OFFICIAL_REPLACEMENTS } from '../../game/cards/m6OfficialST32Cards'
import { ST34_OFFICIAL_ABILITY_DEFINITIONS, ST34_OFFICIAL_CARDS, ST34_OFFICIAL_CONDITIONAL_KEYWORDS } from '../../game/cards/m6OfficialST34Cards'
import { ST33_OFFICIAL_ABILITY_DEFINITIONS, ST33_OFFICIAL_CARDS, ST33_OFFICIAL_CONTINUOUS } from '../../game/cards/m6OfficialST33Cards'
import { ST31_OFFICIAL_ABILITY_DEFINITIONS, ST31_OFFICIAL_CARDS, ST31_OFFICIAL_CONDITIONAL_KEYWORDS, ST31_OFFICIAL_CONTINUOUS } from '../../game/cards/m6OfficialST31Cards'
import { ST26_OFFICIAL_ABILITY_DEFINITIONS, ST26_OFFICIAL_CARDS, ST26_OFFICIAL_CONTINUOUS } from '../../game/cards/m6OfficialST26Cards'
import { ST16_OFFICIAL_ABILITY_DEFINITIONS, ST16_OFFICIAL_CARDS, ST16_OFFICIAL_CONTINUOUS } from '../../game/cards/m6OfficialST16Cards'
import { ST15_OFFICIAL_ABILITY_DEFINITIONS, ST15_OFFICIAL_CARDS, ST15_OFFICIAL_CONDITIONAL_KEYWORDS, ST15_OFFICIAL_CONTINUOUS, ST15_OFFICIAL_REPLACEMENTS } from '../../game/cards/m6OfficialST15Cards'
import { ST25_OFFICIAL_ABILITY_DEFINITIONS, ST25_OFFICIAL_CARDS, ST25_OFFICIAL_CONTINUOUS, ST25_OFFICIAL_CONDITIONAL_KEYWORDS, ST25_OFFICIAL_KO_PROTECTIONS, ST25_OFFICIAL_REPLACEMENTS, ST25_OFFICIAL_ATTACK_PROHIBITIONS } from '../../game/cards/m6OfficialST25Cards'
import { ST28_OFFICIAL_ABILITY_DEFINITIONS, ST28_OFFICIAL_CARDS, ST28_OFFICIAL_CONTINUOUS, ST28_OFFICIAL_CONDITIONAL_KEYWORDS, ST28_OFFICIAL_KO_PROTECTIONS } from '../../game/cards/m6OfficialST28Cards'
import { ST23_OFFICIAL_ABILITY_DEFINITIONS, ST23_OFFICIAL_CARDS, ST23_OFFICIAL_CONTINUOUS, ST23_OFFICIAL_REPLACEMENTS } from '../../game/cards/m6OfficialST23Cards'
import { ST21_OFFICIAL_ABILITY_DEFINITIONS, ST21_OFFICIAL_CARDS, ST21_OFFICIAL_CONTINUOUS, ST21_OFFICIAL_CONDITIONAL_KEYWORDS } from '../../game/cards/m6OfficialST21Cards'
import { ST19_OFFICIAL_ABILITY_DEFINITIONS, ST19_OFFICIAL_CARDS, ST19_OFFICIAL_CONTINUOUS, ST19_OFFICIAL_KO_PROTECTIONS } from '../../game/cards/m6OfficialST19Cards'
import { ST18_OFFICIAL_ABILITY_DEFINITIONS, ST18_OFFICIAL_CARDS, ST18_OFFICIAL_CONTINUOUS, ST18_OFFICIAL_CONDITIONAL_KEYWORDS } from '../../game/cards/m6OfficialST18Cards'
import { ST17_OFFICIAL_ABILITY_DEFINITIONS, ST17_OFFICIAL_CARDS } from '../../game/cards/m6OfficialST17Cards'
import { ST14_LOCAL_ABILITY_DEFINITIONS, ST14_LOCAL_CARDS, ST14_LOCAL_CONTINUOUS, ST14_KO_PROTECTIONS, ST14_CONDITIONAL_KEYWORDS } from '../../game/cards/m6LocalST14Cards'
import { validateRegistry, type EffectRegistry } from '../../game/effects/contracts'
import { COMPILED_LABELS, compiledPack } from '../../game/cards/compiledCards'
import type { CompiledCard } from '../../game/cards/textCompiler'
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
let compiledCardList: CompiledCard[] = []
/** M7: the cards of the catalogue compiled from their official text (textCompiler.ts), with the templates they use. */
export const compiledCards = (): readonly CompiledCard[] => { compileCurrentCatalog(); return compiledCardList }
const currentPacks = () => {
  const manual = manualPacks(), defined = new Set(manual.flatMap(p => p.cards.map(c => c.number)))
  // M7: cards compiled from their official text, never overriding a hand-written definition (packs/certification decide play).
  const packs = COMPILED_LABELS.map(label => { const p = compiledPack(label, defined); for (const c of p.cards) defined.add(c.number); return p }).filter(p => p.cards.length)
  compiledCardList = packs.flatMap(p => p.compiled)
  const compiled = packs.map(p => ({ packId: `M7_COMPILED_${p.label.replace(/-/g, '')}`, schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: p.cards,
    effects: { definitions: p.definitions, continuous: p.continuous, conditionalKeywords: p.conditionalKeywords, attackProhibitions: p.attackProhibitions } }))
  return [...manual, ...compiled]
}
const manualPacks = () => [
  { packId: 'M3_REVIEWED_BASE', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: m3Cards() },
  { packId: 'M5_RECOGNIZED_CARDS', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: M5_CARDS },
  { packId: 'M6_LOCAL_ST01', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST01_LOCAL_CARDS, effects: { definitions: ST01_LOCAL_ABILITY_DEFINITIONS, continuous: ST01_LOCAL_CONTINUOUS, conditionalKeywords: ST01_LOCAL_CONDITIONAL_KEYWORDS } },
  { packId: 'M6_LOCAL_ST02', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST02_LOCAL_CARDS, effects: { definitions: ST02_LOCAL_ABILITY_DEFINITIONS, continuous: ST02_LOCAL_CONTINUOUS } },
  { packId: 'M6_LOCAL_ST03_ST04', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST03_ST04_LOCAL_CARDS, effects: { definitions: ST03_ST04_LOCAL_ABILITY_DEFINITIONS } },
  { packId: 'M6_LOCAL_ST05_ST06', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST05_ST06_LOCAL_CARDS, effects: { definitions: ST05_ST06_LOCAL_ABILITY_DEFINITIONS, koProtections: ST05_ST06_KO_PROTECTIONS, conditionalKeywords: ST05_ST06_CONDITIONAL_KEYWORDS } },
  { packId: 'M6_LOCAL_ST07', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST07_LOCAL_CARDS, effects: { definitions: ST07_LOCAL_ABILITY_DEFINITIONS } },
  { packId: 'M6_LOCAL_ST08', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST08_LOCAL_CARDS, effects: { definitions: ST08_LOCAL_ABILITY_DEFINITIONS, koProtections: ST08_KO_PROTECTIONS } },
  { packId: 'M6_LOCAL_ST09', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST09_LOCAL_CARDS, effects: { definitions: ST09_LOCAL_ABILITY_DEFINITIONS, continuous: ST09_LOCAL_CONTINUOUS, koProtections: ST09_KO_PROTECTIONS, conditionalKeywords: ST09_CONDITIONAL_KEYWORDS, cardReplacements: ST09_CARD_REPLACEMENTS } },
  { packId: 'M6_LOCAL_ST10', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST10_LOCAL_CARDS, effects: { definitions: ST10_LOCAL_ABILITY_DEFINITIONS, continuous: ST10_LOCAL_CONTINUOUS } },
  { packId: 'M6_LOCAL_ST11', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST11_LOCAL_CARDS, effects: { definitions: ST11_LOCAL_ABILITY_DEFINITIONS } },
  { packId: 'M6_LOCAL_ST12', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST12_LOCAL_CARDS, effects: { definitions: ST12_LOCAL_ABILITY_DEFINITIONS } },
  { packId: 'M6_LOCAL_ST03_OP', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST03_OP_LOCAL_CARDS, effects: { definitions: ST03_OP_LOCAL_ABILITY_DEFINITIONS } },
  { packId: 'M6_LOCAL_REPRINTS', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: REPRINT_LOCAL_CARDS, effects: { definitions: REPRINT_LOCAL_ABILITY_DEFINITIONS } },
  { packId: 'M6_LOCAL_ST14', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST14_LOCAL_CARDS, effects: { definitions: ST14_LOCAL_ABILITY_DEFINITIONS, continuous: ST14_LOCAL_CONTINUOUS, koProtections: ST14_KO_PROTECTIONS, conditionalKeywords: ST14_CONDITIONAL_KEYWORDS } },
  { packId: 'M6_OFFICIAL_ST17', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST17_OFFICIAL_CARDS, effects: { definitions: ST17_OFFICIAL_ABILITY_DEFINITIONS } },
  { packId: 'M6_OFFICIAL_ST18', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST18_OFFICIAL_CARDS, effects: { definitions: ST18_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST18_OFFICIAL_CONTINUOUS, conditionalKeywords: ST18_OFFICIAL_CONDITIONAL_KEYWORDS } },
  { packId: 'M6_OFFICIAL_ST19', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST19_OFFICIAL_CARDS, effects: { definitions: ST19_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST19_OFFICIAL_CONTINUOUS, koProtections: ST19_OFFICIAL_KO_PROTECTIONS } },
  { packId: 'M6_OFFICIAL_ST21', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST21_OFFICIAL_CARDS, effects: { definitions: ST21_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST21_OFFICIAL_CONTINUOUS, conditionalKeywords: ST21_OFFICIAL_CONDITIONAL_KEYWORDS } },
  { packId: 'M6_OFFICIAL_ST23', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST23_OFFICIAL_CARDS, effects: { definitions: ST23_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST23_OFFICIAL_CONTINUOUS, cardReplacements: ST23_OFFICIAL_REPLACEMENTS } },
  { packId: 'M6_OFFICIAL_ST28', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST28_OFFICIAL_CARDS, effects: { definitions: ST28_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST28_OFFICIAL_CONTINUOUS, conditionalKeywords: ST28_OFFICIAL_CONDITIONAL_KEYWORDS, koProtections: ST28_OFFICIAL_KO_PROTECTIONS } },
  { packId: 'M6_OFFICIAL_ST25', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST25_OFFICIAL_CARDS, effects: { definitions: ST25_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST25_OFFICIAL_CONTINUOUS, conditionalKeywords: ST25_OFFICIAL_CONDITIONAL_KEYWORDS, koProtections: ST25_OFFICIAL_KO_PROTECTIONS, cardReplacements: ST25_OFFICIAL_REPLACEMENTS, attackProhibitions: ST25_OFFICIAL_ATTACK_PROHIBITIONS } },
  { packId: 'M6_OFFICIAL_ST20', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST20_OFFICIAL_CARDS, effects: { definitions: ST20_OFFICIAL_ABILITY_DEFINITIONS, cardReplacements: ST20_OFFICIAL_REPLACEMENTS } },
  { packId: 'M6_OFFICIAL_ST15', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST15_OFFICIAL_CARDS, effects: { definitions: ST15_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST15_OFFICIAL_CONTINUOUS, conditionalKeywords: ST15_OFFICIAL_CONDITIONAL_KEYWORDS, cardReplacements: ST15_OFFICIAL_REPLACEMENTS } },
  { packId: 'M6_OFFICIAL_ST16', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST16_OFFICIAL_CARDS, effects: { definitions: ST16_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST16_OFFICIAL_CONTINUOUS } },
  { packId: 'M6_OFFICIAL_ST26', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST26_OFFICIAL_CARDS, effects: { definitions: ST26_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST26_OFFICIAL_CONTINUOUS } },
  { packId: 'M6_OFFICIAL_ST31', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST31_OFFICIAL_CARDS, effects: { definitions: ST31_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST31_OFFICIAL_CONTINUOUS, conditionalKeywords: ST31_OFFICIAL_CONDITIONAL_KEYWORDS } },
  { packId: 'M6_OFFICIAL_ST33', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST33_OFFICIAL_CARDS, effects: { definitions: ST33_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST33_OFFICIAL_CONTINUOUS } },
  { packId: 'M6_OFFICIAL_ST34', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST34_OFFICIAL_CARDS, effects: { definitions: ST34_OFFICIAL_ABILITY_DEFINITIONS, conditionalKeywords: ST34_OFFICIAL_CONDITIONAL_KEYWORDS } },
  { packId: 'M6_OFFICIAL_ST32', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST32_OFFICIAL_CARDS, effects: { definitions: ST32_OFFICIAL_ABILITY_DEFINITIONS, conditionalKeywords: ST32_OFFICIAL_CONDITIONAL_KEYWORDS, cardReplacements: ST32_OFFICIAL_REPLACEMENTS } },
  { packId: 'M6_OFFICIAL_ST13', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST13_OFFICIAL_CARDS, effects: { definitions: ST13_OFFICIAL_ABILITY_DEFINITIONS, lifeRules: ST13_OFFICIAL_LIFE_RULES } },
  { packId: 'M6_OFFICIAL_ST35', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST35_OFFICIAL_CARDS, effects: { definitions: ST35_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST35_OFFICIAL_CONTINUOUS, conditionalKeywords: ST35_OFFICIAL_CONDITIONAL_KEYWORDS, cardReplacements: ST35_OFFICIAL_REPLACEMENTS } },
  { packId: 'M6_OFFICIAL_ST30', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST30_OFFICIAL_CARDS, effects: { definitions: ST30_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST30_OFFICIAL_CONTINUOUS, cardReplacements: ST30_OFFICIAL_REPLACEMENTS } },
  { packId: 'M6_OFFICIAL_ST22', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST22_OFFICIAL_CARDS, effects: { definitions: ST22_OFFICIAL_ABILITY_DEFINITIONS, cardReplacements: ST22_OFFICIAL_REPLACEMENTS } },
  { packId: 'M6_OFFICIAL_ST29', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST29_OFFICIAL_CARDS, effects: { definitions: ST29_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST29_OFFICIAL_CONTINUOUS, cardReplacements: ST29_OFFICIAL_REPLACEMENTS } },
  { packId: 'M6_OFFICIAL_ST27', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST27_OFFICIAL_CARDS, effects: { definitions: ST27_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST27_OFFICIAL_CONTINUOUS, conditionalKeywords: ST27_OFFICIAL_CONDITIONAL_KEYWORDS, koProtections: ST27_OFFICIAL_KO_PROTECTIONS, lifeRules: ST27_OFFICIAL_LEADER_RULES } },
  { packId: 'M6_OFFICIAL_ST24', schemaVersion: 1 as const, rulesVersion: '1.2.1' as const, cards: ST24_OFFICIAL_CARDS, effects: { definitions: ST24_OFFICIAL_ABILITY_DEFINITIONS, continuous: ST24_OFFICIAL_CONTINUOUS, koProtections: ST24_OFFICIAL_KO_PROTECTIONS } },
]
// The packs are static data compiled into the build: compile them once per process (every /play request used to recompile
// 550+ definitions, ~16 ms each time). The result is deep-frozen so that no caller can alter the shared catalogue;
// createGame clones what it stores in a game state.
const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const v of Object.values(value as object)) deepFreeze(v) }
  return value
}
let compiledCatalog: ReturnType<typeof loadCardPacks> | null = null
const compileCurrentCatalog = () => compiledCatalog ??= deepFreeze(loadCardPacks(M3_FULL_REGISTRY, currentPacks()))
/** Catalogue used by /play: M3 plus the M5 recognised cards. */
export const engineCatalog = (): { definitions: CardDefinition[]; printings: CardPrinting[] } => {
  const compiled = compileCurrentCatalog()
  return { definitions: compiled.definitions, printings: compiled.printings }
}
/** Historical M3 registry, kept paired with m3EngineCatalog for saved fixtures and M3 verification. */
export const engineRegistry = (): EffectRegistry => validateRegistry(structuredClone(M3_FULL_REGISTRY))
/** Registry paired with engineCatalog and used by the current server catalogue. */
export const currentEngineRegistry = (): EffectRegistry => compileCurrentCatalog().registry

/**
 * The catalogue and effect registry a game actually needs: the definitions printed in its decks and their effect programs.
 * A stored game used to carry the whole catalogue (775 definitions) and registry (534 programs), about 1.6 MB read, copied and
 * written on every command. Entries without a card definition are kept. Nothing is added, so an unknown card is still refused.
 */
export function scopedToDecks(decks: { printingKey: string }[][], printings: CardPrinting[], definitions: CardDefinition[], registry: EffectRegistry) {
  const keys = new Set(decks.flat().map(e => e.printingKey))
  const usedPrintings = printings.filter(p => keys.has(p.printingKey))
  const ids = new Set(usedPrintings.map(p => p.definitionId))
  const keep = (item: unknown) => {
    const o = item as { definitionId?: string; source?: { definitionId?: string } }
    const id = o.definitionId ?? o.source?.definitionId
    return id === undefined || ids.has(id)
  }
  const scoped = { ...registry } as Record<string, unknown>
  for (const [k, v] of Object.entries(registry)) if (Array.isArray(v)) scoped[k] = v.filter(keep)
  return { definitions: definitions.filter(d => ids.has(d.definitionId)), printings: usedPrintings, registry: scoped as EffectRegistry }
}
export const m3EngineRuleset = (): Ruleset => structuredClone(M3_RULESET)
/** Ruleset of new /play games: the permanent free format. Existing games keep the ruleset stored in their state. */
export const engineRuleset = (): Ruleset => structuredClone(FREE_RULESET)
/** Official reviewed subset (restriction snapshot of 2026-10-12), kept for a future distinct official format. */
export const officialSubsetRuleset = (): Ruleset => structuredClone(M5_RULESET)

export type PrismaCardRow = { id: string; code: string; name: string; type: string; color: string; cost: number | null; power: number | null; counter: string | null; imageUrl: string; isAltArt: boolean; isParallel: boolean; isSpecial: boolean }
export type CardDisplay = { definitionId: string; number: string; name: string; category: CardDefinition['category']; colors: string[]; cost: number | null; power: number | null; counter: number | null; life: number | null; text: string; trigger: string; imageUrl: string | null; certified: boolean
  /** 'fr' when the name and texts come from an official French printing (display only; rules use the reviewed English text). */
  language: 'fr' | 'en'
  /** Present when the texts are an unofficial French translation of the English text (display only, as above). */
  translation?: 'unofficial'
  /** The English texts behind an unofficial translation, shown on demand (« VO »). */
  original?: { text: string; trigger: string } }
export type CardConflict = { cardId: string; code: string; reasons: string[] }
export type CardBridge = { printings: CardPrinting[]; byCardId: Map<string, string>; conflicts: CardConflict[]; display: Record<string, CardDisplay> }

const category: Record<string, CardDefinition['category']> = { LEADER: 'LEADER', CHARACTER: 'CHARACTER', PERSONNAGE: 'CHARACTER', EVENT: 'EVENT', EVENEMENT: 'EVENT', EVENEMENTS: 'EVENT', STAGE: 'STAGE', LIEU: 'STAGE' }
const colour: Record<string, string> = { RED: 'RED', ROUGE: 'RED', GREEN: 'GREEN', VERT: 'GREEN', BLUE: 'BLUE', BLEU: 'BLUE', PURPLE: 'PURPLE', VIOLET: 'PURPLE', BLACK: 'BLACK', NOIR: 'BLACK', YELLOW: 'YELLOW', JAUNE: 'YELLOW' }
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()
// French display (scripts/game/build-display-fr.ts): name, texts and image of the official French printing when one exists. A
// text block is taken in French only when it exists in both languages, so that no ability is hidden or invented by the swap.
const FR = DISPLAY_FR as Record<string, { name: string; text: string; trigger: string; image: string | null }>
export const cardDisplay = (d: CardDefinition, imageUrl: string | null): CardDisplay => {
  const fr = FR[d.number], text = d.review.effectOriginal, trigger = d.review.triggerOriginal
  // Without an official French printing, an unofficial translation of exactly this English text (scripts/cards).
  const unofficial = fr ? null : unofficialText(d.number, text, trigger)
  if (unofficial) return { definitionId: d.definitionId, number: d.number, name: d.rulesName, category: d.category, colors: [...d.colors],
    cost: d.cost, power: d.power, counter: d.counter, life: d.life, text: unofficial.effect ?? '', trigger: unofficial.trigger ?? '',
    imageUrl, certified: effectiveStatus(d) === 'PLAYABLE_VERIFIED', language: 'en', translation: 'unofficial', original: { text, trigger } }
  return { definitionId: d.definitionId, number: d.number, name: fr?.name || d.rulesName, category: d.category, colors: [...d.colors],
    cost: d.cost, power: d.power, counter: d.counter, life: d.life,
    text: fr && !!fr.text === !!text.trim() ? fr.text : text, trigger: fr && !!fr.trigger === !!trigger.trim() ? fr.trigger : trigger,
    imageUrl, certified: effectiveStatus(d) === 'PLAYABLE_VERIFIED', language: fr ? 'fr' : 'en' }
}
/** French image of the standard printing when an official French printing exists. */
export const frenchImage = (number: string): string | null => FR[number]?.image ?? null
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
    // Standard printing: the French image first (VF as soon as it exists), then the collection row image, then the English one.
    out[p.printingKey] = cardDisplay(d, p.printingKey.endsWith('::standard') ? (frenchImage(d.number) ?? images[p.printingKey] ?? officialImage(d.number)) : images[p.printingKey] ?? null)
  }
  return { printings, byCardId, conflicts, display: out }
}
