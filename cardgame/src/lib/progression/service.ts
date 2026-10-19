import type { Prisma, PrismaClient } from '@prisma/client'
import { collectionStats } from '@/lib/collector/stats'
import { BerryError, inPlayerTransaction, postMany } from '@/lib/economy/ledger'
import { parisDay } from '@/lib/economy/config'
import manga from '@/lib/boosters/manga-rares.json'
import { BADGE_STEPS, PROGRESSION, badgeLevel, levelOf, levelReward, rankOf, titleOf } from './config'

type DB = Prisma.TransactionClient
type Game = { botLevel: string; humanSeat: string; result: { reason?: string; winnerId?: string | null; loserIds?: string[] } | null }
type Snapshot = { cards?: { drawTier?: string }[] } | null
const mangaRedIds = new Set((manga.status === 'validated' ? manga.cards : []).filter(c => c.key.endsWith('::_p3')).map(c => (c as { id?: string }).id ?? c.key.replace('::', '_')))
const parisHour = (at: Date) => Number(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(at))
const won = (g: Game) => g.result?.winnerId === g.humanSeat

/** Everything the badges and the XP are computed from, read from data the game already stores. */
async function metrics(tx: DB, userId: string) {
  if (!await tx.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new BerryError('USER_NOT_FOUND', 'Utilisateur introuvable', 401)
  const [cards, sets, owned, decks, openings, displays, games, treasureDays, resale, user, boosterCards] = await Promise.all([
    tx.card.findMany({ select: { id: true, setCode: true, isAltArt: true, isParallel: true, isSpecial: true } }),
    tx.cardSet.findMany({ select: { code: true, name: true } }),
    tx.userCard.findMany({ where: { userId, quantity: { gt: 0 } }, select: { cardId: true, quantity: true, card: { select: { name: true, isAltArt: true, isParallel: true, isSpecial: true } } } }),
    tx.deck.count({ where: { userId } }),
    tx.boosterOpening.count({ where: { userId, creditedAt: { not: null } } }),
    tx.virtualDisplay.count({ where: { userId, completedAt: { not: null } } }),
    tx.engineGame.findMany({ where: { userId, status: 'FINISHED' }, select: { botLevel: true, humanSeat: true, result: true } }) as Promise<Game[]>,
    tx.berryTransaction.count({ where: { userId, reason: 'DAILY_TREASURE' } }),
    tx.berryTransaction.aggregate({ where: { userId, reason: 'DUPLICATE_SALE' }, _sum: { amount: true } }),
    tx.user.findUniqueOrThrow({ where: { id: userId }, select: { berries: true, accountLevel: true, progressSyncedAt: true } }),
    tx.$queryRaw<{ n: bigint }[]>`SELECT count(DISTINCT c."cardId") AS n FROM "BoosterOpeningCard" c JOIN "BoosterOpening" o ON o.id = c."boosterOpeningId" WHERE o."userId" = ${userId}`,
  ])
  const stats = collectionStats(cards, owned, sets)
  const finished = games.filter(g => g.result)
  return {
    stats, owned, user, games: finished,
    values: {
      openings, displays, decks,
      catalogPercent: stats.percentage, alternatives: stats.ownedAlternatives,
      completeSets: stats.sets.filter(s => s.total > 0 && s.unique >= s.total).length,
      wins: finished.filter(won).length, hardWins: finished.filter(g => won(g) && g.botLevel === 'hard').length,
      treasureDays, resale: resale._sum.amount ?? 0,
    } as Record<string, number>,
    boosterCards: Number(boosterCards[0]?.n ?? 0),
  }
}

/** Secret badges not unlocked yet: each check reads only what it needs (events since the last sync when possible). */
async function secretsReached(tx: DB, userId: string, m: Awaited<ReturnType<typeof metrics>>, done: Set<string>) {
  const reached: string[] = [], check = (id: string, ok: boolean) => { if (!done.has(id) && ok) reached.push(id) }
  const since = m.user.progressSyncedAt ?? new Date(0)
  const names = m.owned.map(o => ({ id: o.cardId, ...o.card, special: o.card.isAltArt || o.card.isParallel || o.card.isSpecial }))
  check('gomu', names.some(c => c.special && /luffy/i.test(c.name)))
  check('one-piece', names.some(c => mangaRedIds.has(c.id)))
  check('zoro', names.filter(c => /zoro/i.test(c.name)).length >= 20)
  check('radin', m.user.berries >= 100_000)
  check('tel-est-pris', m.games.some(g => g.botLevel === 'easy' && !won(g) && g.result?.reason !== 'CONCESSION'))
  check('pacifiste', m.games.filter(g => g.result?.reason === 'CONCESSION' && g.result.loserIds?.includes(g.humanSeat)).length >= 5)
  if (!done.has('nuit')) check('nuit', (await tx.boosterOpening.findMany({ where: { userId, openedAt: { gte: since } }, select: { openedAt: true } })).some(o => parisHour(o.openedAt) === 3))
  if (!done.has('double')) check('double', (await tx.boosterOpening.findMany({ where: { userId, openedAt: { gte: since } }, select: { resultSnapshot: true } }))
    .some(o => ((o.resultSnapshot as Snapshot)?.cards ?? []).filter(c => c.drawTier === 'ALT' || c.drawTier === 'LEADER ALT').length >= 2))
  if (!done.has('etoile')) check('etoile', (await tx.boosterOpening.findMany({ where: { userId }, orderBy: { openedAt: 'asc' }, take: 24, select: { resultSnapshot: true } }))
    .some(o => ((o.resultSnapshot as Snapshot)?.cards ?? []).some(c => ['MANGA', 'MANGA GOLD', 'MANGA RED'].includes(c.drawTier ?? ''))))
  if (!done.has('flambeur')) {
    const days = new Map<string, number>()
    for (const t of await tx.berryTransaction.findMany({ where: { userId, reason: 'DISPLAY_PURCHASE' }, select: { createdAt: true } })) days.set(parisDay(t.createdAt), (days.get(parisDay(t.createdAt)) ?? 0) + 1)
    check('flambeur', [...days.values()].some(n => n >= 3))
  }
  if (!done.has('remontada') || !done.has('blitz')) {
    const recent = await tx.engineGame.findMany({ where: { userId, status: 'FINISHED', finishedAt: { gte: since } }, select: { humanSeat: true, result: true, state: true }, take: 200, orderBy: { finishedAt: 'desc' } })
    const human = (g: (typeof recent)[number]) => (g.state as { players?: { id: string; turns: number; zones?: { life?: string[] } }[] }).players?.find(p => p.id === g.humanSeat)
    const wins = recent.filter(g => (g.result as Game['result'])?.winnerId === g.humanSeat)
    check('remontada', wins.some(g => (human(g)?.zones?.life?.length ?? 1) === 0))
    check('blitz', wins.some(g => (human(g)?.turns ?? 99) <= 6))
  }
  return reached
}

const xpOfBadgeLevel = (level: number) => rankOf(level).xp
function xpOf(m: Awaited<ReturnType<typeof metrics>>, levels: Map<string, number>, secrets: number) {
  const x = PROGRESSION.xp
  const games = m.games.reduce((sum, g) => sum + (x.game[(['easy', 'normal', 'hard'] as const).find(l => l === g.botLevel) ?? 'normal'] * (won(g) ? x.winMultiplier : 1)), 0)
  const badges = [...levels.values()].reduce((sum, level) => sum + Array.from({ length: level }, (_, i) => xpOfBadgeLevel(i + 1)).reduce((a, b) => a + b, 0), 0)
  return Math.round(m.values.openings * x.booster + m.boosterCards * x.newCard + games + m.values.treasureDays * x.dailyTreasure + badges + secrets * PROGRESSION.secretReward.xp)
}

export type Unlock = { kind: 'badge' | 'secret' | 'level'; id: string; name: string; label: string; berries: number; title?: string }

/**
 * Recomputes the player's badges and account level, then pays every newly reached badge level, secret badge and
 * account level once (Berry ledger keys `badge:<id>:<level>`, `secret:<id>`, `level:<n>`). Safe to call any time.
 */
export async function syncProgress(db: PrismaClient, userId: string) {
  return inPlayerTransaction(db, userId, async tx => {
    const m = await metrics(tx, userId)
    const stored = new Map((await tx.userBadge.findMany({ where: { userId } })).map(b => [b.badgeId, b.level]))
    // Rewards are paid together at the end (one bulk write, however many levels a long-time player reaches at once).
    const unlocks: Unlock[] = [], payments: Parameters<typeof postMany>[2] = []
    for (const badge of PROGRESSION.badges) {
      const before = stored.get(badge.id) ?? 0, now = Math.min(BADGE_STEPS, badgeLevel(badge, m.values[badge.metric] ?? 0))
      for (let level = before + 1; level <= now; level++) {
        const rank = rankOf(level)
        payments.push({ amount: rank.reward, reason: 'BADGE', key: `badge:${badge.id}:${level}`, details: { badge: badge.id, level } })
        unlocks.push({ kind: 'badge', id: badge.id, name: badge.name, label: rank.label, berries: rank.reward, ...(rank.title ? { title: badge.legendTitle } : {}) })
      }
      if (now > before) { await tx.userBadge.upsert({ where: { userId_badgeId: { userId, badgeId: badge.id } }, update: { level: now, seenAt: null }, create: { userId, badgeId: badge.id, level: now } }); stored.set(badge.id, now) }
    }
    const secretIds = new Set(PROGRESSION.secrets.map(s => s.id))
    const doneSecrets = new Set([...stored.keys()].filter(id => secretIds.has(id)))
    for (const id of await secretsReached(tx, userId, m, doneSecrets)) {
      const secret = PROGRESSION.secrets.find(s => s.id === id)!
      payments.push({ amount: PROGRESSION.secretReward.berries, reason: 'BADGE', key: `secret:${id}`, details: { secret: id } })
      await tx.userBadge.create({ data: { userId, badgeId: id, level: 1 } }); stored.set(id, 1); doneSecrets.add(id)
      unlocks.push({ kind: 'secret', id, name: secret.name, label: 'Badge secret', berries: PROGRESSION.secretReward.berries })
    }
    const tiered = new Map([...stored].filter(([id]) => !secretIds.has(id)))
    const account = levelOf(xpOf(m, tiered, doneSecrets.size))
    for (let level = m.user.accountLevel + 1; level <= account.level; level++) {
      const berries = levelReward(level)
      payments.push({ amount: berries, reason: 'LEVEL', key: `level:${level}`, details: { level } })
      unlocks.push({ kind: 'level', id: `level-${level}`, name: `Niveau ${level}`, label: titleOf(level), berries })
    }
    if (payments.length) await postMany(tx, userId, payments)
    await tx.user.update({ where: { id: userId }, data: { accountLevel: Math.max(account.level, m.user.accountLevel), progressSyncedAt: new Date() } })
    return { unlocks, progress: view(m.values, stored, doneSecrets, account) }
  }, 30000)
}

function view(values: Record<string, number>, stored: Map<string, number>, secrets: Set<string>, account: ReturnType<typeof levelOf>) {
  const legend = PROGRESSION.badges.filter(b => (stored.get(b.id) ?? 0) >= BADGE_STEPS).map(b => b.legendTitle)
  return {
    account: { ...account, title: titleOf(account.level), titles: legend },
    badges: PROGRESSION.badges.map(b => {
      const level = stored.get(b.id) ?? 0, next = b.thresholds[level] ?? null
      return { id: b.id, name: b.name, category: b.category, unit: b.unit, value: values[b.metric] ?? 0, level, rank: level ? rankOf(level).id : null, label: level ? rankOf(level).label : 'À débloquer',
        next, nextLabel: next !== null ? rankOf(level + 1).label : null, nextReward: next !== null ? rankOf(level + 1).reward : null, from: level ? b.thresholds[level - 1] : 0, legendTitle: b.legendTitle, max: level >= BADGE_STEPS }
    }),
    secrets: PROGRESSION.secrets.map(s => secrets.has(s.id) ? { id: s.id, unlocked: true, name: s.name, hint: s.hint } : { id: s.id, unlocked: false, name: '???', hint: 'Badge secret' }),
  }
}
export type ProgressView = ReturnType<typeof view>
