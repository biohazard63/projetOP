import type { ReactNode } from 'react'
import { auth } from '@/lib/auth'
import { isReportAdmin } from '@/lib/reports/service'
import { notFound, redirect } from 'next/navigation'
import { AdminNav } from '@/components/admin/shared'

export const dynamic = 'force-dynamic'
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!isReportAdmin(session.user.email)) notFound()
  return <><div className="admin-nav-container"><AdminNav /></div>{children}</>
}
