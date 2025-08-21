import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

// Règles de génération des boosters par set
const GENERATION_RULES = {
  'OP-01': {
    rarityCounts: {
      'C': 8,
      'U': 3,
      'R': 2,
      'SR': 1,
      'L': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 8,
      'EVENT': 3,
      'STAGE': 1
    }
  },
  'OP-02': {
    rarityCounts: {
      'C': 8,
      'U': 3,
      'R': 2,
      'SR': 1,
      'L': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 8,
      'EVENT': 3,
      'STAGE': 1
    }
  },
  'DEFAULT': {
    rarityCounts: {
      'C': 8,
      'U': 3,
      'R': 2,
      'SR': 1,
      'L': 0,
      'P': 0
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 8,
      'EVENT': 3,
      'STAGE': 1
    }
  }
};

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer tous les sets disponibles
    const sets = await prisma.cardSet.findMany({
      select: {
        code: true,
        name: true,
        releaseDate: true,
        description: true,
        imageUrl: true
      },
      orderBy: {
        releaseDate: 'desc'
      }
    });

    // Ajouter les règles de génération à chaque set
    const setsWithRules = sets.map(set => ({
      ...set,
      rules: GENERATION_RULES[set.code as keyof typeof GENERATION_RULES] || GENERATION_RULES.DEFAULT
    }));

    return NextResponse.json(setsWithRules);
  } catch (error) {
    console.error('Erreur lors de la récupération des règles:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des règles' },
      { status: 500 }
    );
  }
} 