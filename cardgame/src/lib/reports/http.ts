import { z } from 'zod'
import { createReport, isReportAdmin, reportStatus, reportFilters, type ReportFilters, type ReportStore } from './service'

type Session = { user?: { id?: string; email?: string | null } } | null
type Dependencies = {
  session: () => Promise<Session>; store: ReportStore
  allow: (userId: string) => boolean
  list: (filters: ReportFilters) => Promise<unknown>
  update: (id: string, status: string) => Promise<{ id: string; status: string } | null>
}
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
function sameOrigin(request: Request) { const origin = request.headers.get('origin'); return !origin || origin === new URL(request.url).origin }
async function bodyOf(request: Request) {
  if (Number(request.headers.get('content-length')) > 64000) throw Error('TOO_LARGE')
  const text = await request.text()
  if (new TextEncoder().encode(text).length > 64000) throw Error('TOO_LARGE')
  try { return JSON.parse(text) } catch { throw Error('INVALID_REPORT') }
}
function failure(error: unknown) {
  const code = error instanceof Error ? error.message : ''
  const status = ({ AUTH_REQUIRED: 401, INVALID_REPORT: 400, CONTEXT_NOT_FOUND: 404, TOO_LARGE: 413 } as Record<string, number>)[code]
  if (status) return json({ error: code }, status)
  // Do not log report contents, session data, database URLs or engine state.
  console.error('Report persistence unavailable')
  return json({ error: 'REPORTS_UNAVAILABLE' }, 503)
}
export function reportHandlers(deps: Dependencies) {
  return {
    async POST(request: Request) {
      if (!sameOrigin(request)) return json({ error: 'FORBIDDEN' }, 403)
      try {
        const session = await deps.session()
        if (!session?.user?.id) return json({ error: 'AUTH_REQUIRED' }, 401)
        if (!deps.allow(session.user.id)) return json({ error: 'RATE_LIMIT' }, 429)
        return json(await createReport(session.user.id, await bodyOf(request), deps.store), 201)
      } catch (e) { return failure(e) }
    },
    async GET(request: Request) {
      try {
        const session = await deps.session()
        if (!session?.user?.id) return json({ error: 'AUTH_REQUIRED' }, 401)
        if (!isReportAdmin(session.user.email)) return json({ error: 'FORBIDDEN' }, 403)
        const params = new URL(request.url).searchParams
        const parsed = reportFilters.safeParse(Object.fromEntries(params))
        if (!parsed.success) return json({ error: 'INVALID_REPORT' }, 400)
        return json(await deps.list(parsed.data))
      } catch (e) { return failure(e) }
    },
    async PATCH(request: Request) {
      if (!sameOrigin(request)) return json({ error: 'FORBIDDEN' }, 403)
      try {
        const session = await deps.session()
        if (!session?.user?.id) return json({ error: 'AUTH_REQUIRED' }, 401)
        if (!isReportAdmin(session.user.email)) return json({ error: 'FORBIDDEN' }, 403)
        const parsed = z.object({ id: z.string().min(1).max(100), status: reportStatus }).safeParse(await bodyOf(request))
        if (!parsed.success) return json({ error: 'INVALID_REPORT' }, 400)
        const report = await deps.update(parsed.data.id, parsed.data.status)
        return report ? json(report) : json({ error: 'NOT_FOUND' }, 404)
      } catch (e) { return failure(e) }
    },
  }
}
