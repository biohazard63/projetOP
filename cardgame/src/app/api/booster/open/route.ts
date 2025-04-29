import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    console.log('[BOOSTER-OPEN] Début de la requête d\'ouverture de booster');
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log('[BOOSTER-OPEN] Utilisateur non authentifié');
      return NextResponse.json({ 
        success: false, 
        error: 'Non authentifié' 
      }, { status: 401 })
    }

    const { setCode } = await request.json()
    console.log(`[BOOSTER-OPEN] Code du set demandé: ${setCode}`);

    if (!setCode) {
      console.log('[BOOSTER-OPEN] Code de set manquant');
      return NextResponse.json({ 
        success: false, 
        error: 'Code de set manquant' 
      }, { status: 400 })
    }

    // Récupérer les règles du set
    console.log(`[BOOSTER-OPEN] Récupération des règles pour le set ${setCode}`);
    const setRules = await prisma.setRules.findUnique({
      where: { code: setCode }
    })

    // Déclarer la variable cards en dehors du bloc conditionnel
    let cards: any[] = [];

    if (!setRules) {
      console.log(`[BOOSTER-OPEN] Set ${setCode} non trouvé dans la base de données, utilisation des règles par défaut`);
      
      // Utiliser les règles par défaut au lieu de retourner une erreur
      const defaultRules = {
        code: setCode,
        name: setCode,
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
        },
        boosterRules: {
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
      
      // Générer un booster selon les règles par défaut
      console.log(`[BOOSTER-OPEN] Génération du booster pour le set ${setCode} avec les règles par défaut`);
      cards = await generateBooster(defaultRules);
      console.log(`[BOOSTER-OPEN] Booster généré avec ${cards.length} cartes`);

    } else {
      console.log(`[BOOSTER-OPEN] Règles trouvées pour le set ${setCode}:`, setRules);
  
      // Générer un booster selon les règles
      console.log(`[BOOSTER-OPEN] Génération du booster pour le set ${setCode}`);
      cards = await generateBooster(setRules);
      console.log(`[BOOSTER-OPEN] Booster généré avec ${cards.length} cartes`);
    }

    // Vérifier si l'utilisateur a déjà ces cartes
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      console.log(`[BOOSTER-OPEN] Utilisateur ${session.user.email} non trouvé`);
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      }, { status: 404 })
    }

    // Récupérer les cartes de l'utilisateur via UserCard
    const userCards = await prisma.userCard.findMany({
      where: { userId: user.id },
      select: { cardId: true }
    })

    const userCardIds = new Set(userCards.map(userCard => userCard.cardId))
    const newCardsCount = cards.filter(card => !userCardIds.has(card.id)).length
    console.log(`[BOOSTER-OPEN] Nombre de nouvelles cartes pour l'utilisateur: ${newCardsCount}`);

    // Vérifier s'il y a des cartes rares
    const hasRareCard = cards.some(card => 
      card.rarity === 'rare' || 
      card.rarity === 'mythic' || 
      card.imageUrl?.includes('_p1')
    )
    console.log(`[BOOSTER-OPEN] Le booster contient des cartes rares: ${hasRareCard}`);

    return NextResponse.json({
      success: true,
      cards,
      newCardsCount,
      hasRareCard
    })
  } catch (error) {
    console.error('[BOOSTER-OPEN] Erreur lors de l\'ouverture du booster:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, { status: 500 })
  }
}

// Fonction pour normaliser les codes de set
function normalizeSetCode(code: string): string {
  // Supprimer les tirets et les espaces
  return code.replace(/[-\s]/g, '').toUpperCase();
}

