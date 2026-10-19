import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { catalogById } from '@/lib/catalog/cache'

export const dynamic = 'force-dynamic'

// One catalogue card with its rules texts (effect, ability, trigger), for the card detail opened from a light grid.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const card = (await catalogById(prisma)).get(id)
    if (!card) return NextResponse.json({ error: 'Carte introuvable' }, { status: 404 })
    const { id: cardId, code, name, type, color, cost, power, counter, effect, rarity, imageUrl, set, setCode, attribute, family, ability, trigger, isParallel, isAltArt, isSpecial } = card
    return NextResponse.json({ id: cardId, code, name, type, color, cost, power, effect, rarity, imageUrl, set, attribute, family, ability, trigger, isParallel, isAltArt, isSpecial, setCode: setCode ?? null, counter: counter === null ? null : Number(counter) },
      { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' } })
  } catch {
    console.error('Erreur GET /api/cards/[id]')
    return NextResponse.json({ error: 'Carte indisponible' }, { status: 500 })
  }
}
