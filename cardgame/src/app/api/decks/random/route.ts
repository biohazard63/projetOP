import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Récupérer toutes les cartes disponibles
    const allCards = await prisma.card.findMany()
    
    // Mélanger les cartes
    const shuffledCards = [...allCards].sort(() => Math.random() - 0.5)
    
    // Sélectionner 50 cartes pour le deck
    const deckCards = shuffledCards.slice(0, 50)
    
    // S'assurer qu'il y a un leader dans le deck
    const hasLeader = deckCards.some(card => card.type === 'LEADER')
    
    if (!hasLeader) {
      // Si pas de leader, en ajouter un
      const leaders = allCards.filter(card => card.type === 'LEADER')
      const randomLeader = leaders[Math.floor(Math.random() * leaders.length)]
      deckCards[0] = randomLeader
    }
    
    return NextResponse.json({ deck: deckCards })
  } catch (error) {
    console.error('Erreur lors de la génération du deck aléatoire:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 