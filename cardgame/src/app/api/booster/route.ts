import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCardRarityLevel } from '@/lib/cardRarity';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Types pour les cartes et les règles de génération
type Card = {
  id: string;
  name: string;
  type: string;
  rarity: string;
  code: string;
  imageUrl: string;
};

type RarityDistribution = {
  rarity: string;
  count: number;
  percentage: number;
};

type GenerationRules = {
  normalPack: {
    totalCards: number;
    distribution: RarityDistribution[];
  };
  altArtRules: {
    canReplace: string[];
    replacementRate: number;
  };
};

// Charger les règles de génération
const generationRates = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'public', 'card-generation-rates.json'), 'utf-8')
) as {
  rarity: Record<string, {
    description: string;
    count: number;
    percentage: number;
    dropRate: number;
    altArtRate: number;
    alternativeCount: number;
    alternativePercentage: number;
  }>;
  generationRules: GenerationRules;
};

// Fonction pour obtenir une carte aléatoire d'une rareté spécifique
async function getRandomCardByRarity(cards: Card[], rarity: string, type?: string): Promise<Card | null> {
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

// Fonction pour vérifier si une carte doit être une version alternative
function shouldBeAltArt(rarity: string, cardId: string): boolean {
  const rarityInfo = generationRates.rarity[rarity];
  if (!rarityInfo) return false;

  // Vérifier si c'est déjà une version alternative
  if (cardId.includes('_p')) {
    const version = parseInt(cardId.split('_p')[1]);
    // Plus le numéro de version est élevé, plus c'est rare
    const baseRate = rarityInfo.altArtRate;
    const versionRate = baseRate / Math.pow(2, version - 1);
    return Math.random() < versionRate;
  }

  return Math.random() < rarityInfo.altArtRate;
}

// Fonction pour obtenir une version alternative d'une carte
function getAlternativeVersion(card: Card, cardsByRarity: Record<string, Card[]>, isSlot12: boolean = false): Card | null {
  // Récupérer toutes les versions alternatives de la carte
  const altCards = cardsByRarity[card.rarity].filter(c => 
    c.id.includes('_p') && c.code === card.code
  );

  if (altCards.length === 0) return null;

  // Trier les versions alternatives par ordre croissant (_p1, _p2, etc.)
  altCards.sort((a, b) => {
    const versionA = parseInt(a.id.split('_p')[1]);
    const versionB = parseInt(b.id.split('_p')[1]);
    return versionA - versionB;
  });

  // Filtrer les versions selon le slot
  const availableVersions = altCards.filter(altCard => {
    const version = parseInt(altCard.id.split('_p')[1]);
    return isSlot12 || version <= 2; // Seules les versions _p1 et _p2 sont disponibles hors du slot 12
  });

  if (availableVersions.length === 0) return null;

  // Sélectionner une version en fonction de sa rareté
  const random = Math.random();
  let cumulativeRate = 0;
  const baseRate = generationRates.rarity[card.rarity].altArtRate;

  for (let i = 0; i < availableVersions.length; i++) {
    const version = parseInt(availableVersions[i].id.split('_p')[1]);
    const versionRate = baseRate / Math.pow(2, version - 1);
    cumulativeRate += versionRate;

    if (random < cumulativeRate) {
      return availableVersions[i];
    }
  }

  // Si aucune version n'est sélectionnée, retourner la première version disponible
  return availableVersions[0];
}

export async function POST(request: Request) {
  try {
    const { set } = await request.json();
    console.log('Set sélectionné:', set);

    // Récupérer toutes les cartes du set
    const cards = await prisma.card.findMany({
      where: {
        set: set
      },
      select: {
        id: true,
        name: true,
        code: true,
        rarity: true,
        type: true,
        imageUrl: true
      }
    }) as Card[];

    console.log(`Nombre total de cartes trouvées pour le set ${set}:`, cards.length);

    // Trier les cartes par rareté
    const cardsByRarity: Record<string, Card[]> = {
      C: cards.filter(card => card.rarity === 'C'),
      UC: cards.filter(card => card.rarity === 'UC'),
      R: cards.filter(card => card.rarity === 'R'),
      SR: cards.filter(card => card.rarity === 'SR'),
      L: cards.filter(card => card.rarity === 'L'),
      SEC: cards.filter(card => card.rarity === 'SEC'),
      P: cards.filter(card => card.rarity === 'P'),
      'SP CARD': cards.filter(card => card.rarity === 'SP CARD')
    };

    console.log('Répartition des cartes par rareté:', Object.fromEntries(
      Object.entries(cardsByRarity).map(([rarity, cards]) => [rarity, cards.length])
    ));

    // Générer le booster
    const booster: Card[] = [];

    // Slots 1-5: 5 cartes communes
    for (let i = 0; i < 5; i++) {
      const card = await getRandomCardByRarity(cardsByRarity.C, 'C');
      if (card) {
        if (shouldBeAltArt(card.rarity, card.id)) {
          const altCard = getAlternativeVersion(card, cardsByRarity, false);
          if (altCard) {
            booster.push(altCard);
            continue;
          }
        }
        booster.push(card);
      }
    }

    // Slots 6-7: 2 cartes peu communes
    for (let i = 0; i < 2; i++) {
      const card = await getRandomCardByRarity(cardsByRarity.UC, 'UC');
      if (card) {
        if (shouldBeAltArt(card.rarity, card.id)) {
          const altCard = getAlternativeVersion(card, cardsByRarity, false);
          if (altCard) {
            booster.push(altCard);
            continue;
          }
        }
        booster.push(card);
      }
    }

    // Slots 8-9: 2 cartes rares ou peu communes
    for (let i = 0; i < 2; i++) {
      const random = Math.random();
      let card;

      if (random < 0.7 && cardsByRarity.R.length > 0) {
        // 70% chance de R
        card = await getRandomCardByRarity(cardsByRarity.R, 'R');
        if (card) {
          if (shouldBeAltArt(card.rarity, card.id)) {
            const altCard = getAlternativeVersion(card, cardsByRarity, false);
            if (altCard) {
              booster.push(altCard);
            } else {
              booster.push(card);
            }
          } else {
            booster.push(card);
          }
        }
      } else if (cardsByRarity.UC.length > 0) {
        // 30% chance de UC
        card = await getRandomCardByRarity(cardsByRarity.UC, 'UC');
        if (card) {
          if (shouldBeAltArt(card.rarity, card.id)) {
            const altCard = getAlternativeVersion(card, cardsByRarity, false);
            if (altCard) {
              booster.push(altCard);
            } else {
              booster.push(card);
            }
          } else {
            booster.push(card);
          }
        }
      }
    }

    // Slot 10: 1 carte rare ou super rare
    const random10 = Math.random();
    let card10;

    if (random10 < 0.8 && cardsByRarity.R.length > 0) {
      // 80% chance de R
      card10 = await getRandomCardByRarity(cardsByRarity.R, 'R');
      if (card10 && shouldBeAltArt(card10.rarity, card10.id)) {
        const altCard = getAlternativeVersion(card10, cardsByRarity, false);
        if (altCard) {
          booster.push(altCard);
        } else {
          booster.push(card10);
        }
      } else if (card10) {
        booster.push(card10);
      }
    } else if (cardsByRarity.SR.length > 0) {
      // 20% chance de SR
      card10 = await getRandomCardByRarity(cardsByRarity.SR, 'SR');
      if (card10 && shouldBeAltArt(card10.rarity, card10.id)) {
        const altCard = getAlternativeVersion(card10, cardsByRarity, false);
        if (altCard) {
          booster.push(altCard);
        } else {
          booster.push(card10);
        }
      } else if (card10) {
        booster.push(card10);
      }
    } else if (cardsByRarity.R.length > 0) {
      // Fallback sur R si pas de SR
      card10 = await getRandomCardByRarity(cardsByRarity.R, 'R');
      if (card10 && shouldBeAltArt(card10.rarity, card10.id)) {
        const altCard = getAlternativeVersion(card10, cardsByRarity, false);
        if (altCard) {
          booster.push(altCard);
        } else {
          booster.push(card10);
        }
      } else if (card10) {
        booster.push(card10);
      }
    }

    // Slot 11: 1 carte bonus (R, SR, SEC, ou L)
    const bonusRarity = Math.random();
    let cardBonus;

    if (bonusRarity < 0.80) { // 80% SR
      cardBonus = await getRandomCardByRarity(cardsByRarity.SR, 'SR');
    } else if (bonusRarity < 0.95) { // 15% L
      cardBonus = await getRandomCardByRarity(cardsByRarity.L, 'L');
    } else if (bonusRarity < 1.00) { // 5% SEC
      cardBonus = await getRandomCardByRarity(cardsByRarity.SEC, 'SEC');
    } else {
      cardBonus = await getRandomCardByRarity(cardsByRarity.SR, 'SR'); // Fallback to SR if no SEC or L
    }

    if (cardBonus && shouldBeAltArt(cardBonus.rarity, cardBonus.id)) {
      const altCard = getAlternativeVersion(cardBonus, cardsByRarity, false);
      if (altCard) {
        booster.push(altCard);
      } else {
        booster.push(cardBonus);
      }
    } else if (cardBonus) {
      booster.push(cardBonus);
    }

    // Slot 12: 1 carte obligatoire (toutes raretés possibles)
    const mandatoryRarity = Math.random();
    let card12;

    if (mandatoryRarity < 0.10 && cardsByRarity['SP CARD'].length > 0) { // 10% SP CARD
      card12 = await getRandomCardByRarity(cardsByRarity['SP CARD'], 'SP CARD');
      if (card12 && shouldBeAltArt(card12.rarity, card12.id)) {
        const altCard = getAlternativeVersion(card12, cardsByRarity, true);
        if (altCard) {
          booster.push(altCard);
        } else {
          booster.push(card12);
        }
      } else if (card12) {
        booster.push(card12);
      }
    } else if (mandatoryRarity < 0.30 && cardsByRarity.P.length > 0) { // 20% chance for parallel
      card12 = await getRandomCardByRarity(cardsByRarity.P, 'P');
      if (card12 && shouldBeAltArt(card12.rarity, card12.id)) {
        const altCard = getAlternativeVersion(card12, cardsByRarity, true);
        if (altCard) {
          booster.push(altCard);
        } else {
          booster.push(card12);
        }
      } else if (card12) {
        booster.push(card12);
      }
    } else if (mandatoryRarity < 0.70 && cardsByRarity.C.length > 0) { // 40% C
      card12 = await getRandomCardByRarity(cardsByRarity.C, 'C');
      if (card12 && shouldBeAltArt(card12.rarity, card12.id)) {
        const altCard = getAlternativeVersion(card12, cardsByRarity, true);
        if (altCard) {
          booster.push(altCard);
        } else {
          booster.push(card12);
        }
      } else if (card12) {
        booster.push(card12);
      }
    } else if (cardsByRarity.UC.length > 0) { // 30% UC
      card12 = await getRandomCardByRarity(cardsByRarity.UC, 'UC');
      if (card12 && shouldBeAltArt(card12.rarity, card12.id)) {
        const altCard = getAlternativeVersion(card12, cardsByRarity, true);
        if (altCard) {
          booster.push(altCard);
        } else {
          booster.push(card12);
        }
      } else if (card12) {
        booster.push(card12);
      }
    }

    // Fallback pour le slot 12 si aucune carte n'a été ajoutée
    if (booster.length < 12) {
      if (cardsByRarity.C.length > 0) {
        card12 = await getRandomCardByRarity(cardsByRarity.C, 'C');
        if (card12) booster.push(card12);
      } else if (cardsByRarity.UC.length > 0) {
        card12 = await getRandomCardByRarity(cardsByRarity.UC, 'UC');
        if (card12) booster.push(card12);
      }
    }

    // Vérification finale du nombre de cartes
    if (booster.length < 12) {
      console.warn(`Attention: Le booster ne contient que ${booster.length} cartes au lieu de 12`);
    }

    // Log des cartes générées
    console.log('Booster généré avec succès:', booster.map(card => ({
      name: card.name,
      rarity: card.rarity,
      type: card.type,
      isParallel: card.id.includes('_p')
    })));

    return NextResponse.json({ booster });
  } catch (error) {
    console.error('Erreur lors de la génération du booster:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du booster' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 