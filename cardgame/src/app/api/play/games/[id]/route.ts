import { playHandlers } from '@/lib/engine/http'
import { playService, respond, sessionUserId } from '@/lib/engine/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return respond(await playHandlers.view(await sessionUserId(), id, new URL(request.url).searchParams.get('since'), playService()))
}
