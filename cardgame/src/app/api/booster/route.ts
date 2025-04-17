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
  set: string;
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

// Liste des cartes ultra rares
const ULTRA_RARE_CARDS = [
  "EB01-006_p2", "EB01-006_p5", "EB01-061", "EB01-061_p1", "OP01-001_p2", "OP01-005_p2", "OP01-006_p2", "OP01-006_p3", "OP01-006_p4", "OP01-006_p5", "OP01-013_p2", "OP01-013_p3", "OP01-016_p2", "OP01-016_p3", "OP01-016_p4", "OP01-016_p5", "OP01-021_p2", "OP01-021_p3", "OP01-024_p2", "OP01-024_p3", "OP01-025_p2", "OP01-029_p2", "OP01-029_p3", "OP01-033_p2", "OP01-033_p3", "OP01-033_p4", "OP01-033_p5", "OP01-035_p2", "OP01-041_p2", "OP01-041_p3", "OP01-041_p4", "OP01-041_p5", "OP01-047_p2", "OP01-047_p3", "OP01-047_p4", "OP01-051_p2", "OP01-051_p3", "OP01-051_p4", "OP01-052_p2", "OP01-052_p3", "OP01-052_p4", "OP01-060_p2", "OP01-070_p3", "OP01-070_p4", "OP01-073_p2", "OP01-073_p3", "OP01-078_p2", "OP01-078_p3", "OP01-078_p4", "OP01-120", "OP01-120_p1", "OP01-120_p2", "OP01-120_p3", "OP01-120_p4", "OP01-120_p5", "OP01-121", "OP01-121_p1", "OP01-121_p2", "OP01-121_p3", "OP01-121_p4", "OP02-001_p2", "OP02-004_p2", "OP02-004_p3", "OP02-004_p4", "OP02-013_p2", "OP02-013_p3", "OP02-013_p4", "OP02-015_p2", "OP02-015_p3", "OP02-015_p4", "OP02-018_p2", "OP02-018_p3", "OP02-018_p4", "OP02-018_p5", "OP02-035_p2", "OP02-041_p2", "OP02-059_p2", "OP02-085_p2", "OP02-089_p2", "OP02-089_p3", "OP02-089_p4", "OP02-093_p2", "OP02-096_p2", "OP02-096_p3", "OP02-098_p2", "OP02-099_p2", "OP02-099_p3", "OP02-099_p4", "OP02-106_p2", "OP02-106_p3", "OP02-106_p4", "OP02-106_p5", "OP02-108_p2", "OP02-114_p2", "OP02-114_p3", "OP02-117_p3", "OP02-117_p4", "OP02-117_p5", "OP02-120", "OP02-120_p1", "OP02-120_p2", "OP02-121", "OP02-121_p1", "OP02-121_p2", "OP02-121_p3", "OP03-001_p2", "OP03-003_p1", "OP03-003_p2", "OP03-003_p3", "OP03-003_p4", "OP03-003_p5", "OP03-008_p1", "OP03-055_p2", "OP03-055_p3", "OP03-056_p2", "OP03-056_p3", "OP03-056_p4", "OP03-057_p2", "OP03-057_p3", "OP03-057_p4", "OP03-060_p2", "OP03-060_p3", "OP03-078_p2", "OP03-079_p2", "OP03-079_p3", "OP03-079_p4", "OP03-089_p2", "OP03-089_p3", "OP03-089_p4", "OP03-089_p5", "OP03-092_p2", "OP03-094_p2", "OP03-094_p3", "OP03-099_p2", "OP03-108_p2", "OP03-108_p3", "OP03-110_p2", "OP03-110_p3", "OP03-110_p4", "OP03-110_p5", "OP03-112_p4", "OP03-112_p5", "OP03-113_p2", "OP03-113_p3", "OP03-114_p2", "OP03-116_p4", "OP03-116_p5", "OP03-121_p2", "OP03-121_p3", "OP03-121_p4", "OP03-122", "OP03-122_p1", "OP03-122_p2", "OP03-122_p3", "OP03-123", "OP03-123_p1", "OP03-123_p3", "OP03-123_p4", "OP04-024_p2", "OP04-029_p2", "OP04-029_p3", "OP04-031_p2", "OP04-031_p3", "OP04-032_p2", "OP04-032_p3", "OP04-036_p2", "OP04-036_p3", "OP04-044_p2", "OP04-044_p3", "OP04-044_p4", "OP04-056_p2", "OP04-056_p3", "OP04-056_p4", "OP04-064_p2", "OP04-083_p2", "OP04-083_p3", "OP04-083_p4", "OP04-089_p2", "OP04-089_p3", "OP04-089_p4", "OP04-095_p2", "OP04-095_p3", "OP04-100_p2", "OP04-100_p3", "OP04-100_p4", "OP04-100_p5", "OP04-104_p2", "OP04-104_p3", "OP04-112_p2", "OP04-112_p3", "OP04-118", "OP04-118_p1", "OP04-119", "OP04-119_p1", "OP04-119_p2", "OP05-006_p2", "OP05-006_p3", "OP05-007_p2", "OP05-007_p3", "OP05-010_p2", "OP05-010_p3", "OP05-015_p2", "OP05-015_p3", "OP05-015_p4", "OP05-015_p5", "OP05-034_p2", "OP05-034_p3", "OP05-034_p4", "OP05-034_p5", "OP05-043_p2", "OP05-043_p3", "OP05-051_p2", "OP05-057_p2", "OP05-057_p3", "OP05-057_p4", "OP05-060_p3", "OP05-067_p3", "OP05-067_p4", "OP05-069_p2", "OP05-069_p3", "OP05-073_p2", "OP05-073_p3", "OP05-074_p2", "OP05-074_p3", "OP05-074_p4", "OP05-074_p5", "OP05-081_p2", "OP05-081_p3", "OP05-081_p4", "OP05-082_p2", "OP05-082_p3", "OP05-082_p4", "OP05-091_p2", "OP05-093_p2", "OP05-100_p2", "OP05-105_p2", "OP05-105_p3", "OP05-105_p4", "OP05-114_p2", "OP05-114_p3", "OP05-115_p2", "OP05-115_p3", "OP05-115_p4", "OP05-117_p2", "OP05-117_p3", "OP05-117_p4", "OP05-118", "OP05-118_p1", "OP05-118_p2", "OP05-118_p3", "OP05-119", "OP05-119_p1", "OP05-119_p2", "OP05-119_p3", "OP05-119_p4", "OP05-119_p5", "OP05-119_p6", "OP06-003_p2", "OP06-003_p3", "OP06-023_p2", "OP06-023_p3", "OP06-023_p4", "OP06-035_p2", "OP06-035_p3", "OP06-036_p2", "OP06-036_p3", "OP06-036_p4", "OP06-038_p2", "OP06-038_p3", "OP06-056_p2", "OP06-056_p3", "OP06-060_p2", "OP06-060_p3", "OP06-064_p2", "OP06-064_p3", "OP06-065_p2", "OP06-065_p3", "OP06-065_p4", "OP06-066_p2", "OP06-066_p3", "OP06-067_p2", "OP06-067_p3", "OP06-067_p4", "OP06-068_p2", "OP06-068_p3", "OP06-069_p3", "OP06-069_p4", "OP06-079_p2", "OP06-079_p3", "OP06-079_p4", "OP06-086_p2", "OP06-086_p3", "OP06-091_p2", "OP06-091_p3", "OP06-100_p2", "OP06-100_p3", "OP06-101_p2", "OP06-106_p2", "OP06-106_p3", "OP06-110_p2", "OP06-110_p3", "OP06-110_p4", "OP06-114_p2", "OP06-114_p3", "OP06-118", "OP06-118_p1", "OP06-118_p2", "OP06-118_p3", "OP06-119", "OP06-119_p1", "OP07-015_p2", "OP07-051_p2", "OP07-051_p3", "OP07-109_p2", "OP07-118", "OP07-118_p1", "OP07-119", "OP07-119_p1", "OP08-106_p2", "OP08-118", "OP08-118_p1", "OP08-118_p2", "OP08-119", "OP08-119_p1", "OP09-004_p2", "OP09-004_p3", "OP09-051_p2", "OP09-051_p3", "OP09-093_p2", "OP09-093_p3", "OP09-118", "OP09-118_p1", "OP09-118_p2", "OP09-119", "OP09-119_p1", "OP09-119_p2", "P-001_p2", "P-001_p3", "P-001_p4", "P-014_p2", "P-014_p3", "P-029_p2", "P-029_p3", "P-029_p4", "P-041_p2", "P-053_p2", "P-053_p3", "P-055_p2", "P-055_p3", "ST01-002_p2", "ST01-004_p2", "ST01-005_p2", "ST01-006_p2", "ST01-006_p3", "ST01-006_p5", "ST01-007_p2", "ST01-007_p3", "ST01-008_p2", "ST01-011_p2", "ST01-012_p1", "ST01-012_p2", "ST01-012_p3", "ST01-012_p4", "ST01-013_p2", "ST01-014_p2", "ST01-014_p3", "ST02-004_p2", "ST02-004_p3", "ST02-004_p4", "ST02-007_p2", "ST03-004_p1", "ST03-004_p2", "ST03-005_p2", "ST03-005_p3", "ST03-005_p4", "ST03-005_p5", "ST03-008_p2", "ST03-008_p4", "ST03-008_p5", "ST03-009_p1", "ST03-013_p2", "ST03-013_p3", "ST03-013_p4", "ST04-003_p1", "ST04-003_p2", "ST04-003_p3", "ST04-003_p4", "ST04-005_p1", "ST04-005_p2", "ST04-005_p3", "ST04-005_p4", "ST04-016_p2", "ST04-016_p3", "ST06-006_p2", "ST06-010_p2", "ST06-010_p3", "ST06-014_p2", "ST06-014_p3", "ST07-007_p2", "ST07-007_p3", "ST09-014_p2", "ST09-014_p3", "ST10-010_p2", "ST10-010_p3", "ST10-010_p4", "ST11-003_p2", "ST11-004_p2", "ST11-005_p2", "ST12-014_p2", "ST12-014_p3"
];

