import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// One catalogue card with its rules texts (effect, ability, trigger), for the card detail opened from a light grid.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const c = await prisma.card.findUnique({ where: { id }, select: { id: true, code: true, name: true, type: true, color: true, cost: true, power: true, counter: true, effect: true, rarity: true, imageUrl: true, set: true, setCode: true, attribute: true, family: true, ability: true, trigger: true, isParallel: true, isAltArt: true, isSpecial: true } })
    if (!c) return NextResponse.json({ error: 'Carte introuvable' }, { status: 404 })
    return NextResponse.json({ ...c, setCode: c.setCode ?? null, counter: c.counter === null ? null : Number(c.counter) })
  } catch {
    console.error('Erreur GET /api/cards/[id]')
    return NextResponse.json({ error: 'Carte indisponible' }, { status: 500 })
  }
}
