import type { Card } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Shared card catalogue, read once from the database and kept in memory: the catalogue is the same for every player and
// almost never changes, while each full read costs about 3 MB of database transfer. Per-player data (owned cards, Berries,
// decks) is never cached here. Any Prisma client or transaction shares one entry, read with the application client (a
// transaction must not hold the catalogue: it would be read again on every call); a test double gets its own entry.
// Refreshed after CATALOG_TTL, deduplicated while a read is in flight, dropped at once by `invalidateCatalog`.
export const CATALOG_TTL = 10 * 60_000
type Reader = { card: { findMany: () => Promise<Card[]> } }
type Entry = { at: number; cards: Promise<Card[]>; byId: Promise<Map<string, Card>> }
const entries = new Map<object, Entry>()

const SHARED = {}
function entry(given: Reader): Entry {
  const real = '$queryRaw' in given, key = real ? SHARED : given, db: Reader = real ? prisma : given
  const current = entries.get(key)
  if (current && Date.now() - current.at < CATALOG_TTL) return current
  const cards = db.card.findMany().then(rows => [...rows].sort((a, b) => a.id.localeCompare(b.id)))
  const fresh: Entry = { at: Date.now(), cards, byId: cards.then(rows => new Map(rows.map(card => [card.id, card]))) }
  entries.set(key, fresh)
  // A failed read is not kept: the next call reads again.
  cards.catch(() => { if (entries.get(key) === fresh) entries.delete(key) })
  fresh.byId.catch(() => {})
  return fresh
}
export const catalogCards = (db: Reader) => entry(db).cards
export const catalogById = (db: Reader) => entry(db).byId
export function invalidateCatalog() { entries.clear() }
