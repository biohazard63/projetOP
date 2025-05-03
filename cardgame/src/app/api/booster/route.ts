import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Card } from '@/types/card';

const prisma = new PrismaClient();

// Type pour les règles de génération de booster
type BoosterGenerationRules = {
  [setCode: string]: {
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
};

// Règles de génération pour chaque set
const BOOSTER_RULES: BoosterGenerationRules = {
  'OP-01': {
    commonCount: 6,
    uncommonCount: 3,
    rareCount: 2,
    superRareCount: 1,
    leaderCount: 1,
    characterCount: 4,
    eventCount: 2,
    stageCount: 1,
    donCount: 1,
    altArtChance: 0.1,
    parallelChance: 0.05,
    specialChance: 0.05
  },
  'OP-02': {
    commonCount: 6,
    uncommonCount: 3,
    rareCount: 2,
    superRareCount: 1,
    leaderCount: 1,
    characterCount: 4,
    eventCount: 2,
    stageCount: 1,
    donCount: 1,
    altArtChance: 0.1,
    parallelChance: 0.05,
    specialChance: 0.05
  },
  'DEFAULT': {
    commonCount: 6,
    uncommonCount: 3,
    rareCount: 2,
    superRareCount: 1,
    leaderCount: 1,
    characterCount: 4,
    eventCount: 2,
    stageCount: 1,
    donCount: 1,
    altArtChance: 0.1,
    parallelChance: 0.05,
    specialChance: 0.05
  }
};

// Fonction pour vérifier si une carte est ultra rare
function isUltraRareCard(card: Card): boolean {
  return ['L', 'SR', 'SEC', 'SP CARD', 'Rare', 'Rare Holo'].includes(card.rarity) ||
         card.isParallel ||
         card.isAltArt ||
         card.isSpecial;
}

// Fonction pour transformer une carte avant de l'envoyer au client
function transformCard(card: Card): Card {
  return {
    ...card,
    name: typeof card.name === 'object' ? JSON.stringify(card.name) : card.name
  };
}

// Fonction pour sélectionner une carte aléatoire d'une rareté donnée
async function selectCardByRarity(rarity: string, setCode: string): Promise<Card | null> {
  const cards = await prisma.card.findMany({
    where: {
      rarity: rarity,
      setCode: setCode,
      isParallel: false,
      isAltArt: false,
      isSpecial: false
    }
  }) as unknown as Card[];

  if (cards.length === 0) return null;
  return cards[Math.floor(Math.random() * cards.length)];
}

// Fonction pour sélectionner une carte par type
async function selectCardByType(type: string, setCode: string): Promise<Card | null> {
  const cards = await prisma.card.findMany({
    where: {
      type: type,
      setCode: setCode,
      isParallel: false,
      isAltArt: false,
      isSpecial: false
    }
  }) as unknown as Card[];

  if (cards.length === 0) return null;
  return cards[Math.floor(Math.random() * cards.length)];
}

// Fonction pour sélectionner une carte alternative
async function selectAlternativeCard(setCode: string): Promise<Card | null> {
  const cards = await prisma.card.findMany({
    where: {
      setCode: setCode,
      OR: [
        { isParallel: true },
        { isAltArt: true },
        { isSpecial: true }
      ]
    }
  }) as unknown as Card[];

  if (cards.length === 0) return null;
  return cards[Math.floor(Math.random() * cards.length)];
}

// Fonction pour générer un booster
async function generateBooster(setCode: string): Promise<Card[]> {
  console.log(`[BOOSTER] Début de la génération du booster pour le set ${setCode}`);
  const rules = BOOSTER_RULES[setCode] || BOOSTER_RULES['DEFAULT'];
  const booster: Card[] = [];
  
  // Générer toutes les cartes nécessaires
  const commonCards: Card[] = [];
  const uncommonCards: Card[] = [];
  const rareCards: Card[] = [];
  const superRareCards: Card[] = [];
  const leaderCards: Card[] = [];
  
  console.log(`[BOOSTER] Récupération des cartes de chaque rareté...`);
  
  // Récupérer plusieurs cartes de chaque rareté pour avoir un choix aléatoire
  for (let i = 0; i < 10; i++) {
    const commonCard = await selectCardByRarity('C', setCode);
    if (commonCard) {
      commonCards.push(transformCard(commonCard));
      console.log(`[BOOSTER] Carte commune ajoutée au pool: ${commonCard.name}`);
    }
    
    const uncommonCard = await selectCardByRarity('UC', setCode);
    if (uncommonCard) {
      uncommonCards.push(transformCard(uncommonCard));
      console.log(`[BOOSTER] Carte uncommon ajoutée au pool: ${uncommonCard.name}`);
    }
    
    const rareCard = await selectCardByRarity('R', setCode);
    if (rareCard) {
      rareCards.push(transformCard(rareCard));
      console.log(`[BOOSTER] Carte rare ajoutée au pool: ${rareCard.name}`);
    }
    
    const superRareCard = await selectCardByRarity('SR', setCode);
    if (superRareCard) {
      superRareCards.push(transformCard(superRareCard));
      console.log(`[BOOSTER] Carte super rare ajoutée au pool: ${superRareCard.name}`);
    }
    
    const leaderCard = await selectCardByType('LEADER', setCode);
    if (leaderCard) {
      leaderCards.push(transformCard(leaderCard));
      console.log(`[BOOSTER] Carte leader ajoutée au pool: ${leaderCard.name}`);
    }
  }
  
  console.log(`[BOOSTER] Taille des pools: C=${commonCards.length}, UC=${uncommonCards.length}, R=${rareCards.length}, SR=${superRareCards.length}, Leader=${leaderCards.length}`);
  
  // Sélectionner aléatoirement les cartes pour chaque position
  console.log(`[BOOSTER] Sélection des cartes pour le booster...`);
  
  // Positions 1-6: Cartes communes
  for (let i = 0; i < 6; i++) {
    if (commonCards.length > 0) {
      const randomIndex = Math.floor(Math.random() * commonCards.length);
      const selectedCard = commonCards[randomIndex];
      booster.push(selectedCard);
      commonCards.splice(randomIndex, 1);
      console.log(`[BOOSTER] Position ${i+1}: Carte commune sélectionnée: ${selectedCard.name}`);
            } else {
      console.log(`[BOOSTER] Position ${i+1}: Aucune carte commune disponible`);
    }
  }
  
  // Positions 7-9: Cartes uncommon
  for (let i = 0; i < 3; i++) {
    if (uncommonCards.length > 0) {
      const randomIndex = Math.floor(Math.random() * uncommonCards.length);
      const selectedCard = uncommonCards[randomIndex];
      booster.push(selectedCard);
      uncommonCards.splice(randomIndex, 1);
      console.log(`[BOOSTER] Position ${i+7}: Carte uncommon sélectionnée: ${selectedCard.name}`);
            } else {
      console.log(`[BOOSTER] Position ${i+7}: Aucune carte uncommon disponible`);
    }
  }
  
  // Position 10: Carte rare ou super rare (50% de chance pour chaque)
  const isSuperRare = Math.random() < 0.5;
  console.log(`[BOOSTER] Position 10: Tentative de sélection ${isSuperRare ? 'super rare' : 'rare'}`);
  
  if (isSuperRare && superRareCards.length > 0) {
    const randomIndex = Math.floor(Math.random() * superRareCards.length);
    const selectedCard = superRareCards[randomIndex];
    booster.push(selectedCard);
    superRareCards.splice(randomIndex, 1);
    console.log(`[BOOSTER] Position 10: Carte super rare sélectionnée: ${selectedCard.name}`);
  } else if (rareCards.length > 0) {
    const randomIndex = Math.floor(Math.random() * rareCards.length);
    const selectedCard = rareCards[randomIndex];
    booster.push(selectedCard);
    rareCards.splice(randomIndex, 1);
    console.log(`[BOOSTER] Position 10: Carte rare sélectionnée: ${selectedCard.name}`);
          } else {
    console.log(`[BOOSTER] Position 10: Aucune carte rare/super rare disponible`);
  }
  
  // Position 11: Carte rare
  if (rareCards.length > 0) {
    const randomIndex = Math.floor(Math.random() * rareCards.length);
    const selectedCard = rareCards[randomIndex];
    booster.push(selectedCard);
    rareCards.splice(randomIndex, 1);
    console.log(`[BOOSTER] Position 11: Carte rare sélectionnée: ${selectedCard.name}`);
        } else {
    console.log(`[BOOSTER] Position 11: Aucune carte rare disponible`);
  }
  
  // Position 12: Leader ou SR (50% de chance pour chaque)
  const isLeader = Math.random() < 0.5;
  console.log(`[BOOSTER] Position 12: Tentative de sélection ${isLeader ? 'leader' : 'super rare'}`);
  
  if (isLeader && leaderCards.length > 0) {
    const randomIndex = Math.floor(Math.random() * leaderCards.length);
    const selectedCard = leaderCards[randomIndex];
    booster.push(selectedCard);
    leaderCards.splice(randomIndex, 1);
    console.log(`[BOOSTER] Position 12: Carte leader sélectionnée: ${selectedCard.name}`);
  } else if (superRareCards.length > 0) {
    const randomIndex = Math.floor(Math.random() * superRareCards.length);
    const selectedCard = superRareCards[randomIndex];
    booster.push(selectedCard);
    superRareCards.splice(randomIndex, 1);
    console.log(`[BOOSTER] Position 12: Carte super rare sélectionnée: ${selectedCard.name}`);
  } else {
    console.log(`[BOOSTER] Position 12: Aucune carte leader/super rare disponible`);
  }
  
  // Vérifier si on doit ajouter une carte alternative
  if (Math.random() < rules.altArtChance) {
    console.log(`[BOOSTER] Tentative d'ajout d'une carte alternative (chance: ${rules.altArtChance})`);
    const altCard = await selectAlternativeCard(setCode);
          if (altCard) {
      // Remplacer une carte commune par la carte alternative
      const commonCardIndex = booster.findIndex(card => card?.rarity === 'C');
      if (commonCardIndex !== -1) {
        const replacedCard = booster[commonCardIndex];
        booster[commonCardIndex] = transformCard(altCard);
        console.log(`[BOOSTER] Carte alternative ajoutée: ${altCard.name}, remplace: ${replacedCard.name}`);
          } else {
        console.log(`[BOOSTER] Aucune carte commune trouvée pour remplacer par une carte alternative`);
          }
        } else {
      console.log(`[BOOSTER] Aucune carte alternative disponible`);
            }
          } else {
    console.log(`[BOOSTER] Pas de carte alternative (chance: ${rules.altArtChance})`);
  }
  
  // Mélanger le booster pour plus de randomisation
  console.log(`[BOOSTER] Mélange du booster...`);
  for (let i = booster.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [booster[i], booster[j]] = [booster[j], booster[i]];
  }
  
  // S'assurer qu'il y a exactement 12 cartes
  console.log(`[BOOSTER] Nombre de cartes avant complétion: ${booster.length}`);
  while (booster.length < 12) {
    console.log(`[BOOSTER] Ajout d'une carte commune supplémentaire...`);
    const commonCard = await selectCardByRarity('C', setCode);
    if (commonCard) {
      booster.push(transformCard(commonCard));
      console.log(`[BOOSTER] Carte commune ajoutée: ${commonCard.name}`);
    }
  }
  
  console.log(`[BOOSTER] Nombre final de cartes: ${booster.length}`);
  console.log(`[BOOSTER] Contenu du booster:`);
  booster.forEach((card, index) => {
    console.log(`[BOOSTER] Position ${index+1}: ${card.name} (${card.rarity})`);
  });
  
  return booster;
}

export async function POST(req: Request) {
  try {
    console.log('[BOOSTER-OPEN] Début de la requête');
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.log('[BOOSTER-OPEN] Utilisateur non authentifié');
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { setCode } = await req.json();
    const rules = BOOSTER_RULES[setCode] || BOOSTER_RULES.DEFAULT;

    // Compter le nombre de cartes de chaque rareté
    const totalCommon = await prisma.card.count({
      where: {
        set: setCode,
        rarity: 'C'
      }
    });

    const totalUncommon = await prisma.card.count({
      where: {
        set: setCode,
        rarity: 'UC'
      }
    });

    const totalRare = await prisma.card.count({
      where: {
        set: setCode,
        rarity: 'R'
      }
    });

    const totalSuperRare = await prisma.card.count({
      where: {
        set: setCode,
        rarity: 'SR'
      }
    });

    // Sélection des cartes selon les règles
    const selectedCards = [];
    
    // Cartes communes
    for (let i = 0; i < rules.commonCount; i++) {
      const card = await prisma.card.findMany({
        where: {
          set: setCode,
          rarity: 'C'
        },
        take: 1,
        skip: Math.floor(Math.random() * totalCommon)
      });
      if (card.length > 0) selectedCards.push(card[0]);
    }

    // Cartes peu communes
    for (let i = 0; i < rules.uncommonCount; i++) {
      const card = await prisma.card.findMany({
        where: {
          set: setCode,
          rarity: 'UC'
        },
        take: 1,
        skip: Math.floor(Math.random() * totalUncommon)
      });
      if (card.length > 0) selectedCards.push(card[0]);
    }

    // Cartes rares
    for (let i = 0; i < rules.rareCount; i++) {
      const card = await prisma.card.findMany({
        where: {
          set: setCode,
          rarity: 'R'
        },
        take: 1,
        skip: Math.floor(Math.random() * totalRare)
      });
      if (card.length > 0) selectedCards.push(card[0]);
    }

    // Cartes super rares
    for (let i = 0; i < rules.superRareCount; i++) {
      const card = await prisma.card.findMany({
        where: {
          set: setCode,
          rarity: 'SR'
        },
        take: 1,
        skip: Math.floor(Math.random() * totalSuperRare)
      });
      if (card.length > 0) selectedCards.push(card[0]);
    }

    // Mélange des cartes
    const shuffledCards = selectedCards.sort(() => Math.random() - 0.5);

    // Créer le booster
    const booster = await prisma.booster.create({
      data: {
        name: `Booster ${setCode}`,
        description: `Booster du set ${setCode}`,
        price: 0,
        setCode: setCode,
        cards: {
          create: shuffledCards.map((card, index) => ({
            cardId: card.id,
            probability: 1
          }))
        }
      }
    });

    // Créer l'ouverture du booster
    const boosterOpening = await prisma.boosterOpening.create({
      data: {
        userId: session.user.id,
        boosterId: booster.id,
        cards: {
          create: shuffledCards.map((card, index) => ({
            cardId: card.id,
            position: index
          }))
        }
      }
    });

    return NextResponse.json(boosterOpening);
  } catch (error) {
    console.error('Erreur lors de la génération du booster:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du booster' },
      { status: 500 }
    );
  }
} 

