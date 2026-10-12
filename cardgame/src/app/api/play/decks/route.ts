import { playHandlers } from '@/lib/engine/http'
import { deckSource, respond, sessionUserId } from '@/lib/engine/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return respond(await playHandlers.decks(await sessionUserId(), deckSource()))
}
