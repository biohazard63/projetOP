import { z } from 'zod'
import { isReportAdmin } from '../reports/service'
import { adminAction, adminQuery, resources, type AdminAction, type AdminQuery, type AdminResource } from './contracts'

type Session = { user?: { id?: string; email?: string | null } } | null
export function adminHandlers(deps: { session: () => Promise<Session>; allow: (id: string) => boolean; read: (resource: AdminResource, query: AdminQuery, id?: string) => Promise<unknown>; write: (actor: string, action: AdminAction) => Promise<unknown> }) {
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  return async (request: Request, resource: string, id?: string) => {
    try {
      const session = await deps.session()
      if (!session?.user?.id) return json({ error: 'AUTH_REQUIRED' }, 401)
      if (!isReportAdmin(session.user.email)) return json({ error: 'FORBIDDEN' }, 403)
      if (!(resources as readonly string[]).includes(resource)) return json({ error: 'NOT_FOUND' }, 404)
      if (request.method === 'GET') {
        const query = adminQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams))
        if (!query.success) return json({ error: 'INVALID_QUERY' }, 400)
        return json(await deps.read(resource as AdminResource, query.data, id))
      }
      if (request.method !== 'PATCH') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
      const origin = request.headers.get('origin'); if (origin && origin !== new URL(request.url).origin) return json({ error: 'FORBIDDEN' }, 403)
      if (!deps.allow(session.user.id)) return json({ error: 'RATE_LIMIT' }, 429)
      if (Number(request.headers.get('content-length')) > 200000) return json({ error: 'TOO_LARGE' }, 413)
      const raw = await request.text(); if (new TextEncoder().encode(raw).length > 200000) return json({ error: 'TOO_LARGE' }, 413)
      let value: unknown; try { value = JSON.parse(raw) } catch { return json({ error: 'INVALID_ACTION' }, 400) }
      const parsed = adminAction.safeParse(value); if (!parsed.success) return json({ error: 'INVALID_ACTION', message: parsed.error.issues.map(i => `${i.path.join('.')} : ${i.message}`).join(' ; ') }, 400)
      const expectedResource = ({ USER_BERRIES: 'users', USER_COLLECTION: 'users', CARD_EDIT: 'cards', SET_EDIT: 'sets', RULES_EDIT: 'sets', ECONOMY_EDIT: 'economy' } as const)[parsed.data.type]
      if (expectedResource !== resource || (id && id !== parsed.data.id)) return json({ error: 'INVALID_ACTION' }, 400)
      return json(await deps.write(session.user.id, parsed.data))
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      const status = ({ NOT_FOUND: 404, EDIT_CONFLICT: 409, REQUEST_CONFLICT: 409, INSUFFICIENT_BERRIES: 409, BALANCE_LIMIT: 422, CARD_USED_IN_DECK: 409, INVALID_ACTION: 400, INTEGRATED_RULES: 409 } as Record<string, number>)[message]
      if (status) return json({ error: message }, status)
      if (error instanceof z.ZodError) return json({ error: 'INVALID_ACTION' }, 400)
      if (error && typeof error === 'object' && 'code' in error && ['INCOMPLETE_SET', 'INSUFFICIENT_UNIQUE_CARDS', 'INVALID_RULES', 'EMPTY_SET'].includes(String(error.code))) return json({ error: 'INVALID_RULES', message }, 422)
      console.error('Admin operation unavailable')
      return json({ error: 'ADMIN_UNAVAILABLE', message: 'Opération indisponible. Vérifiez notamment que la migration d’administration a été appliquée.' }, 503)
    }
  }
}
