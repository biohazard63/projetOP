import { NextResponse } from 'next/server';
import { PrismaClient, Card } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// Règles de génération des boosters par set
const GENERATION_RULES = {
  'OP-01': {
    rarityCounts: {
      'C': 4,    // Positions 1-4
      'UC': 3,   // Positions 5-7
      'R': 2,    // Positions 8-9
      'SR': 1,   // Position 10 (possible)
      'SEC': 1,  // Position 10 (possible)
      'SP CARD': 1, // Position 10 (possible)
      'TR': 1,   // Position 10 (possible)
      'L': 1,    // Position 10 (possible)
      'P': 0     // Les cartes promo ne sont pas dans les boosters
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
      'C': 4,    // Positions 1-4
      'UC': 3,   // Positions 5-7
      'R': 2,    // Positions 8-9
      'SR': 1,   // Position 10 (possible)
      'SEC': 1,  // Position 10 (possible)
      'SP CARD': 1, // Position 10 (possible)
      'TR': 1,   // Position 10 (possible)
      'L': 1,    // Position 10 (possible)
      'P': 0     // Les cartes promo ne sont pas dans les boosters
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
      'C': 4,    // Positions 1-4
      'UC': 3,   // Positions 5-7
      'R': 2,    // Positions 8-9
      'SR': 1,   // Position 10 (possible)
      'SEC': 1,  // Position 10 (possible)
      'SP CARD': 1, // Position 10 (possible)
      'TR': 1,   // Position 10 (possible)
      'L': 1,    // Position 10 (possible)
      'P': 0     // Les cartes promo ne sont pas dans les boosters
    },
    typeCounts: {
      'LEADER': 1,
      'CHARACTER': 8,
      'EVENT': 3,
      'STAGE': 1
    }
  }
};

// Fonction pour mélanger un tableau
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Fonction pour sélectionner une carte selon sa position
async function selectCardByPosition(position: number, setCode: string): Promise<Card | null> {
  let rarity;
  
  // Déterminer la rareté en fonction de la position
  if (position <= 4) {
    rarity = 'C';
  } else if (position <= 7) {
    rarity = 'UC';
  } else if (position <= 9) {
    // Pour les positions 8-9, on peut avoir R, SR, SEC, SP CARD ou TR
    const rarities = ['R', 'SR', 'SEC', 'SP CARD', 'TR'];
    rarity = rarities[Math.floor(Math.random() * rarities.length)];
  } else {
    // Position 10 : possible extra (Leader, SEC, SP CARD, TR ou alternative art)
    const rarities = ['R', 'SR', 'SEC', 'SP CARD', 'TR', 'L'];
    rarity = rarities[Math.floor(Math.random() * rarities.length)];
  }

  const cards = await prisma.card.findMany({
    where: {
      setCode: setCode,
      rarity: rarity,
      isParallel: false,
      isAltArt: position === 10 ? Math.random() < 0.1 : false // 10% de chance d'avoir une alt art à la position 10
    }
  });

  if (cards.length === 0) return null;
  return cards[Math.floor(Math.random() * cards.length)];
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { setCode } = await request.json();
    if (!setCode) {
      return NextResponse.json({ error: 'Code du set requis' }, { status: 400 });
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Récupérer les règles pour le set
    const rules = GENERATION_RULES[setCode as keyof typeof GENERATION_RULES] || GENERATION_RULES.DEFAULT;

    // Récupérer toutes les cartes du set
    const cards = await prisma.card.findMany({
      where: {
        setCode: setCode
      }
    });

    // Grouper les cartes par rareté
    const cardsByRarity = cards.reduce((acc, card) => {
      if (!acc[card.rarity]) {
        acc[card.rarity] = [];
      }
      acc[card.rarity].push(card);
      return acc;
    }, {} as Record<string, typeof cards>);

    // Sélectionner les cartes selon les règles
    const selectedCards = [];
    for (let i = 1; i <= 10; i++) {
      const card = await selectCardByPosition(i, setCode);
      if (card) {
        selectedCards.push(card);
      }
    }

    // Mélanger les cartes sélectionnées
    const shuffledCards = shuffleArray(selectedCards);

    // Créer d'abord le booster
    const booster = await prisma.booster.create({
      data: {
        name: `Booster ${setCode}`,
        description: `Booster du set ${setCode}`,
        price: 0,
        setCode: setCode
      }
    });

    // Créer l'ouverture de booster
    const boosterOpening = await prisma.boosterOpening.create({
      data: {
        userId: user.id,
        boosterId: booster.id
      }
    });

    // Ajouter les cartes à l'ouverture du booster
    await Promise.all(
      shuffledCards.map((card, index) =>
        prisma.boosterOpeningCard.create({
          data: {
            boosterOpeningId: boosterOpening.id,
            cardId: card.id,
            position: index + 1
          }
        })
      )
    );

    // Retourner les cartes avec leurs détails
    return NextResponse.json({
      cards: shuffledCards.map(card => ({
        ...card,
        position: shuffledCards.indexOf(card) + 1
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la génération du booster:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du booster' },
      { status: 500 }
    );
  }
} 