import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { playableCardIds } from '@/lib/engine/catalog'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  try {
    // ?fields=quantities: the grid merges quantities into the catalogue it already has; no second copy of every card.
    if (new URL(request.url).searchParams.get('fields') === 'quantities') {
      const owned = await prisma.userCard.findMany({ where: { userId: session.user.id, quantity: { gt: 0 } }, select: { cardId: true, quantity: true, createdAt: true } })
      return NextResponse.json({ cards: owned.map(row => ({ id: row.cardId, quantity: row.quantity, acquiredAt: row.createdAt.toISOString() })) })
    }
    const rows = await prisma.userCard.findMany({
      where: { userId: session.user.id, quantity: { gt: 0 } },
      include: { card: true },
    })
    // ?playable=1 (deck builder): only the owned cards the game engine can play (playableCardIds).
    const playable = new URL(request.url).searchParams.get('playable') === '1' ? playableCardIds(rows.map(row => row.card)) : null
    return NextResponse.json({ cards: rows.filter(row => !playable || playable.has(row.cardId)).map(row => ({ ...row.card, quantity: row.quantity, acquiredAt: row.createdAt.toISOString() })) })
  } catch {
    console.error('Collection indisponible')
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
