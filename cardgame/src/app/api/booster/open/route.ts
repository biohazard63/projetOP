import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Card } from '@prisma/client'

export async function POST(request: Request) {
  try {
    console.log('[BOOSTER-OPEN] Début de la requête d\'ouverture de booster');
    const session = await auth()
    
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
      where: { code: String(setCode).toUpperCase() }
    })

    // Déclarer la variable cards en dehors du bloc conditionnel
    let cards: Card[] = []

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
      cards = await generateBooster(defaultRules)
      console.log(`[BOOSTER-OPEN] Booster généré avec ${cards.length} cartes`);

    } else {
      console.log(`[BOOSTER-OPEN] Règles trouvées pour le set ${setCode}:`, setRules);
  
      // Générer un booster selon les règles
      console.log(`[BOOSTER-OPEN] Génération du booster pour le set ${setCode}`);
      cards = await generateBooster(setRules as MinimalSetRules)
      console.log(`[BOOSTER-OPEN] Booster généré avec ${cards.length} cartes`);
    }

    // Vérifier si l'utilisateur a déjà ces cartes
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true }
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

type MinimalSetRules = { code: string }

async function generateBooster(setRules: MinimalSetRules): Promise<Card[]> {
  console.log('[BOOSTER-GEN] Début de la génération du booster');
  
  // Normaliser le code du set
  const normalizedSetCode = normalizeSetCode(setRules.code);
  console.log(`[BOOSTER-GEN] Code du set normalisé: ${normalizedSetCode}`);
  const packSize = 12
  
  // Règles de slots pondérées plus flexibles (base safe + surprises)
  const SLOT_RULES: Array<Record<string, number>> = [
    { 'C': 1 }, // 1
    { 'C': 1 }, // 2
    { 'C': 1 }, // 3
    { 'C': 1 }, // 4
    { 'C': 1 }, // 5
    { 'UC': 0.8, 'R': 0.2 }, // 6
    { 'UC': 0.6, 'R': 0.3, 'SR': 0.1 }, // 7
    { 'UC': 0.4, 'R': 0.4, 'SR': 0.2 }, // 8
    { 'R': 0.6, 'SR': 0.3, 'L': 0.1 }, // 9
    { 'R': 0.5, 'SR': 0.3, 'L': 0.15, 'SEC': 0.05 }, // 10
    { 'R': 0.3, 'SR': 0.3, 'L': 0.2, 'SEC': 0.1, 'SP CARD': 0.05, 'TR': 0.05 }, // 11
    { 'R': 0.25, 'SR': 0.25, 'L': 0.2, 'SEC': 0.15, 'SP CARD': 0.1, 'TR': 0.05 } // 12
  ]
  console.log('[BOOSTER-GEN] SLOT_RULES:', SLOT_RULES)
  
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
  const getAltLevel = (cardId: string): number => {
    const regex = /_p(\d+)$/
    const match = regex.exec(cardId)
    return match ? parseInt(match[1]!, 10) : 0
  }

  // Normalisation agressive des libellés de rareté pour éviter les ratés (SP, TR, espaces, casse)
  const normalizeRarityName = (rarityRaw: string | null | undefined): string => {
    const r = String(rarityRaw || '').trim().toUpperCase().replace(/\s+/g, ' ')
    if (!r) return 'C'
    if (r === 'SP' || r === 'S P' || r.includes('SP-') || r.includes('SPCARD') || r.includes('SP CARD')) return 'SP CARD'
    if (r === 'TR' || r === 'T R' || r.includes('TREASURE')) return 'TR'
    if (r === 'U') return 'UC'
    return r
  }

  // Fonction pour appliquer les taux de drop des alternatives (hors SP/TR)
  const shouldIncludeAlt = (cardId: string): boolean => {
    const altLevel = getAltLevel(cardId);
    if (altLevel === 0) return true; // Carte normale

    const random = Math.random();
    switch (altLevel) {
      case 1: // _p1 - 15% de chance
        return random < 0.15;
      case 2: // _p2 - 5% de chance
        return random < 0.05;
      case 3: // _p3 - 1% de chance
        return random < 0.01;
      default: // _p4 et plus - 0.5% de chance
        return random < 0.005;
    }
  };

  // Filtrer les cartes en fonction des taux de drop
  const filteredCards = allCards.filter((card: Card) => {
    const normRarity = normalizeRarityName(card.rarity as unknown as string)
    // Ne jamais filtrer les SP/TR par le système d'alternatives
    if (normRarity === 'SP CARD' || normRarity === 'TR') return true
    return shouldIncludeAlt(card.id)
  });
  
  console.log(`[BOOSTER-GEN] Nombre total de cartes récupérées: ${allCards.length}`);
  console.log(`[BOOSTER-GEN] Nombre de cartes après filtrage: ${filteredCards.length}`);
  console.log('[BOOSTER-GEN] Codes de set trouvés:', [...new Set(filteredCards.map(card => card.setCode))]);
  
  // Grouper les cartes par rareté (normalisée)
  const cardsByRarity: Record<string, Card[]> = {}
  filteredCards.forEach((card: Card) => {
    const norm = normalizeRarityName(card.rarity as unknown as string)
    if (!cardsByRarity[norm]) {
      cardsByRarity[norm] = [];
    }
    cardsByRarity[norm].push(card as Card);
  });
  
  console.log('[BOOSTER-GEN] Cartes groupées par rareté:', 
    Object.keys(cardsByRarity).map(rarity => `${rarity}: ${cardsByRarity[rarity].length}`));
  
  // Initialiser le booster avec packSize positions vides
  const booster: Array<Card | null> = new Array(packSize).fill(null)
  
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
      if (i + 6 < packSize) booster[i+6] = selectedCard;
      cardsByRarity['UC'].splice(randomIndex, 1);
      console.log(`[BOOSTER-GEN] Position ${i+7}: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}]`);
    } else if (cardsByRarity['C'] && cardsByRarity['C'].length > 0) {
      // Si pas de cartes uncommon, utiliser des cartes communes
      const randomIndex = Math.floor(Math.random() * cardsByRarity['C'].length);
      const selectedCard = cardsByRarity['C'][randomIndex];
      if (i + 6 < packSize) booster[i+6] = selectedCard;
      cardsByRarity['C'].splice(randomIndex, 1);
      console.log(`[BOOSTER-GEN] Position ${i+7}: ${selectedCard.name} (${selectedCard.rarity}) [${selectedCard.id}] (fallback C)`);
    } else {
      console.log(`[BOOSTER-GEN] Position ${i+7}: Aucune carte uncommon ou commune disponible`);
    }
  }
  
  // Sélection par slots pondérés
  const weightedPick = (weights: Record<string, number>): string | null => {
    const entries = Object.entries(weights).filter(([r,w]) => w > 0)
    const total = entries.reduce((s, [,w]) => s + w, 0)
    if (total <= 0) return null
    let t = Math.random() * total
    for (const [rarity, w] of entries) {
      t -= w
      if (t <= 0) return rarity
    }
    return entries[entries.length-1]?.[0] ?? null
  }

  const takeFromRarity = (rarity: string, slotIdx: number): boolean => {
    const pool = cardsByRarity[rarity]
    if (pool && pool.length > 0) {
      const randomIndex = Math.floor(Math.random() * pool.length)
      const selected = pool[randomIndex]
      booster[slotIdx] = selected
      pool.splice(randomIndex, 1)
      console.log(`[BOOSTER-GEN] Position ${slotIdx+1}: ${selected.name} (${selected.rarity}) [${selected.id}] via ${rarity}`)
      return true
    }
    return false
  }

  for (let slot = 0; slot < packSize; slot++) {
    const weights = SLOT_RULES[slot]
    if (!weights) continue
    // Essaie 3 tirages max avant fallback
    let ok = false
    for (let tries = 0; tries < 3 && !ok; tries++) {
      const pick = weightedPick(weights)
      if (pick) ok = takeFromRarity(pick, slot)
    }
    if (!ok) {
      // Fallback ordonné
      const order = ['UC','C','R','SR','L','SEC','SP CARD','TR']
      for (const r of order) { if (takeFromRarity(r, slot)) { ok = true; break } }
    }
  }
  
  // Vérifier et remplir les positions vides avec des cartes communes si possible
  const pickFrom = (rarity: string): Card | null => {
    if (cardsByRarity[rarity] && cardsByRarity[rarity].length > 0) {
      const idx = Math.floor(Math.random() * cardsByRarity[rarity].length)
      const c = cardsByRarity[rarity][idx]
      cardsByRarity[rarity].splice(idx, 1)
      return c
    }
    return null
  }

  const preferredRarities = ['UC', 'C', 'R', 'SR', 'L', 'SEC', 'SP CARD', 'TR']
  const usedIds = new Set(booster.filter(Boolean).map((c) => (c as Card).id))

  for (let i = 0; i < booster.length; i++) {
    if (booster[i] === null) {
      let chosen: Card | null = null
      for (const r of preferredRarities) {
        chosen = pickFrom(r)
        if (chosen) break
      }
      if (!chosen) {
        // Dernier secours: prendre une carte encore non utilisée dans le pool filtré
        const remaining = filteredCards.filter((c) => !usedIds.has(c.id))
        if (remaining.length > 0) {
          chosen = remaining[Math.floor(Math.random() * remaining.length)]
        } else if (filteredCards.length > 0) {
          // Vraiment en dernier recours, autoriser un doublon dans le pack
          chosen = filteredCards[Math.floor(Math.random() * filteredCards.length)]
        }
      }
      if (chosen) {
        booster[i] = chosen
        usedIds.add(chosen.id)
        console.log(`[BOOSTER-GEN] Position ${i + 1} remplie en fallback: ${chosen.name} (${chosen.rarity}) [${chosen.id}]`)
      } else {
        console.log(`[BOOSTER-GEN] Position ${i + 1}: aucun fallback disponible (cas extrême)`) 
      }
    }
  }
  
  // Chance globale de "God Pack" (1%) : transforme tous les slots en hauts tirages
  const GOD_PACK_CHANCE = 0.01 // 1%
  if (Math.random() < GOD_PACK_CHANCE) {
    console.log('[BOOSTER-GEN] GOD PACK ACTIVÉ — tous les slots upgradés')
    const godWeights: Record<string, number> = { 'SR': 0.5, 'L': 0.2, 'SEC': 0.15, 'SP CARD': 0.1, 'TR': 0.05 }
    for (let slot = 0; slot < booster.length; slot++) {
      // si déjà une très bonne carte, on laisse; sinon on sur-tire
      const current = booster[slot]
      const rarity = current?.rarity ? normalizeRarityName(current.rarity as unknown as string) : ''
      if (!['SR','L','SEC','SP CARD','TR'].includes(rarity)) {
        let ok = false
        for (let tries = 0; tries < 3 && !ok; tries++) {
          const pick = weightedPick(godWeights)
          if (pick && takeFromRarity(pick, slot)) ok = true
        }
      }
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
  
  return booster.filter((c): c is Card => c !== null)
} 