export type RarityLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface CardRarityConfig {
  level: RarityLevel
  name: string
  description: string
  probability: number
  types: string[]
  isAlternative?: boolean
}

export const RARITY_LEVELS: Record<string, CardRarityConfig> = {
  COMMON: {
    level: 1,
    name: 'Communes',
    description: 'Très faciles à obtenir',
    probability: 0.40,
    types: ['CHARACTER', 'EVENT', 'STAGE']
  },
  UNCOMMON: {
    level: 2,
    name: 'Peu communes',
    description: 'Présentes en quantité',
    probability: 0.25,
    types: ['CHARACTER', 'EVENT']
  },
  RARE: {
    level: 3,
    name: 'Rares',
    description: 'Un peu plus rares, mais fréquentes dans les boosters',
    probability: 0.15,
    types: ['CHARACTER', 'EVENT', 'STAGE', 'LEADER']
  },
  SUPER_RARE: {
    level: 4,
    name: 'Super Rares',
    description: 'Peuvent ne sortir qu\'une par booster',
    probability: 0.10,
    types: ['CHARACTER', 'EVENT', 'STAGE', 'LEADER']
  },
  LEGENDARY: {
    level: 5,
    name: 'Légendaires',
    description: 'Très rares dans les boosters standards',
    probability: 0.05,
    types: ['LEADER']
  },
  PROMOTIONAL: {
    level: 6,
    name: 'Promotionnelles',
    description: 'Distribuées hors booster',
    probability: 0.03,
    types: ['CHARACTER', 'EVENT', 'STAGE', 'LEADER']
  },
  SECRET: {
    level: 7,
    name: 'Secrets',
    description: 'Très rares, probabilité très basse',
    probability: 0.02,
    types: ['CHARACTER', 'EVENT', 'STAGE', 'LEADER']
  }
}

export function getCardRarityLevel(card: {
  rarity: string
  type: string
  id: string
}): CardRarityConfig {
  const isAlternative = card.id.includes('_p')
  
  // Ajustement des probabilités pour les cartes alternatives
  const alternativeMultiplier = isAlternative ? 0.5 : 1

  switch (card.rarity) {
    case 'C':
      return {
        ...RARITY_LEVELS.COMMON,
        probability: RARITY_LEVELS.COMMON.probability * alternativeMultiplier
      }
    case 'UC':
      return {
        ...RARITY_LEVELS.UNCOMMON,
        probability: RARITY_LEVELS.UNCOMMON.probability * alternativeMultiplier
      }
    case 'R':
      return {
        ...RARITY_LEVELS.RARE,
        probability: RARITY_LEVELS.RARE.probability * alternativeMultiplier
      }
    case 'SR':
      return {
        ...RARITY_LEVELS.SUPER_RARE,
        probability: RARITY_LEVELS.SUPER_RARE.probability * alternativeMultiplier
      }
    case 'L':
      return {
        ...RARITY_LEVELS.LEGENDARY,
        probability: RARITY_LEVELS.LEGENDARY.probability * alternativeMultiplier
      }
    case 'P':
      return {
        ...RARITY_LEVELS.PROMOTIONAL,
        probability: RARITY_LEVELS.PROMOTIONAL.probability * alternativeMultiplier
      }
    case 'SEC':
      return {
        ...RARITY_LEVELS.SECRET,
        probability: RARITY_LEVELS.SECRET.probability * alternativeMultiplier
      }
    default:
      return RARITY_LEVELS.COMMON
  }
} 