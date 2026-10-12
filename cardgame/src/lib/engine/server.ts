import { prisma } from '../prisma'
import { auth } from '../auth'
import { PrismaGameRepository } from './repository'
import { PrismaDeckSource, NO_STORE, type Reply } from './http'
import { PlayService } from './service'

// Wiring for the Next.js route handlers (Node runtime only). The user id comes from the NextAuth session.
export const playService = () => new PlayService(new PrismaGameRepository(prisma))
export const deckSource = () => new PrismaDeckSource(prisma)
export async function sessionUserId(): Promise<string | null> {
  const session = await auth()
  return typeof session?.user?.id === 'string' && session.user.id ? session.user.id : null
}
export function respond(reply: Reply): Response {
  return Response.json(reply.body, { status: reply.status, headers: NO_STORE })
}
export async function readJson(request: Request): Promise<unknown> {
  try { return await request.json() } catch { return undefined }
}
