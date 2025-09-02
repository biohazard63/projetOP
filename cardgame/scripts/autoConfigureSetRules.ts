import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// Fonction pour compter les vraies raretés depuis la table Card
async function getRealRarityCounts(setCode: string): Promise<RarityCounts> {
  const rarityCounts = await prisma.card.groupBy({
    by: ['rarityName'],
    where: {
      setCode: setCode
    },
    _count: {
      rarityName: true
    }
  })

  const counts: RarityCounts = {
    C: 0, UC: 0, R: 0, SR: 0, L: 0, SEC: 0, 'SP CARD': 0, TR: 0, P: 0
  }
  
  rarityCounts.forEach(item => {
    if (item.rarityName) {
      const rarity = item.rarityName.toUpperCase()
      if (rarity in counts) {
        counts[rarity as keyof RarityCounts] = item._count.rarityName
      }
    }
  })
  
  return counts
}

// Fonction pour compter les vrais types depuis la table Card
async function getRealTypeCounts(setCode: string): Promise<TypeCounts> {
  const typeCounts = await prisma.card.groupBy({
    by: ['type'],
    where: {
      setCode: setCode
    },
    _count: {
      type: true
    }
  })

  const counts: TypeCounts = {
    CHARACTER: 0, LEADER: 0, EVENT: 0, STAGE: 0
  }
  
  typeCounts.forEach(item => {
    if (item.type) {
      const type = item.type.toUpperCase()
      
      // Normaliser les types français vers l'anglais
      let normalizedType = type
      if (type === 'PERSONNAGE') normalizedType = 'CHARACTER'
      if (type === 'ÉVÉNEMENTS') normalizedType = 'EVENT'
      if (type === 'LIEU') normalizedType = 'STAGE'
      
      if (normalizedType in counts) {
        const key = normalizedType as keyof TypeCounts
        counts[key] = (counts[key] || 0) + item._count.type
      }
    }
  })
  
  return counts
}

// Fonction pour générer les règles de booster
function generateBoosterRules(setCode: string, totalCards: number) {
  // Règles de base pour tous les sets
  return {
    donCount: 1,
    rareCount: 2,
    eventCount: 2,
    stageCount: 0,
    commonCount: 6,
    leaderCount: 0,
    altArtChance: 0.1,
    specialChance: 0.05,
    uncommonCount: 3,
    characterCount: 4,
    parallelChance: 0.05,
    superRareCount: 1
  }
}

// Types pour les règles des sets
interface RarityCounts {
  'C': number
  'UC': number
  'R': number
  'SR': number
  'L': number
  'SEC': number
  'SP CARD': number
  'TR': number
  'P': number
  [key: string]: number
}

interface TypeCounts {
  'CHARACTER'?: number
  'LEADER'?: number
  'EVENT'?: number
  'STAGE'?: number
  [key: string]: number | undefined
}

interface BoosterRules {
  commonCount: number
  uncommonCount: number
  rareCount: number
  superRareCount: number
  leaderCount: number
  characterCount: number
  eventCount: number
  stageCount: number
  donCount: number
  altArtChance: number
  parallelChance: number
  specialChance: number
  [key: string]: number
}

interface SetRule {
  name: string
  rarityCounts: RarityCounts
  typeCounts: TypeCounts
  boosterRules: BoosterRules
}

