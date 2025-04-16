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
function shouldBeAltArt(rarity: string): boolean {
  const rarityInfo = generationRates.rarity[rarity];
  if (!rarityInfo) return false;
  return Math.random() < rarityInfo.altArtRate;
}

// Fonction pour obtenir une version alternative d'une carte
function getAlternativeVersion(card: Card, cardsByRarity: Record<string, Card[]>): Card | null {
  const altCard = cardsByRarity[card.rarity].find(c => 
    c.id.includes('_p') && c.code === card.code
  );
  return altCard || null;
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
      'SP CARD': cards.filter(card => card.rarity === 'SP CARD'),
      TR: cards.filter(card => card.rarity === 'TR')
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
        if (shouldBeAltArt('C')) {
          const altCard = getAlternativeVersion(card, cardsByRarity);
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
        if (shouldBeAltArt('UC')) {
          const altCard = getAlternativeVersion(card, cardsByRarity);
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
        if (card && shouldBeAltArt('R')) {
          const altCard = getAlternativeVersion(card, cardsByRarity);
          if (altCard) {
            booster.push(altCard);
            continue;
          }
        }
      } else {
        // 30% chance de UC
        card = await getRandomCardByRarity(cardsByRarity.UC, 'UC');
        if (card && shouldBeAltArt('UC')) {
          const altCard = getAlternativeVersion(card, cardsByRarity);
          if (altCard) {
            booster.push(altCard);
            continue;
          }
        }
      }

      if (card) booster.push(card);
    }

    // Slot 10: 1 carte rare ou super rare
    const random10 = Math.random();
    let card10;

    if (random10 < 0.8 && cardsByRarity.R.length > 0) {
      // 80% chance de R
      card10 = await getRandomCardByRarity(cardsByRarity.R, 'R');
      if (card10 && shouldBeAltArt('R')) {
        const altCard = getAlternativeVersion(card10, cardsByRarity);
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
      if (card10 && shouldBeAltArt('SR')) {
        const altCard = getAlternativeVersion(card10, cardsByRarity);
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
      if (card10 && shouldBeAltArt('R')) {
        const altCard = getAlternativeVersion(card10, cardsByRarity);
        if (altCard) {
          booster.push(altCard);
        } else {
          booster.push(card10);
        }
      } else if (card10) {
        booster.push(card10);
      }
    }

    // Slot 11: 1 carte bonus (SR, SEC, ou L)
    const bonusCards = [...cardsByRarity.SR, ...cardsByRarity.SEC, ...cardsByRarity.L];
    if (bonusCards.length > 0) {
      const randomBonus = Math.random();
      let cardBonus;

      if (randomBonus < 0.6 && cardsByRarity.SR.length > 0) {
        // 60% chance de SR
        cardBonus = await getRandomCardByRarity(cardsByRarity.SR, 'SR');
        if (cardBonus && shouldBeAltArt('SR')) {
          const altCard = getAlternativeVersion(cardBonus, cardsByRarity);
          if (altCard) {
            booster.push(altCard);
          } else {
            booster.push(cardBonus);
          }
        } else if (cardBonus) {
          booster.push(cardBonus);
        }
      } else if (randomBonus < 0.9 && cardsByRarity.SEC.length > 0) {
        // 30% chance de SEC
        cardBonus = await getRandomCardByRarity(cardsByRarity.SEC, 'SEC');
        if (cardBonus && shouldBeAltArt('SEC')) {
          const altCard = getAlternativeVersion(cardBonus, cardsByRarity);
          if (altCard) {
            booster.push(altCard);
          } else {
            booster.push(cardBonus);
          }
        } else if (cardBonus) {
          booster.push(cardBonus);
        }
      } else if (cardsByRarity.L.length > 0) {
        // 10% chance de L
        cardBonus = await getRandomCardByRarity(cardsByRarity.L, 'L');
        if (cardBonus && shouldBeAltArt('L')) {
          const altCard = getAlternativeVersion(cardBonus, cardsByRarity);
          if (altCard) {
            booster.push(altCard);
          } else {
            booster.push(cardBonus);
          }
        } else if (cardBonus) {
          booster.push(cardBonus);
        }
      } else if (cardsByRarity.SR.length > 0) {
        // Fallback sur SR si pas de SEC ou L
        cardBonus = await getRandomCardByRarity(cardsByRarity.SR, 'SR');
        if (cardBonus && shouldBeAltArt('SR')) {
          const altCard = getAlternativeVersion(cardBonus, cardsByRarity);
          if (altCard) {
            booster.push(altCard);
          } else {
            booster.push(cardBonus);
          }
        } else if (cardBonus) {
          booster.push(cardBonus);
        }
      }
    }

    // Slot 12: 1 carte obligatoire (parallèle rare ou C/UC si pas de chance)
    if (cardsByRarity.P.length > 0) {
      // 30% chance d'avoir une carte parallèle
      const randomParallel = Math.random();
      if (randomParallel < 0.3) {
        const cardParallel = cardsByRarity.P[Math.floor(Math.random() * cardsByRarity.P.length)];
        if (cardParallel) booster.push(cardParallel);
      } else {
        // 70% chance d'avoir une carte C ou UC
        const randomCommon = Math.random();
        if (randomCommon < 0.7 && cardsByRarity.C.length > 0) {
          // 70% chance de C
          const cardCommon = await getRandomCardByRarity(cardsByRarity.C, 'C');
          if (cardCommon) {
            if (shouldBeAltArt('C')) {
              const altCard = getAlternativeVersion(cardCommon, cardsByRarity);
              if (altCard) {
                booster.push(altCard);
              } else {
                booster.push(cardCommon);
              }
            } else {
              booster.push(cardCommon);
            }
          }
        } else if (cardsByRarity.UC.length > 0) {
          // 30% chance de UC
          const cardUncommon = await getRandomCardByRarity(cardsByRarity.UC, 'UC');
          if (cardUncommon) {
            if (shouldBeAltArt('UC')) {
              const altCard = getAlternativeVersion(cardUncommon, cardsByRarity);
              if (altCard) {
                booster.push(altCard);
              } else {
                booster.push(cardUncommon);
              }
            } else {
              booster.push(cardUncommon);
            }
          }
        } else if (cardsByRarity.C.length > 0) {
          // Fallback sur C si pas de UC
          const cardCommon = await getRandomCardByRarity(cardsByRarity.C, 'C');
          if (cardCommon) {
            if (shouldBeAltArt('C')) {
              const altCard = getAlternativeVersion(cardCommon, cardsByRarity);
              if (altCard) {
                booster.push(altCard);
              } else {
                booster.push(cardCommon);
              }
            } else {
              booster.push(cardCommon);
            }
          }
        }
      }
    } else {
      // Si pas de cartes parallèles, on prend une carte C ou UC
      const randomCommon = Math.random();
      if (randomCommon < 0.7 && cardsByRarity.C.length > 0) {
        // 70% chance de C
        const cardCommon = await getRandomCardByRarity(cardsByRarity.C, 'C');
        if (cardCommon) {
          if (shouldBeAltArt('C')) {
            const altCard = getAlternativeVersion(cardCommon, cardsByRarity);
            if (altCard) {
              booster.push(altCard);
            } else {
              booster.push(cardCommon);
            }
          } else {
            booster.push(cardCommon);
          }
        }
      } else if (cardsByRarity.UC.length > 0) {
        // 30% chance de UC
        const cardUncommon = await getRandomCardByRarity(cardsByRarity.UC, 'UC');
        if (cardUncommon) {
          if (shouldBeAltArt('UC')) {
            const altCard = getAlternativeVersion(cardUncommon, cardsByRarity);
            if (altCard) {
              booster.push(altCard);
            } else {
              booster.push(cardUncommon);
            }
          } else {
            booster.push(cardUncommon);
          }
        }
      } else if (cardsByRarity.C.length > 0) {
        // Fallback sur C si pas de UC
        const cardCommon = await getRandomCardByRarity(cardsByRarity.C, 'C');
        if (cardCommon) {
          if (shouldBeAltArt('C')) {
            const altCard = getAlternativeVersion(cardCommon, cardsByRarity);
            if (altCard) {
              booster.push(altCard);
            } else {
              booster.push(cardCommon);
            }
          } else {
            booster.push(cardCommon);
          }
        }
      }
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