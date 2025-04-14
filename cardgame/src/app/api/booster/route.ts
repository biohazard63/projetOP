import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fonction pour obtenir une carte aléatoire d'une rareté spécifique
async function getRandomCardByRarity(cards: any[], rarity: string) {
  const rarityCards = cards.filter(card => card.rarity === rarity);
  if (rarityCards.length === 0) {
    console.log(`Aucune carte trouvée pour la rareté ${rarity}`);
    return null;
  }
  const randomCard = rarityCards[Math.floor(Math.random() * rarityCards.length)];
  console.log(`Carte ${rarity} sélectionnée:`, randomCard.name);
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

    console.log('Répartition des cartes par rareté:', {
      C: commonCards.length,
      UC: uncommonCards.length,
      R: rareCards.length,
      SR: superRareCards.length,
      SEC: secretCards.length
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

    // 2 cartes rares
    for (let i = 0; i < 2; i++) {
      const card = await getRandomCardByRarity(rareCards, 'R');
      if (card) booster.push(card);
    }

    // 1 carte SR ou SEC (5% de chance pour SEC)
    const isSecret = Math.random() < 0.05;
    const lastCard = await getRandomCardByRarity(
      isSecret ? secretCards : superRareCards,
      isSecret ? 'SEC' : 'SR'
    );
    if (lastCard) booster.push(lastCard);

    console.log('Booster généré avec succès:', booster.map(card => ({
      name: card.name,
      rarity: card.rarity,
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