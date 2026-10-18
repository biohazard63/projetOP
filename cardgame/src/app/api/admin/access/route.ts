import { auth } from '@/lib/auth'
import { isReportAdmin } from '@/lib/reports/service'

export const dynamic = 'force-dynamic'
export async function GET() {
  const session = await auth()
  return Response.json({ admin: Boolean(session?.user?.id && isReportAdmin(session.user.email)) }, { headers: { 'Cache-Control': 'no-store' } })
}
