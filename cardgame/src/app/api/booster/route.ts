import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fonction pour obtenir une carte aléatoire d'une rareté spécifique
async function getRandomCardByRarity(cards: any[], rarity: string, type?: string) {
  let filteredCards = cards.filter(card => card.rarity === rarity);
  if (type) {
    filteredCards = filteredCards.filter(card => card.type === type);
  }
  
  if (filteredCards.length === 0) {
    console.log(`Aucune carte trouvée pour la rareté ${rarity}${type ? ` et le type ${type}` : ''}`);
    return null;
  }
  const randomCard = filteredCards[Math.floor(Math.random() * filteredCards.length)];
  console.log(`Carte ${rarity}${type ? ` (${type})` : ''} sélectionnée:`, randomCard.name);
  return randomCard;
}

export async function POST(request: Request) {
  try {
    const { set } = await request.json();
    console.log('Set sélectionné:', set);

    // Récupérer toutes les cartes du set
    const cards = await prisma.card.findMany({
      where: {
        set: set
      }
    });
    console.log(`Nombre total de cartes trouvées pour le set ${set}:`, cards.length);

    // Trier les cartes par rareté
    const commonCards = cards.filter(card => card.rarity === 'C');
    const uncommonCards = cards.filter(card => card.rarity === 'UC');
    const rareCards = cards.filter(card => card.rarity === 'R');
    const superRareCards = cards.filter(card => card.rarity === 'SR');
    const secretCards = cards.filter(card => card.rarity === 'SEC');
    const leaderCards = cards.filter(card => card.type === 'LEADER');

    console.log('Répartition des cartes par rareté:', {
      C: commonCards.length,
      UC: uncommonCards.length,
      R: rareCards.length,
      SR: superRareCards.length,
      SEC: secretCards.length,
      LEADER: leaderCards.length
    });

    // Générer le booster
    const booster = [];

    // 6 cartes communes
    for (let i = 0; i < 6; i++) {
      const card = await getRandomCardByRarity(commonCards, 'C');
      if (card) booster.push(card);
    }

    // 3 cartes peu communes
    for (let i = 0; i < 3; i++) {
      const card = await getRandomCardByRarity(uncommonCards, 'UC');
      if (card) booster.push(card);
    }

    // 2 cartes rares avec possibilité de LEADER
    for (let i = 0; i < 2; i++) {
      const random = Math.random();
      let card;

      if (random < 0.15 && leaderCards.length > 0) {
        // 15% chance de Leader pour chaque position
        card = leaderCards[Math.floor(Math.random() * leaderCards.length)];
        console.log('Carte LEADER sélectionnée:', card.name);
      } else {
        // 85% chance de R normale
        card = await getRandomCardByRarity(rareCards, 'R');
      }

      if (card) booster.push(card);
    }

    // Dernière carte avec distribution spéciale :
    // - 8% SEC
    // - 25% SR
    // - 15% Leader (R)
    // - 52% R
    const random = Math.random();
    let lastCard;

    if (random < 0.08) {
      // 8% chance de SEC
      lastCard = await getRandomCardByRarity(secretCards, 'SEC');
    } else if (random < 0.33) {
      // 25% chance de SR
      lastCard = await getRandomCardByRarity(superRareCards, 'SR');
    } else if (random < 0.48) {
      // 15% chance de Leader
      if (leaderCards.length > 0) {
        lastCard = leaderCards[Math.floor(Math.random() * leaderCards.length)];
        console.log('Carte LEADER sélectionnée:', lastCard.name);
      } else {
        console.log('Aucune carte LEADER trouvée, sélection d\'une carte R normale');
        lastCard = await getRandomCardByRarity(rareCards, 'R');
      }
    } else {
      // 52% chance de R
      lastCard = await getRandomCardByRarity(rareCards, 'R');
    }

    if (lastCard) booster.push(lastCard);

    console.log('Booster généré avec succès:', booster.map(card => ({
      name: card.name,
      rarity: card.rarity,
      type: card.type,
      imageUrl: card.imageUrl
    })));

    return NextResponse.json({ booster });
  } catch (error) {
    console.error('Erreur lors de la génération du booster:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du booster' },
      { status: 500 }
    );
  }
} 