// Fonction pour vérifier si une carte est ultra rare
function isUltraRareCard(card: Card): boolean {
  // Vérifier si la carte est dans la liste des ultra rares
  if (ULTRA_RARE_CARDS.includes(card.code)) return true;
  
  // Vérifier si c'est une carte promotionnelle (P-001 à P-060)
  if (card.code.startsWith('P-')) return true;
  
  // Vérifier si c'est une SP Card (SP-001 à SP-043)
  if (card.code.startsWith('SP-')) return true;
  
  // Vérifier si c'est une carte avec _p3 ou plus
  if (card.imageUrl && /_p[3-9]/.test(card.imageUrl)) return true;
  
  // Vérifier si c'est une carte SEC
  if (card.rarity === 'SEC') return true;
  
  return false;
}

// Fonction pour obtenir les cartes ultra rares d'un set spécifique
function getUltraRareCardsForSet(cards: Card[], set: string): Card[] {
  return cards.filter(card => isUltraRareCard(card) && card.set === set);
}

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
    // Seules les versions _p1 et _p2 sont disponibles hors du slot 12
    // Les versions _p3 et plus sont uniquement disponibles dans le slot 12
    return isSlot12 ? true : version <= 2;
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
        imageUrl: true,
        set: true
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

    // Obtenir les cartes ultra rares pour ce set
    const ultraRareCardsForSet = getUltraRareCardsForSet(cards, set);
    console.log(`Nombre de cartes ultra rares trouvées pour le set ${set}:`, ultraRareCardsForSet.length);

    // Générer le booster
    const booster: Card[] = [];
    
    // Variables pour suivre les cartes SR et alternatives
    let hasSRCard = false;
    let hasAltArtCard = false;

    // Slots 1-5: 5 cartes communes
    for (let i = 0; i < 5; i++) {
      const card = await getRandomCardByRarity(cardsByRarity.C, 'C');
      if (card) {
        if (!hasAltArtCard && shouldBeAltArt(card.rarity, card.id)) {
          const altCard = getAlternativeVersion(card, cardsByRarity, false);
          if (altCard) {
            booster.push(altCard);
            hasAltArtCard = true;
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
        if (!hasAltArtCard && shouldBeAltArt(card.rarity, card.id)) {
          const altCard = getAlternativeVersion(card, cardsByRarity, false);
          if (altCard) {
            booster.push(altCard);
            hasAltArtCard = true;
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
          if (!hasAltArtCard && shouldBeAltArt(card.rarity, card.id)) {
            const altCard = getAlternativeVersion(card, cardsByRarity, false);
            if (altCard) {
              booster.push(altCard);
              hasAltArtCard = true;
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
          if (!hasAltArtCard && shouldBeAltArt(card.rarity, card.id)) {
            const altCard = getAlternativeVersion(card, cardsByRarity, false);
            if (altCard) {
              booster.push(altCard);
              hasAltArtCard = true;
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
      if (card10) {
        if (!hasAltArtCard && shouldBeAltArt(card10.rarity, card10.id)) {
          const altCard = getAlternativeVersion(card10, cardsByRarity, false);
          if (altCard) {
            booster.push(altCard);
            hasAltArtCard = true;
          } else {
            booster.push(card10);
          }
        } else {
          booster.push(card10);
        }
      }
    } else if (!hasSRCard && cardsByRarity.SR.length > 0) {
      // 20% chance de SR seulement si on n'a pas déjà une SR
      card10 = await getRandomCardByRarity(cardsByRarity.SR, 'SR');
      if (card10) {
        if (!hasAltArtCard && shouldBeAltArt(card10.rarity, card10.id)) {
          const altCard = getAlternativeVersion(card10, cardsByRarity, false);
          if (altCard) {
            booster.push(altCard);
            hasAltArtCard = true;
            hasSRCard = true;
          } else {
            booster.push(card10);
            hasSRCard = true;
          }
        } else {
          booster.push(card10);
          hasSRCard = true;
        }
      } else if (cardsByRarity.R.length > 0) {
        // Fallback sur R si pas de SR
        card10 = await getRandomCardByRarity(cardsByRarity.R, 'R');
        if (card10) {
          if (!hasAltArtCard && shouldBeAltArt(card10.rarity, card10.id)) {
            const altCard = getAlternativeVersion(card10, cardsByRarity, false);
            if (altCard) {
              booster.push(altCard);
              hasAltArtCard = true;
            } else {
              booster.push(card10);
            }
          } else {
            booster.push(card10);
          }
        }
      }
    }

    // Slot 11: 1 carte bonus (R, SR, SEC, ou L)
    const bonusRarity = Math.random();
    let cardBonus;

    if (bonusRarity < 0.80 && !hasSRCard) { // 80% SR seulement si on n'a pas déjà une SR
      cardBonus = await getRandomCardByRarity(cardsByRarity.SR, 'SR');
      if (cardBonus) {
        hasSRCard = true;
      }
    } else if (bonusRarity < 0.95) { // 15% L
      cardBonus = await getRandomCardByRarity(cardsByRarity.L, 'L');
    } else if (bonusRarity < 1.00) { // 5% SEC
      cardBonus = await getRandomCardByRarity(cardsByRarity.SEC, 'SEC');
    } else {
      cardBonus = await getRandomCardByRarity(cardsByRarity.R, 'R'); // Fallback to R if no SR or L
    }

    if (cardBonus) {
      if (!hasAltArtCard && shouldBeAltArt(cardBonus.rarity, cardBonus.id)) {
        const altCard = getAlternativeVersion(cardBonus, cardsByRarity, false);
        if (altCard) {
          booster.push(altCard);
          hasAltArtCard = true;
        } else {
          booster.push(cardBonus);
        }
      } else {
        booster.push(cardBonus);
      }
    }

    // Slot 12: 1 carte obligatoire (toutes raretés possibles)
    const mandatoryRarity = Math.random();
    let card12;

    // 5% de chance d'obtenir une carte ultra rare si disponible pour ce set
    if (mandatoryRarity < 0.05 && ultraRareCardsForSet.length > 0) {
      console.log("Tentative d'obtenir une carte ultra rare pour le slot 12");
      const randomIndex = Math.floor(Math.random() * ultraRareCardsForSet.length);
      card12 = ultraRareCardsForSet[randomIndex];
      console.log(`Carte ultra rare sélectionnée: ${card12.name} (${card12.code})`);
    } else if (mandatoryRarity < 0.15 && cardsByRarity['SP CARD'].length > 0) { // 10% SP CARD
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
    } else if (mandatoryRarity < 0.35 && cardsByRarity.P.length > 0) { // 20% chance for parallel
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
    } else if (mandatoryRarity < 0.75 && cardsByRarity.C.length > 0) { // 40% C
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
    } else if (cardsByRarity.UC.length > 0) { // 25% UC
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

    // Si une carte ultra rare a été sélectionnée, l'ajouter au booster
    if (card12 && isUltraRareCard(card12)) {
      booster.push(card12);
      console.log(`Carte ultra rare ajoutée au booster: ${card12.name} (${card12.code})`);
    }

    // Vérification finale du nombre de cartes
    if (booster.length < 12) {
      console.warn(`Attention: Le booster ne contient que ${booster.length} cartes au lieu de 12`);
    }

    // Log des cartes générées
    console.log('Booster généré avec succès:', booster.map(card => ({
      id: card.id,
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