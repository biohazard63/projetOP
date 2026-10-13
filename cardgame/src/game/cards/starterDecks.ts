import compositions from './starter-compositions.json'
import type { DeckEntry } from '../rulesets/decks'

// M6 Starter Decks, built from the read-only extraction of scripts/rebuildStarterDecks.ts (see
// scripts/game/extract-starter-compositions.ts). A deck is listed only if every entry resolved to one number, or belongs to
// an equal-quantity ambiguous group (below). Being listed does not make a deck playable: /play offers only decks whose
// every card is certified.
export type StarterDeck = { id: string; deckCode: string; name: string; leader: string; entries: DeckEntry[] }
type Entry = { name?: string; number: string | null; quantity: number; status?: string; candidates?: string[] }
type Composition = { deckCode: string; deckName: string; unresolved: number; leaders: string[]; entries: Entry[] }

/** Ambiguous names whose candidate set is shared by exactly as many names, all with the same quantity, and whose candidates
 * appear nowhere else in the list: each candidate then receives that quantity whatever the name mapping is (no mapping is
 * chosen). Returns null when any unresolved entry falls outside such a group. */
export function equalQuantityGroups(entries: Entry[]): Map<string, number> | null {
  const unresolved = entries.filter(e => !e.number)
  const resolvedNumbers = new Set(entries.filter(e => e.number).map(e => e.number!))
  const out = new Map<string, number>()
  const groups = new Map<string, Entry[]>()
  for (const e of unresolved) {
    if (e.status !== 'AMBIGUOUS' || !e.candidates?.length) return null
    const key = [...e.candidates].sort((a, b) => a.localeCompare(b)).join('|')
    groups.set(key, [...(groups.get(key) ?? []), e])
  }
  for (const [key, members] of groups) {
    const candidates = key.split('|')
    if (members.length !== candidates.length || new Set(members.map(m => m.quantity)).size !== 1 || candidates.some(c => resolvedNumbers.has(c))) return null
    for (const c of candidates) out.set(c, members[0].quantity)
  }
  return out
}
export const STARTER_DECKS: StarterDeck[] = (compositions.decks as Composition[])
  .filter(d => d.leaders.length === 1 && (d.unresolved === 0 || equalQuantityGroups(d.entries) !== null))
  .map(d => {
    const quantities = new Map<string, number>()
    for (const e of d.entries) if (e.number) quantities.set(e.number, (quantities.get(e.number) ?? 0) + e.quantity)
    for (const [number, quantity] of equalQuantityGroups(d.entries) ?? []) quantities.set(number, (quantities.get(number) ?? 0) + quantity)
    return { id: `starter-${d.deckCode.toLowerCase().replace('-', '')}`, deckCode: d.deckCode, name: `${d.deckCode} ${d.deckName}`, leader: d.leaders[0],
      entries: [...quantities].map(([number, quantity]) => ({ printingKey: `${number}::standard`, quantity })) }
  })
