import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
  effect: string | null
  rarity: string
  imageUrl: string
  set: string | null
  setCode?: string | null
  attribute: string | null
  family: string | null
  ability: string | null
  trigger: string | null
  isParallel: boolean | null
  isAltArt: boolean | null
  isSpecial: boolean | null
}
// ?fields=grid: the collection grid only needs what a tile shows (no rules text: about half of the payload).
// The full card, with its effect texts, comes from /api/cards/[id] when its detail is opened.
export async function GET(request: Request) {
  const grid = new URL(request.url).searchParams.get('fields') === 'grid'
  try {
    const cards = await prisma.card.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        color: true,
        cost: true,
        power: true,
        // Prisma stocke counter en string, on va le convertir ensuite en number|null
        counter: true,
        effect: !grid,
        rarity: true,
        imageUrl: true,
        set: true,
        setCode: true,
        attribute: !grid,
        family: !grid,
        ability: !grid,
        trigger: !grid,
        isParallel: true,
        isAltArt: true,
        isSpecial: true
      }
    })

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
      effect: c.effect,
      rarity: c.rarity,
      imageUrl: c.imageUrl,
      set: c.set,
      setCode: c.setCode ?? null,
      attribute: c.attribute,
      family: c.family,
      ability: c.ability,
      trigger: c.trigger,
      isParallel: c.isParallel,
      isAltArt: c.isAltArt,
      isSpecial: c.isSpecial,
    }))

    // In grid mode the rules texts were not selected: they are undefined here and left out of the JSON.
    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Erreur GET /api/cards:', error)
    return NextResponse.json(
      { success: false, error: 'Échec de la récupération des cartes' },
      { status: 500 }
    )
  }
}
