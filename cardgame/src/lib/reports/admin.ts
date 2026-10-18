import type { Prisma } from '@prisma/client'
import type { ReportFilters } from './service'

export function reportWhere({ status, source, category, q }: ReportFilters): Prisma.IssueReportWhereInput {
  return {
    ...(status ? { status } : {}), ...(source ? { source } : {}), ...(category ? { category } : {}),
    ...(q ? { OR: [
      { id: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } },
      { cardSnapshot: { path: ['code'], string_contains: q, mode: 'insensitive' } },
      { cardSnapshot: { path: ['name'], string_contains: q, mode: 'insensitive' } },
      { user: { email: { contains: q, mode: 'insensitive' } } }, { user: { name: { contains: q, mode: 'insensitive' } } },
    ] } : {}),
  }
}