// Règles de base pour les boosters One Piece
const DEFAULT_BOOSTER_RULES = {
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

// Règles spéciales pour certains sets
const SPECIAL_SET_RULES: Record<string, SetRule> = {
  'OP10': {
    name: 'THE DREADNAUGHT RISE',
    rarityCounts: { 'C': 48, 'UC': 32, 'R': 35, 'SR': 24, 'L': 12, 'SEC': 6, 'SP CARD': 8, 'TR': 0, 'P': 0 },
    typeCounts: { 'CHARACTER': 130, 'LEADER': 12, 'EVENT': 20, 'STAGE': 3 },
    boosterRules: { ...DEFAULT_BOOSTER_RULES, altArtChance: 0.12, parallelChance: 0.06 }
  },
  'OP11': {
    name: 'THE DREADNAUGHT RISE 2',
    rarityCounts: { 'C': 48, 'UC': 32, 'R': 35, 'SR': 24, 'L': 12, 'SEC': 6, 'SP CARD': 8, 'TR': 0, 'P': 0 },
    typeCounts: { 'CHARACTER': 130, 'LEADER': 12, 'EVENT': 20, 'STAGE': 3 },
    boosterRules: { ...DEFAULT_BOOSTER_RULES, altArtChance: 0.12, parallelChance: 0.06 }
  },
  'EB01': {
    name: 'ONE PIECE FILM RED',
    rarityCounts: { 'C': 45, 'UC': 30, 'R': 32, 'SR': 20, 'L': 12, 'SEC': 4, 'SP CARD': 6, 'TR': 0, 'P': 0 },
    typeCounts: { 'CHARACTER': 115, 'LEADER': 12, 'EVENT': 18, 'STAGE': 2 },
    boosterRules: { ...DEFAULT_BOOSTER_RULES, altArtChance: 0.15, parallelChance: 0.08 }
  },
  'EB02': {
    name: 'ONE PIECE ANIME 25TH COLLECTION',
    rarityCounts: { 'C': 42, 'UC': 28, 'R': 30, 'SR': 18, 'L': 10, 'SEC': 3, 'SP CARD': 5, 'TR': 0, 'P': 0 },
    typeCounts: { 'CHARACTER': 110, 'LEADER': 10, 'EVENT': 16, 'STAGE': 2 },
    boosterRules: { ...DEFAULT_BOOSTER_RULES, altArtChance: 0.18, parallelChance: 0.1 }
  },
  'PRB01': {
    name: 'PREMIUM BOOSTER',
    rarityCounts: { 'C': 20, 'UC': 15, 'R': 25, 'SR': 15, 'L': 8, 'SEC': 3, 'SP CARD': 4, 'TR': 0, 'P': 0 },
    typeCounts: { 'CHARACTER': 60, 'LEADER': 8, 'EVENT': 12, 'STAGE': 2 },
    boosterRules: { commonCount: 4, uncommonCount: 2, rareCount: 3, superRareCount: 2, leaderCount: 1, characterCount: 3, eventCount: 1, stageCount: 0, donCount: 1, altArtChance: 0.25, parallelChance: 0.15, specialChance: 0.1 }
  }
}

async function autoConfigureSetRules() {
  try {
    console.log('🔍 Analyse automatique des sets dans la base de données...')
    
    // Récupérer tous les sets existants avec le nombre de cartes
    const existingSets = await prisma.cardSet.findMany({
      select: { 
        code: true, 
        name: true,
        _count: {
          select: { cards: true }
        }
      }
    })
    
    console.log(`📊 ${existingSets.length} sets trouvés dans la base de données`)
    
    // Récupérer les règles existantes
    const existingRules = await prisma.setRules.findMany({
      select: { code: true }
    })
    
    const existingRuleCodes = new Set(existingRules.map(r => r.code))
    console.log(`📋 ${existingRuleCodes.size} sets ont déjà des règles configurées`)
    
    // Analyser chaque set
    for (const set of existingSets) {
      const setCode = set.code.replace(/[-\s]/g, '').toUpperCase()
      const totalCards = set._count.cards
      
      if (existingRuleCodes.has(setCode)) {
        console.log(`🔄 ${setCode} (${set.name}) - Mise à jour des règles existantes (${totalCards} cartes)`)
      } else {
        console.log(`🆕 Configuration des règles pour ${setCode} (${set.name}) - ${totalCards} cartes`)
      }
      
      console.log(`🆕 Configuration des règles pour ${setCode} (${set.name}) - ${totalCards} cartes`)
      
      // Récupérer les vraies données de rareté et de type depuis la table Card
      const realRarityCounts = await getRealRarityCounts(set.code)
      const realTypeCounts = await getRealTypeCounts(set.code)
      
      // Vérifier s'il y a des règles spéciales pour ce set
      let setRules = SPECIAL_SET_RULES[setCode]
      
      if (!setRules) {
        // Utiliser les vraies données de la BDD
        setRules = {
          name: set.name,
          rarityCounts: realRarityCounts,
          typeCounts: realTypeCounts,
          boosterRules: generateBoosterRules(setCode, totalCards)
        }
      } else {
        // Mettre à jour avec les vraies données
        setRules = {
          ...setRules,
          rarityCounts: realRarityCounts,
          typeCounts: realTypeCounts
        }
      }
      
      // Sauvegarder les règles
      await prisma.setRules.upsert({
        where: { code: setCode },
        update: {
          name: setRules.name,
          rarityCounts: setRules.rarityCounts as unknown as Prisma.InputJsonValue,
          typeCounts: setRules.typeCounts as unknown as Prisma.InputJsonValue,
          boosterRules: setRules.boosterRules as unknown as Prisma.InputJsonValue,
          updatedAt: new Date()
        },
        create: {
          code: setCode,
          name: setRules.name,
          rarityCounts: setRules.rarityCounts as unknown as Prisma.InputJsonValue,
          typeCounts: setRules.typeCounts as unknown as Prisma.InputJsonValue,
          boosterRules: setRules.boosterRules as unknown as Prisma.InputJsonValue,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      console.log(`✅ Règles configurées pour ${setCode} (${totalCards} cartes)`)
    }
    
    console.log('\n🎉 Configuration automatique terminée avec succès !')
    
    // Afficher un résumé
    const finalRules = await prisma.setRules.findMany()
    console.log(`\n📊 Résumé final: ${finalRules.length} sets avec des règles configurées`)
    
    const opSets = finalRules.filter(r => r.code.startsWith('OP')).length
    const ebSets = finalRules.filter(r => r.code.startsWith('EB')).length
    const prbSets = finalRules.filter(r => r.code.startsWith('PRB')).length
    const stSets = finalRules.filter(r => r.code.startsWith('ST')).length
    
    console.log(`   - OP: ${opSets} sets`)
    console.log(`   - EB: ${ebSets} sets`)
    console.log(`   - PRB: ${prbSets} sets`)
    console.log(`   - ST: ${stSets} sets`)
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration automatique:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Fonction pour mettre à jour les règles spéciales avec le nombre réel de cartes
function updateSpecialRulesWithRealCount(setRules: SetRule, totalCards: number): SetRule {
  const currentTotal = Object.values(setRules.rarityCounts).reduce((sum, count) => sum + count, 0)
  
  if (currentTotal === totalCards) {
    return setRules // Pas de changement nécessaire
  }
  
  // Ajuster les raretés pour correspondre au nombre réel de cartes
  const ratio = totalCards / currentTotal
  const adjustedRarityCounts: RarityCounts = { ...setRules.rarityCounts }
  
  // Ajuster chaque rareté proportionnellement
  Object.keys(adjustedRarityCounts).forEach(key => {
    if (key !== 'P' && key !== 'TR') { // Ne pas ajuster les raretés spéciales
      adjustedRarityCounts[key as keyof RarityCounts] = Math.round(adjustedRarityCounts[key as keyof RarityCounts] * ratio)
    }
  })
  
  // Ajuster aussi les types proportionnellement
  const currentTypeTotal = Object.values(setRules.typeCounts).reduce((sum: number, count) => sum + (count || 0), 0)
  const typeRatio = currentTypeTotal > 0 ? totalCards / currentTypeTotal : 1
  const adjustedTypeCounts: TypeCounts = { ...setRules.typeCounts }
  
  Object.keys(adjustedTypeCounts).forEach(key => {
    const currentCount = adjustedTypeCounts[key as keyof TypeCounts]
    if (currentCount !== undefined && currentCount > 0) {
      adjustedTypeCounts[key as keyof TypeCounts] = Math.round(currentCount * typeRatio)
    }
  })
  
  return {
    ...setRules,
    rarityCounts: adjustedRarityCounts,
    typeCounts: adjustedTypeCounts
  }
}

function generateAutomaticRules(setCode: string, setName: string, totalCards: number): SetRule {
  // Règles par défaut basées sur le type de set et le nombre réel de cartes
  if (setCode.startsWith('OP')) {
    // Sets One Piece principaux - distribution basée sur le nombre réel
    const distribution = calculateRarityDistribution(totalCards, 'OP')
    return {
      name: setName || `ONE PIECE SET ${setCode}`,
      rarityCounts: distribution.rarityCounts,
      typeCounts: distribution.typeCounts,
      boosterRules: { ...DEFAULT_BOOSTER_RULES }
    }
  } else if (setCode.startsWith('EB')) {
    // Sets événementiels - distribution basée sur le nombre réel
    const distribution = calculateRarityDistribution(totalCards, 'EB')
    return {
      name: setName || `EVENT SET ${setCode}`,
      rarityCounts: distribution.rarityCounts,
      typeCounts: distribution.typeCounts,
      boosterRules: { ...DEFAULT_BOOSTER_RULES, altArtChance: 0.15, parallelChance: 0.08 }
    }
  } else if (setCode.startsWith('PRB')) {
    // Sets premium - distribution basée sur le nombre réel
    const distribution = calculateRarityDistribution(totalCards, 'PRB')
    return {
      name: setName || `PREMIUM SET ${setCode}`,
      rarityCounts: distribution.rarityCounts,
      typeCounts: distribution.typeCounts,
      boosterRules: { commonCount: 4, uncommonCount: 2, rareCount: 3, superRareCount: 2, leaderCount: 1, characterCount: 3, eventCount: 1, stageCount: 0, donCount: 1, altArtChance: 0.25, parallelChance: 0.15, specialChance: 0.1 }
    }
  } else if (setCode.startsWith('ST')) {
    // Sets starter - distribution basée sur le nombre réel
    const distribution = calculateRarityDistribution(totalCards, 'ST')
    return {
      name: setName || `STARTER SET ${setCode}`,
      rarityCounts: distribution.rarityCounts,
      typeCounts: distribution.typeCounts,
      boosterRules: { commonCount: 10, uncommonCount: 0, rareCount: 0, superRareCount: 1, leaderCount: 1, characterCount: 8, eventCount: 2, stageCount: 1, donCount: 0, altArtChance: 0, parallelChance: 0, specialChance: 0 }
    }
  } else {
    // Sets inconnus - distribution basée sur le nombre réel
    const distribution = calculateRarityDistribution(totalCards, 'DEFAULT')
    return {
      name: setName || `SET ${setCode}`,
      rarityCounts: distribution.rarityCounts,
      typeCounts: distribution.typeCounts,
      boosterRules: { ...DEFAULT_BOOSTER_RULES }
    }
  }
}

// Fonction pour calculer la distribution des raretés basée sur le nombre réel de cartes
function calculateRarityDistribution(totalCards: number, setType: 'OP' | 'EB' | 'PRB' | 'ST' | 'DEFAULT') {
  let rarityPercentages: Record<string, number>
  let typePercentages: Record<string, number>
  
  switch (setType) {
    case 'OP':
      rarityPercentages = { 'C': 0.35, 'UC': 0.25, 'R': 0.20, 'SR': 0.12, 'L': 0.05, 'SEC': 0.02, 'SP CARD': 0.01, 'TR': 0, 'P': 0 }
      typePercentages = { 'CHARACTER': 0.75, 'LEADER': 0.08, 'EVENT': 0.12, 'STAGE': 0.05 }
      break
    case 'EB':
      rarityPercentages = { 'C': 0.40, 'UC': 0.25, 'R': 0.20, 'SR': 0.10, 'L': 0.03, 'SEC': 0.01, 'SP CARD': 0.01, 'TR': 0, 'P': 0 }
      typePercentages = { 'CHARACTER': 0.80, 'LEADER': 0.08, 'EVENT': 0.10, 'STAGE': 0.02 }
      break
    case 'PRB':
      rarityPercentages = { 'C': 0.25, 'UC': 0.20, 'R': 0.30, 'SR': 0.20, 'L': 0.03, 'SEC': 0.01, 'SP CARD': 0.01, 'TR': 0, 'P': 0 }
      typePercentages = { 'CHARACTER': 0.70, 'LEADER': 0.10, 'EVENT': 0.15, 'STAGE': 0.05 }
      break
    case 'ST':
      rarityPercentages = { 'C': 0.70, 'UC': 0.10, 'R': 0.10, 'SR': 0.08, 'L': 0.02, 'SEC': 0, 'SP CARD': 0, 'TR': 0, 'P': 0 }
      typePercentages = { 'CHARACTER': 0.80, 'LEADER': 0.10, 'EVENT': 0.08, 'STAGE': 0.02 }
      break
    default:
      rarityPercentages = { 'C': 0.35, 'UC': 0.25, 'R': 0.25, 'SR': 0.12, 'L': 0.02, 'SEC': 0.01, 'SP CARD': 0, 'TR': 0, 'P': 0 }
      typePercentages = { 'CHARACTER': 0.75, 'LEADER': 0.08, 'EVENT': 0.12, 'STAGE': 0.05 }
  }
  
  // Calculer les nombres de cartes pour chaque rareté
  const rarityCounts: RarityCounts = {} as RarityCounts
  Object.entries(rarityPercentages).forEach(([rarity, percentage]) => {
    rarityCounts[rarity as keyof RarityCounts] = Math.round(totalCards * percentage)
  })
  
  // Calculer les nombres de cartes pour chaque type
  const typeCounts: TypeCounts = {} as TypeCounts
  Object.entries(typePercentages).forEach(([type, percentage]) => {
    typeCounts[type as keyof TypeCounts] = Math.round(totalCards * percentage)
  })
  
  return { rarityCounts, typeCounts }
}

// Exécuter le script
autoConfigureSetRules()
