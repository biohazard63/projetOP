import { Prisma, type PrismaClient } from '@prisma/client'
import { economyAt, parisDay, parisDayStart } from './config'

type DB = Prisma.TransactionClient
export type BerryReason = 'STARTER_GRANT' | 'DAILY_TREASURE' | 'BOT_GAME' | 'DUPLICATE_SALE' | 'BOOSTER_PURCHASE' | 'DISPLAY_PURCHASE'
export class BerryError extends Error { constructor(public code: string, message: string, public status = 422) { super(message) } }

/** Same per-player lock as booster openings: every credit and purchase of a player is serialized. */
export const lockPlayer = (tx: DB, userId: string) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`booster:${userId}`}, 0))`

export async function inPlayerTransaction<T>(db: PrismaClient, userId: string, run: (tx: DB) => Promise<T>, timeout = 20000): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(async tx => { await lockPlayer(tx, userId); return run(tx) }, { maxWait: 10000, timeout, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code) && attempt < 2) continue
      throw error
    }
  }
  throw new BerryError('RETRY_EXHAUSTED', 'Réessayez dans un instant', 503)
}

/**
 * One ledger line, at most once per (player, key), inside a transaction that holds the player lock.
 * The balance can never become negative: a purchase above the balance is refused.
 */
export async function post(tx: DB, userId: string, entry: { amount: number; reason: BerryReason; key: string; details?: Prisma.InputJsonValue }) {
  const existing = await tx.berryTransaction.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: entry.key } } })
  if (existing) return { transaction: existing, replayed: true }
  await grantStarter(tx, userId)
  const user = await tx.user.findUnique({ where: { id: userId }, select: { berries: true } })
  if (!user) throw new BerryError('USER_NOT_FOUND', 'Utilisateur introuvable', 401)
  const balanceAfter = user.berries + entry.amount
  if (balanceAfter < 0) throw new BerryError('INSUFFICIENT_BERRIES', `Solde insuffisant : ${(-entry.amount).toLocaleString('fr-FR')} ฿ nécessaires, ${user.berries.toLocaleString('fr-FR')} ฿ disponibles.`, 402)
  await tx.user.update({ where: { id: userId }, data: { berries: balanceAfter } })
  const transaction = await tx.berryTransaction.create({ data: { userId, amount: entry.amount, reason: entry.reason, idempotencyKey: entry.key, balanceAfter, details: entry.details } })
  return { transaction, replayed: false }
}

/** Starting purse, granted once (also to accounts created before Berries existed). */
export async function grantStarter(tx: DB, userId: string) {
  if (await tx.berryTransaction.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: 'starter-grant' } }, select: { id: true } })) return
  const user = await tx.user.findUnique({ where: { id: userId }, select: { berries: true } })
  if (!user) throw new BerryError('USER_NOT_FOUND', 'Utilisateur introuvable', 401)
  const grant = economyAt().starterGrant, balanceAfter = user.berries + grant
  await tx.user.update({ where: { id: userId }, data: { berries: balanceAfter } })
  await tx.berryTransaction.create({ data: { userId, amount: grant, reason: 'STARTER_GRANT', idempotencyKey: 'starter-grant', balanceAfter } })
}

const todayGames = async (tx: DB, userId: string, at: Date) =>
  (await tx.berryTransaction.aggregate({ where: { userId, reason: 'BOT_GAME', createdAt: { gte: parisDayStart(at) } }, _sum: { amount: true } }))._sum.amount ?? 0

/** Balance, today's state and the last movements. Grants the starting purse on first visit. */
export async function getWallet(db: PrismaClient, userId: string, at = new Date()) {
  return inPlayerTransaction(db, userId, async tx => {
    await grantStarter(tx, userId)
    const [user, recent, treasure, games] = await Promise.all([
      tx.user.findUnique({ where: { id: userId }, select: { berries: true } }),
      tx.berryTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, amount: true, reason: true, balanceAfter: true, details: true, createdAt: true } }),
      tx.berryTransaction.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: `treasure:${parisDay(at)}` } }, select: { id: true } }),
      todayGames(tx, userId, at),
    ])
    const economy = economyAt(at)
    return { balance: user?.berries ?? 0, economy, today: { treasureClaimed: Boolean(treasure), gamesEarned: games, gamesCap: economy.rewards.dailyGameCap }, recent }
  })
}

export async function claimDailyTreasure(db: PrismaClient, userId: string, at = new Date()) {
  return inPlayerTransaction(db, userId, async tx => {
    const { transaction, replayed } = await post(tx, userId, { amount: economyAt(at).rewards.dailyTreasure, reason: 'DAILY_TREASURE', key: `treasure:${parisDay(at)}`, details: { day: parisDay(at) } })
    return { amount: transaction.amount, balance: transaction.balanceAfter, replayed }
  })
}

/**
 * Reward of a finished game against the bot: base amount by level, multiplied on a win; only for a game finished
 * today (Paris), of at least `minTurns` turns of the player, not ended by the player's own concession; capped per day.
 */
export async function claimGameReward(db: PrismaClient, userId: string, gameId: string, at = new Date()) {
  return inPlayerTransaction(db, userId, async tx => {
    const already = await tx.berryTransaction.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: `game:${gameId}` } } })
    if (already) return { amount: already.amount, balance: already.balanceAfter, replayed: true }
    const game = await tx.engineGame.findFirst({ where: { id: gameId, userId }, select: { status: true, finishedAt: true, botLevel: true, humanSeat: true, result: true, state: true } })
    if (!game) throw new BerryError('GAME_NOT_FOUND', 'Partie introuvable', 404)
    if (game.status !== 'FINISHED' || !game.finishedAt) throw new BerryError('GAME_NOT_FINISHED', 'La partie n’est pas terminée', 409)
    if (game.finishedAt < parisDayStart(at)) throw new BerryError('GAME_TOO_OLD', 'Seules les parties terminées aujourd’hui rapportent des Berrys', 409)
    const economy = economyAt(at), result = game.result as { reason?: string; winnerId?: string | null; loserIds?: string[] } | null
    if (result?.reason === 'CONCESSION' && result.loserIds?.includes(game.humanSeat)) throw new BerryError('CONCEDED', 'Une partie abandonnée ne rapporte pas de Berrys', 409)
    const turns = (game.state as { players?: { id: string; turns: number }[] }).players?.find(p => p.id === game.humanSeat)?.turns ?? 0
    if (turns < economy.rewards.minTurns) throw new BerryError('GAME_TOO_SHORT', `Une partie doit durer au moins ${economy.rewards.minTurns} tours pour rapporter des Berrys`, 409)
    const level = (['easy', 'normal', 'hard'] as const).find(l => l === game.botLevel) ?? 'normal'
    const won = result?.winnerId === game.humanSeat
    const earned = await todayGames(tx, userId, at), room = Math.max(0, economy.rewards.dailyGameCap - earned)
    const amount = Math.min(room, Math.round(economy.rewards.botGame[level] * (won ? economy.rewards.winMultiplier : 1)))
    if (!amount) throw new BerryError('DAILY_CAP', 'Plafond de Berrys des parties atteint pour aujourd’hui', 409)
    const { transaction } = await post(tx, userId, { amount, reason: 'BOT_GAME', key: `game:${gameId}`, details: { gameId, level, won, turns } })
    return { amount, balance: transaction.balanceAfter, replayed: false, won, capped: amount < Math.round(economy.rewards.botGame[level] * (won ? economy.rewards.winMultiplier : 1)) }
  })
}
