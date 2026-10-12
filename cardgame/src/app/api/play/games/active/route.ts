import { playHandlers } from '@/lib/engine/http'
import { playService, respond, sessionUserId } from '@/lib/engine/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return respond(await playHandlers.active(await sessionUserId(), playService()))
}
