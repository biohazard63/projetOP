import { createGame } from '../../game/core/game'
import { validateEngineDeck, type DeckEntry } from '../../game/rulesets/decks'
import { PURPLE_DECK } from '../../game/cards/m3PurpleDeck'
import type { CardPrinting } from '../../game/cards/types'
import { STARTER_DECKS, type StarterDeck } from '../../game/cards/starterDecks'
import { effectiveStatus } from '../../game/cards/certification'
import { engineCatalog, currentEngineRegistry, engineRuleset, type CardBridge } from './catalog'

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
export type ReferenceDeck = { id: string; name: string; leader: string; description: string; entries: DeckEntry[] }
export const REFERENCE_DECKS: ReferenceDeck[] = [
  { id: 'reference-purple', name: 'Kaido — Animal Kingdom Pirates', leader: 'ST04-001', description: 'Deck violet de référence M3 : Personnages, Black Maria et Blast Breath.', entries: PURPLE_DECK },
  { id: 'reference-red', name: 'Luffy — Interséries', leader: 'ST01-001', description: 'Deck rouge de référence M3 : ST-01, OP-01, OP-06, Counters et Triggers.', entries: RED_M3_DECK },
  { id: 'reference-red-classic', name: 'Luffy — Équipage', leader: 'ST01-001', description: 'Deck rouge composé surtout de cartes certifiées en M4.', entries: RED_CERTIFIED_DECK },
  // M6: an official Starter Deck is offered only when every one of its cards is certified (computed, not declared).
  ...certifiedStarterDecks().map(d => ({ id: d.id, name: `Starter ${d.name}`, leader: d.leader, description: `Composition exacte du Starter Deck ${d.deckCode} : toutes ses cartes sont certifiées.`, entries: d.entries })),
]
function certifiedStarterDecks(): StarterDeck[] {
  const { definitions, printings } = engineCatalog()
  return STARTER_DECKS.filter(d => d.entries.every(e => { const p = printings.find(x => x.printingKey === e.printingKey); const def = p && definitions.find(x => x.definitionId === p.definitionId); return !!def && effectiveStatus(def) === 'PLAYABLE_VERIFIED' }))
}

export type DeckEligibility = { ok: boolean; errors: string[] }
/** Same checks as the real start: construction rules in playable mode, then createGame's effect checks. */
export function deckEligibility(entries: DeckEntry[], printings: CardPrinting[] = engineCatalog().printings): DeckEligibility {
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
