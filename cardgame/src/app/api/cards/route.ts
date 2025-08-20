import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Cache en mémoire pour stocker les cartes
let cachedCards: any[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 heures en millisecondes

export async function GET() {
  const startTime = Date.now()
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

    cachedCards = cards
    lastFetchTime = now

    return NextResponse.json(cards)
  } catch (error) {
    console.error('Erreur GET /api/cards:', error)
    return NextResponse.json(
      { success: false, error: 'Échec de la récupération des cartes' },
      { status: 500 }
    )
  }
} 