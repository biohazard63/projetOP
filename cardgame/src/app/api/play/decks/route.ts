import { playHandlers } from '@/lib/engine/http'
import { deckSource, respond, sessionUserId } from '@/lib/engine/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// A cold instance compiles the card catalogue and checks every offered deck once (then cached per process).
export const maxDuration = 30

export async function GET() {
  return respond(await playHandlers.decks(await sessionUserId(), deckSource()))
}
