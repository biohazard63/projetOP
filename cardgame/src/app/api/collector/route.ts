import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { collectionStats } from '@/lib/collector/stats'
import { cardEffect } from '@/lib/collector/effects'
import { catalogById, catalogCards } from '@/lib/catalog/cache'

export const dynamic = 'force-dynamic'
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  try {
    const result = await prisma.$transaction(async tx => {
      const userId = session.user.id
      const [profile, cards, sets, owned, decks, openings, lastOpening] = await Promise.all([
        tx.user.findUnique({ where: { id: userId }, select: { name: true, email: true, createdAt: true } }),
        catalogCards(prisma),
        tx.cardSet.findMany({ select: { code: true, name: true }, orderBy: { releaseDate: 'desc' } }),
        // Every owned card for the figures, with only the fields that decide the reveal effect; full cards for the few shown.
        tx.userCard.findMany({ where: { userId, quantity: { gt: 0 } }, select: { cardId: true, quantity: true, createdAt: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }),
        tx.deck.count({ where: { userId } }),
        tx.boosterOpening.count({ where: { userId } }),
        tx.boosterOpening.findFirst({ where: { userId }, orderBy: [{ openedAt: 'desc' }, { id: 'desc' }], select: { id: true, openedAt: true, booster: { select: { setCode: true, cardSet: { select: { name: true } } } } } }),
      ])
      if (!profile) return null
      // Owned identifiers and quantities only; the card itself comes from the shared catalogue.
      const byId = await catalogById(prisma), known = owned.filter(row => byId.has(row.cardId))
      const entry = (row: (typeof owned)[number]) => ({ ...byId.get(row.cardId)!, quantity: row.quantity, acquiredAt: row.createdAt.toISOString() })
      return { profile, ...collectionStats(cards, owned, sets), decks, openings,
        recentCards: known.slice(0, 8).map(entry), recentRareCards: known.filter(row => cardEffect(byId.get(row.cardId)!) !== 'common').slice(0, 6).map(entry),
        lastOpening: lastOpening ? { id: lastOpening.id, openedAt: lastOpening.openedAt, setCode: lastOpening.booster.setCode, setName: lastOpening.booster.cardSet.name } : null }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
    return result ? NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } }) : NextResponse.json({ error: 'Compte introuvable' }, { status: 404 })
  } catch {
    return NextResponse.json({ error: 'Votre collection est momentanément indisponible.' }, { status: 503 })
  }
}
