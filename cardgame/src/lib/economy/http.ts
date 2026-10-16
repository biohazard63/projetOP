import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BerryError, claimDailyTreasure, claimGameReward, getWallet } from './ledger'
import { previewResale, sellDuplicates } from './resale'
import { syncProgress } from '@/lib/progression/service'

type Handler = (userId: string, body: unknown) => Promise<unknown>
// Same guards as the booster routes: signed-in player, same-origin writes, typed errors, no internal detail leaked.
function route(handler: Handler, write: boolean) {
  return async (request: Request) => {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    try {
      if (write) {
        const origin = request.headers.get('origin')
        if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new BerryError('INVALID_ORIGIN', 'Origine de requête refusée', 403)
      }
      const body = write ? await request.json().catch(() => { throw new BerryError('INVALID_REQUEST', 'JSON invalide', 400) }) : null
      return NextResponse.json({ success: true, ...(await handler(session.user.id, body) as object) })
    } catch (error) {
      if (error instanceof BerryError) return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: error.status })
      const reference = randomUUID()
      console.error('Opération Berrys échouée', { reference, error: error instanceof Error ? error.name : 'unknown' })
      return NextResponse.json({ success: false, reference, error: `Opération indisponible. Référence : ${reference}` }, { status: 500 })
    }
  }
}
const parse = <T>(schema: z.ZodType<T>, body: unknown) => { const r = schema.safeParse(body); if (!r.success) throw new BerryError('INVALID_REQUEST', 'Requête invalide', 400); return r.data }

export const getWalletRoute = route(userId => getWallet(prisma, userId), false)
export const postTreasure = route(userId => claimDailyTreasure(prisma, userId), true)
export const postGameReward = route((userId, body) => claimGameReward(prisma, userId, parse(z.object({ gameId: z.string().min(1).max(100) }).strict(), body).gameId), true)
export const getResale = route(userId => previewResale(prisma, userId), false)
export const postResale = route((userId, body) => sellDuplicates(prisma, userId, parse(z.object({ idempotencyKey: z.string().uuid() }).strict(), body).idempotencyKey), true)
export const postProgress = route(userId => syncProgress(prisma, userId), true)
