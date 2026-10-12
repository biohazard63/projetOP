import { playHandlers } from '@/lib/engine/http'
import { deckSource, playService, readJson, respond, sessionUserId } from '@/lib/engine/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return respond(await playHandlers.start(await sessionUserId(), await readJson(request), playService(), deckSource()))
}
