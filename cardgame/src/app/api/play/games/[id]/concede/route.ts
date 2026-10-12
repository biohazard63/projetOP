import { playHandlers } from '@/lib/engine/http'
import { playService, readJson, respond, sessionUserId } from '@/lib/engine/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return respond(await playHandlers.concede(await sessionUserId(), id, await readJson(request), playService()))
}
