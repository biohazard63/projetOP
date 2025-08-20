import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Cache en mémoire pour stocker les cartes
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
  attribute: string | null
  family: string | null
  ability: string | null
  trigger: string | null
  isParallel: boolean | null
  isAltArt: boolean | null
  isSpecial: boolean | null
}
let cachedCards: CardSummary[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 heures en millisecondes

export async function GET() {
  try {
    const now = Date.now()
    if (cachedCards && now - lastFetchTime < CACHE_DURATION) {
      return NextResponse.json(cachedCards)
    }

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
        effect: true,
        rarity: true,
        imageUrl: true,
        set: true,
        attribute: true,
        family: true,
        ability: true,
        trigger: true,
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
      attribute: c.attribute,
      family: c.family,
      ability: c.ability,
      trigger: c.trigger,
      isParallel: c.isParallel,
      isAltArt: c.isAltArt,
      isSpecial: c.isSpecial,
    }))

    cachedCards = normalized
    lastFetchTime = now

    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Erreur GET /api/cards:', error)
    return NextResponse.json(
      { success: false, error: 'Échec de la récupération des cartes' },
      { status: 500 }
    )
  }
} 