import { createHash } from 'node:crypto'
import { createGame } from '../../game/core/game'
import { validateEngineDeck, type DeckEntry } from '../../game/rulesets/decks'
import { PURPLE_DECK } from '../../game/cards/m3PurpleDeck'
import type { CardPrinting } from '../../game/cards/types'
import { STARTER_DECKS, type StarterDeck } from '../../game/cards/starterDecks'
import { effectiveStatus } from '../../game/cards/certification'
import { engineCatalog, currentEngineRegistry, engineRuleset, type CardBridge } from './catalog'
import referenceEligibility from './reference-eligibility.json'

// Reference decks: legal decks whose every card has an executable reviewed definition (M3).
export const RED_M3_DECK: DeckEntry[] = [
  { printingKey: 'ST01-001::standard', quantity: 1 },
  ...['ST01-003', 'ST01-006', 'ST01-007', 'ST01-008', 'ST01-009', 'ST01-010', 'OP01-016', 'OP06-009', 'OP06-013', 'ST01-014', 'OP06-017', 'OP06-018'].map(number => ({ printingKey: `${number}::standard`, quantity: 4 })),
  { printingKey: 'P-016::standard', quantity: 2 },
]
export const RED_CERTIFIED_DECK: DeckEntry[] = [
  { printingKey: 'ST01-001::standard', quantity: 1 },
  ...['ST01-003', 'ST01-006', 'ST01-007', 'ST01-008', 'ST01-009', 'ST01-010', 'OP01-010', 'OP01-012', 'OP01-018', 'OP01-023', 'P-012', 'P-016'].map(number => ({ printingKey: `${number}::standard`, quantity: 4 })),
  { printingKey: 'ST01-014::standard', quantity: 2 },
]
export type ReferenceDeck = { id: string; name: string; leader: string; description: string; language?: 'fr' | 'en'; entries: DeckEntry[] }
export const REFERENCE_DECKS: ReferenceDeck[] = [
  { id: 'reference-purple', name: 'Kaido — Animal Kingdom Pirates', leader: 'ST04-001', description: 'Deck violet de référence M3 : Personnages, Black Maria et Blast Breath.', entries: PURPLE_DECK },
  { id: 'reference-red', name: 'Luffy — Interséries', leader: 'ST01-001', description: 'Deck rouge de référence M3 : ST-01, OP-01, OP-06, Counters et Triggers.', entries: RED_M3_DECK },
  { id: 'reference-red-classic', name: 'Luffy — Équipage', leader: 'ST01-001', description: 'Deck rouge composé surtout de cartes certifiées en M4.', entries: RED_CERTIFIED_DECK },
  // M6: an official Starter Deck is offered only when every one of its cards is certified (computed, not declared).
  ...certifiedStarterDecks().map(d => ({ id: d.id, name: `Starter ${d.name}`, leader: d.leader, description: `Composition exacte du Starter Deck ${d.deckCode} : toutes ses cartes sont certifiées.`, language: d.language, entries: d.entries })),
]
function certifiedStarterDecks(): StarterDeck[] {
  const { definitions, printings } = engineCatalog()
  return STARTER_DECKS.filter(d => d.entries.every(e => { const p = printings.find(x => x.printingKey === e.printingKey); const def = p && definitions.find(x => x.definitionId === p.definitionId); return !!def && effectiveStatus(def) === 'PLAYABLE_VERIFIED' }))
}