async function generateBooster(setRules: any) {
  console.log('[BOOSTER-GEN] Début de la génération du booster');
  
  // Normaliser le code du set
  const normalizedSetCode = normalizeSetCode(setRules.code);
  console.log(`[BOOSTER-GEN] Code du set normalisé: ${normalizedSetCode}`);
  
  // Distribution des cartes selon les règles avec leurs positions
  // Les cartes les plus rares sont placées dans les derniers slots
  const distribution = [
    { rarity: 'C', count: 5, positions: [1, 2, 3, 4, 5] },
    { rarity: 'UC', count: 3, positions: [6, 7, 8] },
    { rarity: 'R', count: 2, positions: [9, 10] },
    { rarity: 'SR', count: 1, positions: [11] },
    { rarity: 'L', count: 0.1, positions: [12] }, // 10% de chance
    { rarity: 'SEC', count: 0.05, positions: [12] }, // 5% de chance
    { rarity: 'SP CARD', count: 0.05, positions: [12] }, // 5% de chance
    { rarity: 'TR', count: 0.01, positions: [12] } // 1% de chance
  ];

  console.log('[BOOSTER-GEN] Distribution des cartes:', distribution);
  
  // Récupérer toutes les cartes du set
  console.log(`[BOOSTER-GEN] Récupération des cartes pour le set ${normalizedSetCode}`);
  const allCards = await prisma.card.findMany({
    where: {
      OR: [
        { setCode: normalizedSetCode },
        { setCode: `OP-${normalizedSetCode.replace('OP', '')}` },
        { setCode: normalizedSetCode.replace('-', '') },
        { set: { contains: normalizedSetCode } },
        // Ajout des formats spécifiques pour EB et PRB
        { setCode: `EB-${normalizedSetCode.replace('EB', '')}` },
        { setCode: `PRB-${normalizedSetCode.replace('PRB', '')}` },
        { setCode: normalizedSetCode.replace('EB', 'EB-') },
        { setCode: normalizedSetCode.replace('PRB', 'PRB-') }
      ],
      isParallel: false,
      isAltArt: false
    }
  });
  
  console.log(`[BOOSTER-GEN] Nombre total de cartes récupérées: ${allCards.length}`);
  console.log('[BOOSTER-GEN] Codes de set trouvés:', [...new Set(allCards.map(card => card.setCode))]);
  
  // Grouper les cartes par rareté
  const cardsByRarity: Record<string, any[]> = {};
  allCards.forEach(card => {
    if (!cardsByRarity[card.rarity]) {
      cardsByRarity[card.rarity] = [];
    }
    cardsByRarity[card.rarity].push(card);
  });
  
  console.log('[BOOSTER-GEN] Cartes groupées par rareté:', 
    Object.keys(cardsByRarity).map(rarity => `${rarity}: ${cardsByRarity[rarity].length}`));
  
  // Initialiser le booster avec 12 positions vides
  const booster: any[] = new Array(12).fill(null);
  
  // Vérifier s'il y a des cartes très rares (L, SEC, SP CARD) disponibles
  const hasVeryRareCards = ['L', 'SEC', 'SP CARD'].some(rarity => 
    cardsByRarity[rarity] && cardsByRarity[rarity].length > 0
  );
  
  console.log(`[BOOSTER-GEN] Cartes très rares disponibles: ${hasVeryRareCards}`);
  
  // Sélectionner les cartes selon la distribution et les placer aux positions spécifiées
  for (const { rarity, count, positions } of distribution) {
    // Si c'est une rareté très rare, on utilise la probabilité
    if (['L', 'SEC', 'SP CARD', 'TR'].includes(rarity)) {
      if (Math.random() > count) {
        continue;
      }
      
      // Vérifier si des cartes de cette rareté sont disponibles
      if (!cardsByRarity[rarity] || cardsByRarity[rarity].length === 0) {
        console.log(`[BOOSTER-GEN] Aucune carte de rareté ${rarity} disponible, passage à la rareté suivante`);
        continue;
      }
      
      // Mélanger les cartes de cette rareté
      const shuffledCards = [...cardsByRarity[rarity]];
      for (let i = shuffledCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
      }
      
      // Prendre la première carte
      const cardToAdd = shuffledCards[0];
      
      // Placer la carte à la position 12
      booster[11] = cardToAdd;
      console.log(`[BOOSTER-GEN] Carte ${cardToAdd.name} (${rarity}) placée à la position 12`);
      continue;
    }
    
    console.log(`[BOOSTER-GEN] Sélection de ${count} cartes de rareté ${rarity}`);
    
    if (!cardsByRarity[rarity] || cardsByRarity[rarity].length === 0) {
      console.log(`[BOOSTER-GEN] Aucune carte de rareté ${rarity} disponible`);
      continue;
    }
    
    // Mélanger les cartes de cette rareté
    const shuffledCards = [...cardsByRarity[rarity]];
    for (let i = shuffledCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
    }
    
    // Prendre les premières cartes
    const cardsToAdd = shuffledCards.slice(0, count);
    
    // Placer les cartes aux positions spécifiées
    for (let i = 0; i < cardsToAdd.length; i++) {
      // Trouver une position disponible parmi les positions autorisées
      const availablePositions = positions.filter(pos => booster[pos - 1] === null);
      if (availablePositions.length > 0) {
        const randomPositionIndex = Math.floor(Math.random() * availablePositions.length);
        const position = availablePositions[randomPositionIndex];
        booster[position - 1] = cardsToAdd[i];
        console.log(`[BOOSTER-GEN] Carte ${cardsToAdd[i].name} (${rarity}) placée à la position ${position}`);
      }
    }
  }
  
  // Compléter les positions vides avec des cartes communes
  console.log('[BOOSTER-GEN] Complétion des positions vides');
  const commonCards = cardsByRarity['C'] || [];
  
  for (let i = 0; i < booster.length; i++) {
    if (booster[i] === null && commonCards.length > 0) {
      const randomIndex = Math.floor(Math.random() * commonCards.length);
      booster[i] = commonCards[randomIndex];
      console.log(`[BOOSTER-GEN] Position ${i + 1} complétée avec ${commonCards[randomIndex].name} (C)`);
    }
  }
  
  console.log('[BOOSTER-GEN] Contenu final du booster:');
  booster.forEach((card, index) => {
    console.log(`[BOOSTER-GEN] Position ${index + 1}: ${card.name} (${card.rarity})`);
  });
  
  return booster;
} 