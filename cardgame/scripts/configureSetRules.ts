import { PrismaClient, Prisma } from '@prisma/client'

type BoosterRules = {
  commonCount: number;
  uncommonCount: number;
  rareCount: number;
  superRareCount: number;
  leaderCount: number;
  characterCount: number;
  eventCount: number;
  stageCount: number;
  donCount: number;
  altArtChance: number;
  parallelChance: number;
  specialChance: number;
}

type RarityCounts = {
  [key: string]: number;
}

type TypeCounts = {
  [key: string]: number;
}

export interface SetRule {
  name: string;
  releaseDate?: Date;
  rarityCounts: {
    'C': number;
    'UC': number;
    'R': number;
    'SR': number;
    'L': number;
    'SEC': number;
    'SP CARD': number;
    'TR': number;
    'P': number;
  };
  typeCounts: {
    'CHARACTER'?: number;
    'LEADER'?: number;
    'EVENT'?: number;
    'STAGE'?: number;
  };
  boosterRules?: {
    commonCount: number;
    uncommonCount: number;
    rareCount: number;
    superRareCount: number;
    leaderCount: number;
    characterCount: number;
    eventCount: number;
    stageCount: number;
    donCount: number;
    altArtChance: number;
    parallelChance: number;
    specialChance: number;
  };
}

const prisma = new PrismaClient()

