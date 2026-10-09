import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { collectionStats } from '@/lib/collector/stats'
import { cardEffect } from '@/lib/collector/effects'

export const dynamic = 'force-dynamic'
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  try {
    const result = await prisma.$transaction(async tx => {
      const userId = session.user.id
      const [profile, cards, sets, owned, decks, openings, lastOpening] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { name: true, email: true, createdAt: true } }),
        tx.card.findMany({ select: { id: true, setCode: true, isAltArt: true, isParallel: true, isSpecial: true } }),
        tx.cardSet.findMany({ select: { code: true, name: true }, orderBy: { releaseDate: 'desc' } }),
        tx.userCard.findMany({ where: { userId, quantity: { gt: 0 } }, include: { card: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
        tx.deck.count({ where: { userId } }),
        tx.boosterOpening.count({ where: { userId } }),
        tx.boosterOpening.findFirst({ where: { userId }, orderBy: [{ openedAt: 'desc' }, { id: 'desc' }], select: { id: true, openedAt: true, booster: { select: { setCode: true, cardSet: { select: { name: true } } } } } }),
      ])
      if (!profile) return null
      const recent = owned.map(row => ({ ...row.card, quantity: row.quantity, acquiredAt: row.createdAt.toISOString() }))
      return { profile, ...collectionStats(cards, owned, sets), decks, openings,
        recentCards: recent.slice(0, 8), recentRareCards: recent.filter(c => cardEffect(c) !== 'common').slice(0, 6),
        lastOpening: lastOpening ? { id: lastOpening.id, openedAt: lastOpening.openedAt, setCode: lastOpening.booster.setCode, setName: lastOpening.booster.cardSet.name } : null }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
    return result ? NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } }) : NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
  } catch {
    return NextResponse.json({ error: 'Votre collection est momentanément indisponible.' }, { status: 503 })
  }
}
