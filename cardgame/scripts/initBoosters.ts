import { PrismaClient } from '@prisma/client';
import { SET_RULES } from './configureSetRules';

const prisma = new PrismaClient();

// Fonction pour normaliser le code du set
function normalizeSetCode(setCode: string): string {
  // Si le code est au format OP09, le convertir en OP-09
  if (setCode.match(/^OP\d{2}$/)) {
    return `OP-${setCode.substring(2)}`;
  }
  return setCode;
}

// Fonction pour obtenir les deux formats possibles d'un code de set
function getSetCodeVariants(setCode: string): string[] {
  const variants = [setCode];
  if (setCode.match(/^OP\d{2}$/)) {
    variants.push(`OP-${setCode.substring(2)}`);
  } else if (setCode.match(/^OP-\d{2}$/)) {
    variants.push(`OP${setCode.substring(3)}`);
  }
  return variants;
}

async function initBoosters() {
  console.log('Initialisation des boosters...\n');

  try {
    // Parcourir tous les sets définis dans SET_RULES
    for (const setCode in SET_RULES) {
      const variants = getSetCodeVariants(setCode);
      console.log(`\nConfiguration des règles pour le set ${variants.join(' / ')}...`);

      // Vérifier si le set existe déjà (essayer les deux formats)
      let set = null;
      for (const variant of variants) {
        set = await prisma.cardSet.findUnique({
          where: { code: variant }
        });
        if (set) break;
      }

      if (!set) {
        // Créer le set s'il n'existe pas
        set = await prisma.cardSet.create({
          data: {
            code: variants[0], // Utiliser le premier format comme code principal
            name: `Set ${variants[0]}`,
            releaseDate: new Date(),
            description: `Booster pack pour le set ${variants[0]}`
          }
        });
        console.log(`Set ${variants[0]} créé`);
      }

      // Vérifier si le booster existe déjà (essayer les deux formats)
      let booster = null;
      for (const variant of variants) {
        booster = await prisma.booster.findFirst({
          where: { setCode: variant }
        });
        if (booster) break;
      }

      if (!booster) {
        // Créer le booster s'il n'existe pas
        booster = await prisma.booster.create({
          data: {
            name: `Booster ${variants[0]}`,
            description: `Booster pack pour le set ${variants[0]}`,
            price: 4.99,
            setCode: variants[0] // Utiliser le premier format comme code principal
          }
        });
        console.log(`Booster créé pour le set ${variants[0]}`);
      }

      // Récupérer toutes les cartes du set (essayer les deux formats)
      let cards: any[] = [];
      for (const variant of variants) {
        const setCards = await prisma.card.findMany({
          where: { setCode: variant }
        });
        cards = cards.concat(setCards);
      }

      console.log(`${cards.length} cartes trouvées pour le set ${variants.join(' / ')}`);

      // Ajouter les cartes au booster avec leurs probabilités
      for (const card of cards) {
        const probability = calculateProbability(card.rarity);
        await prisma.boosterCard.upsert({
          where: {
            boosterId_cardId: {
              boosterId: booster.id,
              cardId: card.id
            }
          },
          update: {
            probability
          },
          create: {
            boosterId: booster.id,
            cardId: card.id,
            probability
          }
        });
      }
    }

    console.log('\nInitialisation des boosters terminée avec succès !');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des boosters:', error);
  }
}

function calculateProbability(rarity: string): number {
  switch (rarity) {
    case 'C':
      return 0.7; // 70% pour les communes
    case 'UC':
      return 0.2; // 20% pour les peu communes
    case 'R':
      return 0.07; // 7% pour les rares
    case 'SR':
      return 0.02; // 2% pour les super rares
    case 'L':
      return 0.005; // 0.5% pour les légendaires
    case 'SEC':
      return 0.001; // 0.1% pour les secrètes
    case 'TR':
      return 0.001; // 0.1% pour les TR
    case 'SP CARD':
      return 0.001; // 0.1% pour les SP CARD
    case 'P':
      return 0.001; // 0.1% pour les P
    default:
      return 0.1; // Valeur par défaut
  }
}

// Exécuter l'initialisation
initBoosters()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 