export const SET_RULES: Record<string, SetRule> = {
  'OP01': {
    name: 'ROMANCE DAWN',
    rarityCounts: {
      'C': 49,
      'UC': 32,
      'R': 32,
      'SR': 20,
      'L': 16,
      'SEC': 5,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'CHARACTER': 118,
      'LEADER': 16,
      'EVENT': 20
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
  },
  'OP02': {
    name: 'PARAMOUNT WAR',
    rarityCounts: {
      'C': 47,
      'UC': 34,
      'R': 32,
      'SR': 21,
      'L': 16,
      'SEC': 4,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'CHARACTER': 118,
      'LEADER': 16,
      'EVENT': 16,
      'STAGE': 4
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
  },
  'OP03': {
    name: 'PILLARS OF STRENGTH',
    rarityCounts: {
      'C': 45,
      'UC': 32,
      'R': 32,
      'SR': 20,
      'L': 16,
      'SEC': 5,
      'SP CARD': 4,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'CHARACTER': 111,
      'LEADER': 16,
      'EVENT': 24,
      'STAGE': 3
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
  },
  'OP04': {
    name: 'KINGDOMS OF INTRIGUE',
    rarityCounts: {
      'C': 45,
      'UC': 30,
      'R': 32,
      'SR': 21,
      'L': 12,
      'SEC': 4,
      'SP CARD': 5,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'CHARACTER': 117,
      'LEADER': 12,
      'EVENT': 19,
      'STAGE': 1
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
  },
  'OP05': {
    name: 'OP-05',
    rarityCounts: {
      'C': 45,
      'UC': 30,
      'R': 32,
      'SR': 24,
      'L': 12,
      'SEC': 5,
      'SP CARD': 6,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'CHARACTER': 120,
      'LEADER': 12,
      'EVENT': 18,
      'STAGE': 4
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
  },
  'OP06': {
    name: 'WINGS OF THE CAPTAIN',
    rarityCounts: {
      'C': 45,
      'UC': 30,
      'R': 32,
      'SR': 20,
      'L': 12,
      'SEC': 5,
      'SP CARD': 6,
      'TR': 1,
      'P': 0
    },
    typeCounts: {
      'CHARACTER': 118,
      'LEADER': 12,
      'EVENT': 17,
      'STAGE': 4
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
  },
  'OP07': {
    name: '500 YEARS IN THE FUTURE',
    rarityCounts: {
      'C': 45,
      'UC': 30,
      'R': 32,
      'SR': 21,
      'L': 12,
      'SEC': 4,
      'SP CARD': 6,
      'TR': 1,
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
  },
  'OP08': {
    name: 'TWO LEGENDS',
    rarityCounts: {
      'C': 45,
      'UC': 30,
      'R': 32,
      'SR': 21,
      'L': 12,
      'SEC': 5,
      'SP CARD': 6,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'CHARACTER': 117,
      'LEADER': 12,
      'EVENT': 19,
      'STAGE': 3
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
  },
  'OP09': {
    name: 'EMPERORS IN THE NEW WORLD',
    rarityCounts: {
      'C': 45,
      'UC': 30,
      'R': 33,
      'SR': 23,
      'L': 12,
      'SEC': 6,
      'SP CARD': 10,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'CHARACTER': 125,
      'LEADER': 12,
      'EVENT': 18,
      'STAGE': 4
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
  },
  'OP12': {
    name: 'THE NEW ERA',
    rarityCounts: {
      'C': 48,
      'UC': 32,
      'R': 35,
      'SR': 24,
      'L': 12,
      'SEC': 6,
      'SP CARD': 8,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'CHARACTER': 130,
      'LEADER': 12,
      'EVENT': 20,
      'STAGE': 3
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
      altArtChance: 0.12,
      parallelChance: 0.06,
      specialChance: 0.05
    }
  },
  'ST01': {
    name: 'Straw Hat Crew',
    rarityCounts: {
      'C': 14,
      'UC': 0,
      'R': 0,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 12,
      'EVENT': 3,
      'STAGE': 1
    },
    boosterRules: {
      commonCount: 10,
      uncommonCount: 0,
      rareCount: 0,
      superRareCount: 1,
      leaderCount: 1,
      characterCount: 8,
      eventCount: 2,
      stageCount: 1,
      donCount: 0,
      altArtChance: 0,
      parallelChance: 0,
      specialChance: 0
    }
  },
  'ST02': {
    name: 'Worst Generation',
    rarityCounts: {
      'C': 14,
      'UC': 0,
      'R': 0,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 13,
      'EVENT': 3
    },
    boosterRules: {
      commonCount: 10,
      uncommonCount: 0,
      rareCount: 0,
      superRareCount: 1,
      leaderCount: 1,
      characterCount: 8,
      eventCount: 2,
      stageCount: 0,
      donCount: 0,
      altArtChance: 0,
      parallelChance: 0,
      specialChance: 0
    }
  },
  'ST03': {
    name: 'The Seven Warlords of the Sea',
    rarityCounts: {
      'C': 14,
      'UC': 0,
      'R': 0,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 13,
      'EVENT': 3
    },
    boosterRules: {
      commonCount: 10,
      uncommonCount: 0,
      rareCount: 0,
      superRareCount: 1,
      leaderCount: 1,
      characterCount: 8,
      eventCount: 2,
      stageCount: 0,
      donCount: 0,
      altArtChance: 0,
      parallelChance: 0,
      specialChance: 0
    }
  },
  'ST04': {
    name: 'Animal Kingdom Pirates',
    rarityCounts: {
      'C': 14,
      'UC': 0,
      'R': 0,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 13,
      'EVENT': 3
    },
    boosterRules: {
      commonCount: 10,
      uncommonCount: 0,
      rareCount: 0,
      superRareCount: 1,
      leaderCount: 1,
      characterCount: 8,
      eventCount: 2,
      stageCount: 0,
      donCount: 0,
      altArtChance: 0,
      parallelChance: 0,
      specialChance: 0
    }
  },
  'ST05': {
    name: 'ONE PIECE FILM edition',
    rarityCounts: {
      'C': 14,
      'UC': 0,
      'R': 0,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 14,
      'EVENT': 2
    }
  },
  'ST06': {
    name: 'Absolute Justice',
    rarityCounts: {
      'C': 14,
      'UC': 0,
      'R': 0,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 12,
      'EVENT': 3,
      'STAGE': 1
    }
  },
  'ST07': {
    name: 'Big Mom Pirates',
    rarityCounts: {
      'C': 14,
      'UC': 0,
      'R': 0,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 13,
      'EVENT': 2,
      'STAGE': 1
    }
  },
  'ST08': {
    name: 'Monkey D. Luffy',
    rarityCounts: {
      'C': 12,
      'UC': 0,
      'R': 0,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 12,
      'EVENT': 2
    }
  },
  'ST09': {
    name: 'Yamato',
    rarityCounts: {
      'C': 12,
      'UC': 0,
      'R': 0,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 12,
      'EVENT': 2
    }
  },
  'ST10': {
    name: 'The Three Captains',
    rarityCounts: {
      'C': 11,
      'UC': 0,
      'R': 1,
      'SR': 4,
      'L': 3,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 3,
      'CHARACTER': 13,
      'EVENT': 3
    }
  },
  'ST11': {
    name: 'Uta',
    rarityCounts: {
      'C': 8,
      'UC': 2,
      'R': 2,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 10,
      'EVENT': 4
    }
  },
  'ST12': {
    name: 'Zoro & Sanji',
    rarityCounts: {
      'C': 14,
      'UC': 0,
      'R': 0,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 14,
      'EVENT': 2
    }
  },
  'ST13': {
    name: 'The Three Brothers',
    rarityCounts: {
      'C': 19,
      'UC': 0,
      'R': 2,
      'SR': 8,
      'L': 6,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 6,
      'CHARACTER': 26,
      'EVENT': 3
    }
  },
  'ST14': {
    name: '3D2Y',
    rarityCounts: {
      'C': 14,
      'UC': 0,
      'R': 0,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 12,
      'EVENT': 3,
      'STAGE': 1
    }
  },
  'ST15': {
    name: 'Red Edward.Newgate',
    rarityCounts: {
      'C': 8,
      'UC': 1,
      'R': 3,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 13,
      'EVENT': 1
    }
  },
  'ST16': {
    name: 'Green Uta',
    rarityCounts: {
      'C': 5,
      'UC': 0,
      'R': 0,
      'SR': 3,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 6
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 7,
      'EVENT': 7
    }
  },
  'ST17': {
    name: 'Blue Donquixote Doflamingo',
    rarityCounts: {
      'C': 8,
      'UC': 1,
      'R': 2,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 1
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 13,
      'EVENT': 1
    }
  },
  'ST18': {
    name: 'Purple Monkey.D.Luffy',
    rarityCounts: {
      'C': 7,
      'UC': 2,
      'R': 2,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 1
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 13,
      'EVENT': 1
    }
  },
  'ST19': {
    name: 'Black Smoker',
    rarityCounts: {
      'C': 6,
      'UC': 4,
      'R': 2,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 13,
      'EVENT': 1
    }
  },
  'ST20': {
    name: 'Yellow Charlotte Katakuri',
    rarityCounts: {
      'C': 8,
      'UC': 1,
      'R': 3,
      'SR': 2,
      'L': 1,
      'SEC': 0,
      'SP CARD': 0,
      'TR': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 12,
      'EVENT': 2
    }
  }
}

async function configureSetRules() {
  try {
    console.log('Configuration des règles des sets...')

    for (const [code, rules] of Object.entries(SET_RULES)) {
      const defaultBoosterRules = {
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

      const setData = {
        name: rules.name,
        rarityCounts: rules.rarityCounts,
        typeCounts: rules.typeCounts,
        boosterRules: rules.boosterRules || defaultBoosterRules
      }

      await prisma.setRules.upsert({
        where: { code },
        update: {
          ...setData,
          updatedAt: new Date()
        },
        create: {
          code,
          name: setData.name,
          rarityCounts: setData.rarityCounts as any,
          typeCounts: setData.typeCounts as any,
          boosterRules: (setData.boosterRules || {}) as any,
          updatedAt: new Date()
        }
      })
      console.log(`Règles configurées pour le set ${code}`)
    }

    console.log('Configuration terminée avec succès !')
  } catch (error) {
    console.error('Erreur lors de la configuration des règles:', error)
  } finally {
    await prisma.$disconnect()
  }
}

configureSetRules()