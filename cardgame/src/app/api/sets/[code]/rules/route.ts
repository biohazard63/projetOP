import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code
    console.log('Code du set reçu:', code)
    
    if (!code) {
      console.log('Code du set manquant')
      return NextResponse.json({ 
        success: false, 
        error: 'Code du set manquant' 
      }, { status: 400 })
    }

    // Normaliser le code du set
    const normalizedCode = code.replace(/[-\s]/g, '').toUpperCase()
    console.log('Code du set normalisé:', normalizedCode)

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
  } catch (error) {
    console.error('Erreur lors de la récupération des règles du set:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, { status: 500 })
  }
} 