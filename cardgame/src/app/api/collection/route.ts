import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  try {
    const rows = await prisma.userCard.findMany({
      where: { userId: session.user.id, quantity: { gt: 0 } },
      include: { card: true },
    })
    return NextResponse.json({ cards: rows.map(row => ({ ...row.card, quantity: row.quantity })) })
  } catch {
    console.error('Collection indisponible')
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
