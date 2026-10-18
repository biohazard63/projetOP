import { prisma } from '../prisma'
import { parisDay, parisDayStart } from '../economy/config'
import { currentEconomy } from '../economy/settings'
import { userSelect } from './data'

type DayCount = { day: string; value: number }
export function activityDays(at: Date, users: DayCount[], openings: DayCount[], games: DayCount[]) {
  const noon = new Date(`${parisDay(at)}T12:00:00Z`)
  return Array.from({ length: 14 }, (_, index) => {
    const d = new Date(noon); d.setUTCDate(d.getUTCDate() - 13 + index); const day = parisDay(d)
    return { day, users: users.find(row => row.day === day)?.value ?? 0, openings: openings.find(row => row.day === day)?.value ?? 0, games: games.find(row => row.day === day)?.value ?? 0 }
  })
}
export async function adminOverview() {
  const now = new Date(), today = parisDayStart(now), start = new Date(today); start.setUTCDate(start.getUTCDate() - 13)
  const [users, cards, sets, openings, games, activeGames, decks, wallet, reportGroups, recentUsers, recentReports, recentOpenings, missingImages, emptySets, usersDaily, openingsDaily, gamesDaily, economy, migration] = await Promise.all([
    prisma.user.count(), prisma.card.count(), prisma.cardSet.count(), prisma.boosterOpening.count(), prisma.engineGame.count(), prisma.engineGame.count({ where: { status: 'ACTIVE' } }), prisma.deck.count(),
    prisma.user.aggregate({ _sum: { berries: true } }), prisma.issueReport.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: userSelect }),
    prisma.issueReport.findMany({ where: { status: { in: ['NEW', 'IN_PROGRESS'] } }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, category: true, source: true, status: true, description: true, createdAt: true } }),
    prisma.boosterOpening.findMany({ orderBy: { openedAt: 'desc' }, take: 5, select: { id: true, openedAt: true, booster: { select: { setCode: true } }, user: { select: { name: true } }, _count: { select: { cards: true } } } }),
    prisma.card.count({ where: { imageUrl: '' } }), prisma.cardSet.count({ where: { cards: { none: {} } } }),
    prisma.$queryRaw<DayCount[]>`SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD') AS day, count(*)::int AS value FROM "User" WHERE "createdAt" >= ${start} GROUP BY 1`,
    prisma.$queryRaw<DayCount[]>`SELECT to_char(("openedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD') AS day, count(*)::int AS value FROM "BoosterOpening" WHERE "openedAt" >= ${start} GROUP BY 1`,
    prisma.$queryRaw<DayCount[]>`SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Paris', 'YYYY-MM-DD') AS day, count(*)::int AS value FROM "EngineGame" WHERE "createdAt" >= ${start} GROUP BY 1`,
    currentEconomy(prisma), prisma.$queryRaw<{ ready: boolean }[]>`SELECT to_regclass('"AdminSetting"') IS NOT NULL AND to_regclass('"AdminAuditLog"') IS NOT NULL AS ready`,
  ])
  const reportCounts = Object.fromEntries(reportGroups.map(row => [row.status, row._count._all]))
  return { generatedAt: now.toISOString(), users, cards, sets, openings, games, activeGames, decks, berries: wallet._sum.berries ?? 0, reports: (reportCounts.NEW ?? 0) + (reportCounts.IN_PROGRESS ?? 0), reportCounts, recentUsers, recentReports, recentOpenings, quality: { missingImages, emptySets }, activity: activityDays(now, usersDaily, openingsDaily, gamesDaily), economy, writesReady: migration[0]?.ready === true }
}
