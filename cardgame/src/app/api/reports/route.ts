import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/security'
import { reportHandlers } from '@/lib/reports/http'
import { reportStore } from '@/lib/reports/repository'
import { reportWhere } from '@/lib/reports/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const { GET, POST, PATCH } = reportHandlers({
  session: auth,
  store: reportStore,
  allow: userId => rateLimit(`report:${userId}`, 10, 15 * 60 * 1000).allowed,
  list: async filters => {
    const [rows, grouped] = await Promise.all([prisma.issueReport.findMany({
      where: reportWhere(filters), orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 31,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      include: { user: { select: { name: true, email: true } } },
    }), prisma.issueReport.groupBy({ by: ['status'], where: reportWhere({ ...filters, status: undefined }), _count: { _all: true } })])
    const counts = Object.fromEntries(grouped.map(row => [row.status, row._count._all]))
    return { reports: rows.slice(0, 30), nextCursor: rows.length > 30 ? rows[29].id : null, counts, total: grouped.reduce((sum, row) => sum + row._count._all, 0) }
  },
  update: async (id, status) => {
    const result = await prisma.issueReport.updateMany({ where: { id }, data: { status } })
    return result.count ? { id, status } : null
  },
})
