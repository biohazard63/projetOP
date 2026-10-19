import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { catalogCards } from '@/lib/catalog/cache'

export const dynamic = 'force-dynamic'

// Format public du catalogue, relu pour rendre les nouveaux imports visibles.
type CardSummary = {
  id: string
  code: string
  name: string
  type: string
  color: string
  cost: number | null
  power: number | null
  counter: number | null
  effect?: string | null
  rarity: string
  imageUrl: string
  set: string | null
  setCode?: string | null
  attribute?: string | null
  family?: string | null
  ability?: string | null
  trigger?: string | null
  isParallel: boolean | null
  isAltArt: boolean | null
  isSpecial: boolean | null
}
// ?fields=grid: the collection grid only needs what a tile shows (no rules text: about half of the payload).
// The full card, with its effect texts, comes from /api/cards/[id] when its detail is opened.
export async function GET(request: Request) {
  const grid = new URL(request.url).searchParams.get('fields') === 'grid'
  try {
    // From the shared in-memory catalogue (no database read per visit).
    const cards = await catalogCards(prisma)
    // Convertir les types pour respecter CardSummary
    const normalized: CardSummary[] = cards.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      type: c.type,
      color: c.color,
      cost: c.cost,
      power: c.power,
      counter: c.counter === null ? null : Number(c.counter),
      effect: grid ? undefined : c.effect,
      rarity: c.rarity,
      imageUrl: c.imageUrl,
      set: c.set,
      setCode: c.setCode ?? null,
      attribute: grid ? undefined : c.attribute,
      family: grid ? undefined : c.family,
      ability: grid ? undefined : c.ability,
      trigger: grid ? undefined : c.trigger,
      isParallel: c.isParallel,
      isAltArt: c.isAltArt,
      isSpecial: c.isSpecial,
    }))

    // In grid mode the rules texts were not selected: they are undefined here and left out of the JSON.
    // Public and identical for everyone: cached by the CDN, so most visits reach neither the server nor the database.
    return NextResponse.json(normalized, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' } })
  } catch (error) {
    console.error('Erreur GET /api/cards:', error)
    return NextResponse.json(
      { success: false, error: 'Échec de la récupération des cartes' },
      { status: 500 }
    )
  }
}