export type DeckEligibility = { ok: boolean; errors: string[] }
// The verdict only depends on the deck (printing keys, quantities, the definition behind each printing) and on the catalogue,
// ruleset and registry compiled into this build, so it is memoised per process: /api/play/decks otherwise built a full game
// for every reference and personal deck on every request (about 80 ms each), which timed out serverless functions.
const eligibilityCache = new Map<string, DeckEligibility>()
const ELIGIBILITY_CACHE_LIMIT = 1000
const eligibilityKey = (entries: DeckEntry[], printings: CardPrinting[]) => JSON.stringify(entries.map(e => [e.printingKey, e.quantity, printings.find(p => p.printingKey === e.printingKey)?.definitionId ?? null]))
let catalogHash: string | undefined
/** Everything a verdict depends on besides the deck: definitions, printings, ruleset and effect registry of this build. */
export function catalogFingerprint(): string {
  if (catalogHash) return catalogHash
  const { definitions, printings } = engineCatalog()
  return catalogHash = createHash('sha256').update(JSON.stringify({ definitions, printings, ruleset: engineRuleset(), registry: currentEngineRegistry() })).digest('hex')
}
export type EligibilityManifest = { fingerprint: string; decks: { id: string; key: string; ok: boolean; errors: string[] }[] }
/** Verdicts of the reference and Starter decks, computed by scripts/game/reference-eligibility.ts (a test keeps the file current). */
export function computeReferenceEligibility(): EligibilityManifest {
  const { printings } = engineCatalog()
  return { fingerprint: catalogFingerprint(), decks: REFERENCE_DECKS.map(d => ({ id: d.id, key: eligibilityKey(d.entries, printings), ...computeEligibility(d.entries, printings) })) }
}
// A cold serverless instance used to build one full game per offered deck (about 3 s for 42 decks). The archived verdicts are
// reused only when this build has exactly the catalogue they were computed on; otherwise every deck is checked as before.
// The real start still checks the chosen deck (GameService.start), so a verdict never bypasses the engine.
let manifestLoaded = false
function loadManifest() {
  manifestLoaded = true
  const manifest = referenceEligibility as EligibilityManifest
  if (manifest.fingerprint !== catalogFingerprint()) return
  for (const d of manifest.decks) if (!eligibilityCache.has(d.key)) eligibilityCache.set(d.key, { ok: d.ok, errors: [...d.errors] })
}
/** Same checks as the real start: construction rules in playable mode, then createGame's effect checks. */
export function deckEligibility(entries: DeckEntry[], printings: CardPrinting[] = engineCatalog().printings): DeckEligibility {
  if (!manifestLoaded) loadManifest()
  const key = eligibilityKey(entries, printings)
  const cached = eligibilityCache.get(key)
  if (cached) return { ok: cached.ok, errors: [...cached.errors] }
  const verdict = computeEligibility(entries, printings)
  if (eligibilityCache.size >= ELIGIBILITY_CACHE_LIMIT) eligibilityCache.delete(eligibilityCache.keys().next().value!)
  eligibilityCache.set(key, verdict)
  return { ok: verdict.ok, errors: [...verdict.errors] }
}
function computeEligibility(entries: DeckEntry[], printings: CardPrinting[]): DeckEligibility {
  const { definitions } = engineCatalog(), ruleset = engineRuleset()
  const errors = validateEngineDeck(entries, definitions, printings, ruleset, 'playable')
  if (errors.length) return { ok: false, errors }
  try {
    createGame({ gameId: 'eligibility', seed: 1, scope: 'BASIC_TURNS', chooserId: 'p1', definitions, printings, ruleset, effectRegistry: currentEngineRegistry(),
      players: [{ id: 'p1', cards: structuredClone(entries), donCount: 10 }, { id: 'p2', cards: structuredClone(REFERENCE_DECKS[0].entries), donCount: 10 }] })
    return { ok: true, errors: [] }
  } catch (e) {
    return { ok: false, errors: [e instanceof Error ? e.message : 'UNPLAYABLE_DECK'] }
  }
}
/** Converts stored deck rows (Prisma DeckCard) to engine entries through the card bridge. */
export function userDeckEntries(cards: { cardId: string; quantity: number }[], bridge: CardBridge): { entries: DeckEntry[]; errors: string[] } {
  const errors: string[] = [], counts = new Map<string, number>()
  for (const card of cards) {
    const printingKey = bridge.byCardId.get(card.cardId)
    if (!printingKey) { errors.push(bridge.conflicts.some(c => c.cardId === card.cardId) ? `CARD_DATA_CONFLICT:${card.cardId}` : `NOT_IN_ENGINE_CATALOG:${card.cardId}`); continue }
    counts.set(printingKey, (counts.get(printingKey) ?? 0) + card.quantity)
  }
  return { entries: [...counts].map(([printingKey, quantity]) => ({ printingKey, quantity })), errors }
}
