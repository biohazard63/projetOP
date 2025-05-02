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
      ['R', 'SR', 'L', 'SEC', 'SP CARD'].includes(card.rarity)
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
    { rarity: 'SR', count: 0.5, positions: [11] }, // 50% de chance pour une SR
    { rarity: 'R', count: 0.5, positions: [11] }, // 50% de chance pour une R
    { rarity: 'R', count: 0.4, positions: [12] }, // 40% de chance pour une R
    { rarity: 'SR', count: 0.2, positions: [12] }, // 20% de chance pour une SR
    { rarity: 'L', count: 0.2, positions: [12] }, // 20% de chance pour une L
    { rarity: 'SEC', count: 0.10, positions: [12] }, // 10% de chance pour une SEC
    { rarity: 'SP CARD', count: 0.1, positions: [12] }, // 10% de chance pour une SP
    { rarity: 'TR', count: 0.05, positions: [12] } // 5% de chance pour une TR
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
      ]
    }
  });

  // Fonction pour vérifier si une carte est une alternative et obtenir son niveau
  const getAltLevel = (cardId: string) => {
    const match = cardId.match(/_p(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  };

  // Fonction pour appliquer les taux de drop des alternatives
  const shouldIncludeAlt = (cardId: string) => {
    const altLevel = getAltLevel(cardId);
    if (altLevel === 0) return true; // Carte normale

    const random = Math.random();
    switch (altLevel) {
      case 1: // _p1 - 5% de chance
        return random < 0.05;
      case 2: // _p2 - 3% de chance
        return random < 0.03;
      case 3: // _p3 - 1% de chance
        return random < 0.01;
      default: // _p4 et plus - 0.5% de chance
        return random < 0.005;
    }
  };

  // Filtrer les cartes en fonction des taux de drop
  const filteredCards = allCards.filter(card => shouldIncludeAlt(card.id));
  
  console.log(`[BOOSTER-GEN] Nombre total de cartes récupérées: ${allCards.length}`);
  console.log(`[BOOSTER-GEN] Nombre de cartes après filtrage: ${filteredCards.length}`);
  console.log('[BOOSTER-GEN] Codes de set trouvés:', [...new Set(filteredCards.map(card => card.setCode))]);
  
  // Grouper les cartes par rareté
  const cardsByRarity: Record<string, any[]> = {};
  filteredCards.forEach(card => {
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
  
  // Sélectionner aléatoirement les cartes pour chaque position
  console.log(`[BOOSTER-GEN] Sélection des cartes pour le booster...`);
  
  // Positions 1-6: Cartes communes
  for (let i = 0; i < 6; i++) {
    if (cardsByRarity['C'] && cardsByRarity['C'].length > 0) {
      const randomIndex = Math.floor(Math.random() * cardsByRarity['C'].length);
      const selectedCard = cardsByRarity['C'][randomIndex];
      booster[i] = selectedCard;
      cardsByRarity['C'].splice(randomIndex, 1);
      console.log(`[BOOSTER-GEN] Position ${i+1}: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
    } else if (cardsByRarity['UC'] && cardsByRarity['UC'].length > 0) {
      // Si pas de cartes communes, utiliser des cartes uncommon
      const randomIndex = Math.floor(Math.random() * cardsByRarity['UC'].length);
      const selectedCard = cardsByRarity['UC'][randomIndex];
      booster[i] = selectedCard;
      cardsByRarity['UC'].splice(randomIndex, 1);
      console.log(`[BOOSTER-GEN] Position ${i+1}: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}] (fallback UC)`);
    } else {
      console.log(`[BOOSTER-GEN] Position ${i+1}: Aucune carte commune ou uncommon disponible`);
    }
  }
  
  // Positions 7-9: Cartes uncommon
  for (let i = 0; i < 3; i++) {
    if (cardsByRarity['UC'] && cardsByRarity['UC'].length > 0) {
      const randomIndex = Math.floor(Math.random() * cardsByRarity['UC'].length);
      const selectedCard = cardsByRarity['UC'][randomIndex];
      booster[i+6] = selectedCard;
      cardsByRarity['UC'].splice(randomIndex, 1);
      console.log(`[BOOSTER-GEN] Position ${i+7}: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
    } else if (cardsByRarity['C'] && cardsByRarity['C'].length > 0) {
      // Si pas de cartes uncommon, utiliser des cartes communes
      const randomIndex = Math.floor(Math.random() * cardsByRarity['C'].length);
      const selectedCard = cardsByRarity['C'][randomIndex];
      booster[i+6] = selectedCard;
      cardsByRarity['C'].splice(randomIndex, 1);
      console.log(`[BOOSTER-GEN] Position ${i+7}: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}] (fallback C)`);
    } else {
      console.log(`[BOOSTER-GEN] Position ${i+7}: Aucune carte uncommon ou commune disponible`);
    }
  }
  
  // Position 10: Carte rare ou super rare (50% de chance pour chaque)
  const isSuperRare10 = Math.random() < 0.5;
  console.log(`[BOOSTER-GEN] Position 10: Tentative de sélection ${isSuperRare10 ? 'super rare' : 'rare'}`);
  
  if (isSuperRare10 && cardsByRarity['SR'] && cardsByRarity['SR'].length > 0) {
    const randomIndex = Math.floor(Math.random() * cardsByRarity['SR'].length);
    const selectedCard = cardsByRarity['SR'][randomIndex];
    booster[9] = selectedCard;
    cardsByRarity['SR'].splice(randomIndex, 1);
    console.log(`[BOOSTER-GEN] Position 10: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
  } else if (cardsByRarity['R'] && cardsByRarity['R'].length > 0) {
    const randomIndex = Math.floor(Math.random() * cardsByRarity['R'].length);
    const selectedCard = cardsByRarity['R'][randomIndex];
    booster[9] = selectedCard;
    cardsByRarity['R'].splice(randomIndex, 1);
    console.log(`[BOOSTER-GEN] Position 10: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
  } else if (cardsByRarity['UC'] && cardsByRarity['UC'].length > 0) {
    // Fallback sur uncommon si pas de rare/super rare
    const randomIndex = Math.floor(Math.random() * cardsByRarity['UC'].length);
    const selectedCard = cardsByRarity['UC'][randomIndex];
    booster[9] = selectedCard;
    cardsByRarity['UC'].splice(randomIndex, 1);
    console.log(`[BOOSTER-GEN] Position 10: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}] (fallback UC)`);
  } else {
    console.log(`[BOOSTER-GEN] Position 10: Aucune carte rare/super rare/uncommon disponible`);
  }
  
  // Position 11: Carte rare ou super rare (50% de chance pour chaque)
  const isSuperRare11 = Math.random() < 0.5;
  console.log(`[BOOSTER-GEN] Position 11: Tentative de sélection ${isSuperRare11 ? 'super rare' : 'rare'}`);
  
  if (isSuperRare11 && cardsByRarity['SR'] && cardsByRarity['SR'].length > 0) {
    const randomIndex = Math.floor(Math.random() * cardsByRarity['SR'].length);
    const selectedCard = cardsByRarity['SR'][randomIndex];
    booster[10] = selectedCard;
    cardsByRarity['SR'].splice(randomIndex, 1);
    console.log(`[BOOSTER-GEN] Position 11: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
  } else if (cardsByRarity['R'] && cardsByRarity['R'].length > 0) {
    const randomIndex = Math.floor(Math.random() * cardsByRarity['R'].length);
    const selectedCard = cardsByRarity['R'][randomIndex];
    booster[10] = selectedCard;
    cardsByRarity['R'].splice(randomIndex, 1);
    console.log(`[BOOSTER-GEN] Position 11: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
  } else if (cardsByRarity['UC'] && cardsByRarity['UC'].length > 0) {
    // Fallback sur uncommon si pas de rare/super rare
    const randomIndex = Math.floor(Math.random() * cardsByRarity['UC'].length);
    const selectedCard = cardsByRarity['UC'][randomIndex];
    booster[10] = selectedCard;
    cardsByRarity['UC'].splice(randomIndex, 1);
    console.log(`[BOOSTER-GEN] Position 11: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}] (fallback UC)`);
  } else {
    console.log(`[BOOSTER-GEN] Position 11: Aucune carte rare/super rare/uncommon disponible`);
  }
  
  // Position 12: Distribution des raretés (R: 30%, SR: 20%, L: 20%, SEC: 15%, SP: 10%, TR: 5%)
  const random = Math.random();
  console.log(`[BOOSTER-GEN] Position 12: Tirage aléatoire = ${random}`);
  
  if (random < 0.3 && cardsByRarity['R'] && cardsByRarity['R'].length > 0) {
    // 30% de chance pour une Rare
    const randomIndex = Math.floor(Math.random() * cardsByRarity['R'].length);
    const selectedCard = cardsByRarity['R'][randomIndex];
    booster[11] = selectedCard;
    cardsByRarity['R'].splice(randomIndex, 1);
    console.log(`[BOOSTER-GEN] Position 12: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
  } else if (random < 0.5 && cardsByRarity['SR'] && cardsByRarity['SR'].length > 0) {
    // 20% de chance pour une Super Rare
    const randomIndex = Math.floor(Math.random() * cardsByRarity['SR'].length);
    const selectedCard = cardsByRarity['SR'][randomIndex];
    booster[11] = selectedCard;
    cardsByRarity['SR'].splice(randomIndex, 1);
    console.log(`[BOOSTER-GEN] Position 12: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
  } else if (random < 0.7 && cardsByRarity['L'] && cardsByRarity['L'].length > 0) {
    // 20% de chance pour une Leader
    const randomIndex = Math.floor(Math.random() * cardsByRarity['L'].length);
    const selectedCard = cardsByRarity['L'][randomIndex];
    booster[11] = selectedCard;
    cardsByRarity['L'].splice(randomIndex, 1);
    console.log(`[BOOSTER-GEN] Position 12: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
  } else if (random < 0.85 && cardsByRarity['SEC'] && cardsByRarity['SEC'].length > 0) {
    // 15% de chance pour une Secrète
    const randomIndex = Math.floor(Math.random() * cardsByRarity['SEC'].length);
    const selectedCard = cardsByRarity['SEC'][randomIndex];
    booster[11] = selectedCard;
    cardsByRarity['SEC'].splice(randomIndex, 1);
    console.log(`[BOOSTER-GEN] Position 12: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
  } else if (random < 0.95 && cardsByRarity['SP CARD'] && cardsByRarity['SP CARD'].length > 0) {
    // 10% de chance pour une SP
    const randomIndex = Math.floor(Math.random() * cardsByRarity['SP CARD'].length);
    const selectedCard = cardsByRarity['SP CARD'][randomIndex];
    booster[11] = selectedCard;
    cardsByRarity['SP CARD'].splice(randomIndex, 1);
    console.log(`[BOOSTER-GEN] Position 12: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
  } else if (cardsByRarity['TR'] && cardsByRarity['TR'].length > 0) {
    // 5% de chance pour une TR
    const randomIndex = Math.floor(Math.random() * cardsByRarity['TR'].length);
    const selectedCard = cardsByRarity['TR'][randomIndex];
    booster[11] = selectedCard;
    cardsByRarity['TR'].splice(randomIndex, 1);
    console.log(`[BOOSTER-GEN] Position 12: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
  } else if (cardsByRarity['R'] && cardsByRarity['R'].length > 0) {
    // Fallback sur rare si aucune autre carte n'est disponible
    const randomIndex = Math.floor(Math.random() * cardsByRarity['R'].length);
    const selectedCard = cardsByRarity['R'][randomIndex];
    booster[11] = selectedCard;
    cardsByRarity['R'].splice(randomIndex, 1);
    console.log(`[BOOSTER-GEN] Position 12: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}] (fallback R)`);
  } else {
    console.log(`[BOOSTER-GEN] Position 12: Aucune carte disponible`);
  }
  
  // Vérifier et remplir les positions vides avec des cartes communes si possible
  for (let i = 0; i < booster.length; i++) {
    if (booster[i] === null && cardsByRarity['C'] && cardsByRarity['C'].length > 0) {
      const randomIndex = Math.floor(Math.random() * cardsByRarity['C'].length);
      const selectedCard = cardsByRarity['C'][randomIndex];
      booster[i] = selectedCard;
      cardsByRarity['C'].splice(randomIndex, 1);
      console.log(`[BOOSTER-GEN] Position ${i+1} remplie avec une carte commune: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
    }
  }
  
  console.log('[BOOSTER-GEN] Contenu final du booster:');
  booster.forEach((card, index) => {
    if (card) {
      console.log(`[BOOSTER-GEN] Position ${index + 1}: ${card.name} (${card.rarity}) [${card.id}]`);
    } else {
      console.log(`[BOOSTER-GEN] Position ${index + 1}: Vide`);
    }
  });
  
  return booster;
} 