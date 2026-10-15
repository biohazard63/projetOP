import DISPLAY_FR from './display-fr.json'
import NAMES_FR from './starter-names-fr.json'
import compositions from './starter-compositions.json'
import type { DeckEntry } from '../rulesets/decks'

// M6 Starter Decks, built from the audited contents of scripts/rebuildStarterDecks.ts (explicit card numbers, printings
// and quantities; see scripts/game/extract-audited-starter-compositions.ts). Only decks whose composition is verified by
// scripts/starterAudit/product-evidence.json are listed. A product with several Leaders gives one playable deck per
// Leader: that Leader plus the same 50 main cards (the other Leaders are not deck cards). Being listed does not make a
// deck playable: /play offers only decks whose every card is certified.
/** language: 'fr' when an official French edition of the product exists (fr.onepiece-cardgame.com, from ST-15), else 'en'. */
export type StarterDeck = { id: string; deckCode: string; name: string; leader: string; language: 'fr' | 'en'; entries: DeckEntry[] }
export type StarterCompositionEntry = { name: string; number: string; printingCode: string; type: string; quantity: number }
export type StarterComposition = { deckCode: string; deckName: string; compositionVerified: boolean; reasons: string[]; leaders: string[]; mainCount: number; entries: StarterCompositionEntry[] }

export const STARTER_COMPOSITIONS = compositions.decks as StarterComposition[]

/** Playable deck lists of one audited product: one per Leader, each with the 50 main cards aggregated by card number. */
export function starterDecksOf(d: StarterComposition): StarterDeck[] {
  if (!d.compositionVerified || !d.leaders.length) return []
  const main = new Map<string, number>()
  for (const e of d.entries) if (e.type !== 'LEADER') main.set(e.number, (main.get(e.number) ?? 0) + e.quantity)
  const base = `starter-${d.deckCode.toLowerCase().replace('-', '')}`
  return d.leaders.map(leader => {
    const leaderName = (DISPLAY_FR as Record<string, { name: string }>)[leader]?.name ?? d.entries.find(e => e.number === leader)?.name ?? leader
    // Official French product name (fr.onepiece-cardgame.com, from ST-15) when one exists; otherwise the audited English one.
    const deckName = (NAMES_FR as Record<string, string>)[d.deckCode] ?? d.deckName
    return {
      id: d.leaders.length === 1 ? base : `${base}-${leader.toLowerCase()}`, deckCode: d.deckCode, leader, language: d.deckCode in NAMES_FR ? 'fr' as const : 'en' as const,
      name: d.leaders.length === 1 ? `${d.deckCode} ${deckName}` : `${d.deckCode} ${deckName} — Leader ${leaderName}`,
      entries: [{ printingKey: `${leader}::standard`, quantity: 1 }, ...[...main].map(([number, quantity]) => ({ printingKey: `${number}::standard`, quantity }))],
    }
  })
}
export const STARTER_DECKS: StarterDeck[] = STARTER_COMPOSITIONS.flatMap(starterDecksOf)
