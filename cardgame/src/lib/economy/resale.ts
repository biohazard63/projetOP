import type { Prisma, PrismaClient } from '@prisma/client'
import { currentEconomy } from './settings'
import { BerryError, inPlayerTransaction, post } from './ledger'
import manga from '@/lib/boosters/manga-rares.json'
import prb01 from '@/lib/boosters/product-lists/PRB-01.json'
import tierManifest from '@/lib/boosters/booster-tiers.json'
import { CHASE_TIERS } from '@/lib/boosters/tiers'
import { normalizeRarity } from '@/lib/boosters/rules'

type DB = Prisma.TransactionClient
const mangaTier = new Map((manga.status === 'validated' ? manga.cards : []).map(c => [(c as { id?: string }).id ?? c.key.replace('::', '_'), c.key.endsWith('::_p3') ? 'MANGA RED' : 'MANGA']))
// The collector tier each print is drawn under (one identifier per print: added prints have their own).
const chase = new Set<string>(CHASE_TIERS)
const drawnTier = new Map(Object.values(tierManifest.sets as Record<string, Record<string, string[]>>).flatMap(tiers => Object.entries(tiers).filter(([tier]) => chase.has(tier)).flatMap(([tier, ids]) => ids.map(id => [id, tier] as const))))
const prbStandard = new Set(prb01.status === 'validated' ? prb01.cards.filter(c => c.tier === 'STD').map(c => c.id) : [])

/** Resale tier of a card: the collector tier it is drawn under (then the manga list), else its printed rarity, any other alternate illustration being an ALT. */
export function resaleTier(card: { id: string; rarity: string; isAltArt: boolean; isParallel: boolean }) {
  const listed = drawnTier.get(card.id) ?? mangaTier.get(card.id)
  if (listed) return listed
  if (prbStandard.has(card.id)) return normalizeRarity(card.rarity)
  const rarity = normalizeRarity(card.rarity)
  if (rarity === 'SP CARD' || rarity === 'TR') return rarity
  if (card.isAltArt || card.isParallel || /_p\d+$/i.test(card.id)) return rarity === 'L' ? 'LEADER ALT' : 'ALT'
  return rarity
}

/**
 * Copies above what the player keeps: `keepCopies` of each card, or more when one of their decks uses more.
 * Unknown rarities (promos, DON) are never sold.
 */
async function surplus(tx: DB | PrismaClient, userId: string) {
  const economy = await currentEconomy(tx)
  const [owned, deckCards] = await Promise.all([
    tx.userCard.findMany({ where: { userId, quantity: { gt: economy.resale.keepCopies } }, select: { cardId: true, quantity: true, card: { select: { id: true, name: true, code: true, imageUrl: true, rarity: true, isAltArt: true, isParallel: true } } } }),
    tx.deckCard.findMany({ where: { deckVersion: { deck: { userId } } }, select: { cardId: true, quantity: true } }),
  ])
  const inDecks = new Map<string, number>()
  for (const d of deckCards) inDecks.set(d.cardId, Math.max(inDecks.get(d.cardId) ?? 0, d.quantity))
  return owned.flatMap(row => {
    const keep = Math.max(economy.resale.keepCopies, inDecks.get(row.cardId) ?? 0), extra = row.quantity - keep
    const tier = resaleTier(row.card), unit = economy.resale.values[tier]
    if (extra <= 0 || !unit) return []
    return [{ cardId: row.cardId, name: row.card.name, code: row.card.code, imageUrl: row.card.imageUrl, tier, quantity: row.quantity, keep, extra, unit, total: extra * unit }]
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
}

export async function previewResale(db: PrismaClient, userId: string) {
  const items = await surplus(db, userId)
  return { items, total: items.reduce((n, i) => n + i.total, 0), copies: items.reduce((n, i) => n + i.extra, 0), keepCopies: (await currentEconomy(db)).resale.keepCopies }
}

/** Sells every surplus copy at once; the same key never sells twice. */
export async function sellDuplicates(db: PrismaClient, userId: string, key: string) {
  return inPlayerTransaction(db, userId, async tx => {
    const done = await tx.berryTransaction.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: `resale:${key}` } } })
    if (done) return { amount: done.amount, balance: done.balanceAfter, copies: (done.details as { copies?: number } | null)?.copies ?? 0, replayed: true }
    const items = await surplus(tx, userId)
    if (!items.length) throw new BerryError('NOTHING_TO_SELL', 'Aucun doublon en trop à revendre', 409)
    // One guarded update for every card: each quantity read above must still be the current one (player lock held).
    const updated = await tx.$executeRaw`UPDATE "UserCard" u SET "quantity" = v.keep, "updatedAt" = now()
      FROM unnest(${items.map(i => i.cardId)}::text[], ${items.map(i => i.quantity)}::int[], ${items.map(i => i.keep)}::int[]) AS v(card, qty, keep)
      WHERE u."userId" = ${userId} AND u."cardId" = v.card AND u."quantity" = v.qty`
    if (updated !== items.length) throw new BerryError('COLLECTION_CHANGED', 'La collection a changé, réessayez', 409)
    const amount = items.reduce((n, i) => n + i.total, 0), copies = items.reduce((n, i) => n + i.extra, 0)
    const { transaction } = await post(tx, userId, { amount, reason: 'DUPLICATE_SALE', key: `resale:${key}`, details: { copies, cards: items.map(i => ({ cardId: i.cardId, extra: i.extra, unit: i.unit })) } })
    return { amount, balance: transaction.balanceAfter, copies, replayed: false }
  })
}
