import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    
    console.log('Code du set reçu:', code, 'Type:', type)
    
    if (!code) {
      return NextResponse.json({ 
        success: false, 
        error: 'Code du set manquant' 
      }, { status: 400 })
    }

    // Normaliser le code du set
    const normalizedCode = code.replace(/[-\s]/g, '').toUpperCase()
    console.log('Code du set normalisé:', normalizedCode)

    // Si on demande les règles
    if (type === 'rules') {
      // Récupérer les règles du set
      const setRules = await prisma.setRules.findFirst({
        where: {
          OR: [
            { code: normalizedCode },
            { code: { contains: normalizedCode } }
          ]
        }
      })
      console.log('Règles trouvées:', setRules)

      if (!setRules) {
        console.log('Règles non trouvées pour le code:', normalizedCode)
        // Si les règles n'existent pas, on utilise des règles par défaut
        const defaultRules = {
          name: code,
          rarityCounts: {
            'C': 45,
            'UC': 30,
            'R': 32,
            'SR': 21,
            'L': 12,
            'SEC': 4,
            'SP CARD': 6,
            'TR': 0,
            'P': 0
          },
          typeCounts: {
            'CHARACTER': 118,
            'LEADER': 12,
            'EVENT': 19,
            'STAGE': 2
          },
          boosterRules: {
            commonCount: 6,
            uncommonCount: 3,
            rareCount: 2,
            superRareCount: 1,
            leaderCount: 0,
            characterCount: 4,
            eventCount: 2,
            stageCount: 0,
            donCount: 1,
            altArtChance: 0.1,
            parallelChance: 0.05,
            specialChance: 0.05
          }
        }

        return NextResponse.json({
          success: true,
          rules: defaultRules
        })
      }

      return NextResponse.json({
        success: true,
        rules: {
          name: setRules.name,
          rarityCounts: setRules.rarityCounts,
          typeCounts: setRules.typeCounts,
          boosterRules: setRules.boosterRules
        }
      })
    }

    // Si on demande les cartes
    if (type === 'cards') {
      const API_KEY = process.env.OPTTCG_API_KEY || ''
      if (!API_KEY) {
        return NextResponse.json({ success: false, error: 'Clé API manquante' }, { status: 500 })
      }
      
      // Récupérer tous les sets
      const setsResponse = await fetch('https://apitcg.com/api/one-piece/sets', {
        headers: {
          'X-Api-Key': API_KEY
        }
      });
      const setsData = await setsResponse.json();
      
      // Récupérer les cartes du set spécifique
      const cardsResponse = await fetch(`https://apitcg.com/api/one-piece/cards?q=set.id:${code}`, {
        headers: {
          'X-Api-Key': API_KEY
        }
      });
      const cardsData = await cardsResponse.json();

      if (!cardsData.data) {
        throw new Error('Aucune donnée reçue de l\'API')
      }

      const cards = cardsData.data.map((card: any) => ({
        id: card.id,
        name: card.name,
        number: card.number,
        rarity: card.rarity,
        images: {
          small: card.images.small,
          large: card.images.large
        },
        set: {
          id: card.set.id,
          name: card.set.name,
          series: card.set.series
        }
      }))

      return NextResponse.json({ 
        success: true, 
        totalSets: setsData.data.length,
        sets: setsData.data,
        cards 
      })
    }

    // Récupérer les informations du set
    const set = await prisma.cardSet.findFirst({
      where: {
        OR: [
          { code: normalizedCode },
          { code: { contains: normalizedCode } }
        ]
      }
    })

    if (!set) {
      return NextResponse.json({ 
        success: false, 
        error: 'Set non trouvé' 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      set
    })
  } catch (error) {
    console.error('Erreur lors de la récupération du set:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, { status: 500 })
  }
} 