import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Quantités configurables via env
function getStarterQuantities() {
  const nonLeaders = parseInt(process.env.STARTER_ST_QTY_NON_LEADER || '4', 10);
  const leaders = parseInt(process.env.STARTER_ST_QTY_LEADER || '1', 10);
  return { nonLeaders, leaders };
}

async function findAllStarterCardsPrisma(prismaClient: PrismaClient) {
  // Cherche toutes les cartes des sets ST (code/setCode/set)
  const cards = await prismaClient.card.findMany({
    where: {
      OR: [
        { code: { startsWith: 'ST' } },
        { setCode: { startsWith: 'ST' } },
        { set: { contains: 'ST-' } },
      ]
    },
    select: { id: true, name: true, code: true, type: true }
  });
  return cards;
}

// Fonction pour ajouter les cartes de démarrage à un utilisateur
export async function addStarterDeckCardsToUser(userId: string): Promise<void> {
  try {
    console.log(`Début de l'ajout des cartes de démarrage à l'utilisateur ${userId}`);
    
    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.error(`Utilisateur ${userId} non trouvé`);
      return;
    }
    
    // Récupérer toutes les cartes ST depuis Prisma
    const stCards = await findAllStarterCardsPrisma(prisma);
    console.log(`Préparation de l'ajout de ${stCards.length} cartes ST (via Prisma)`);

    const { nonLeaders, leaders } = getStarterQuantities();
    let updated = 0;
    // 1. Ajouter/mettre à jour les cartes ST dans la collection de l'utilisateur
    for (const card of stCards) {
      const targetQty = card.type === 'LEADER' ? leaders : nonLeaders;
      try {
        await prisma.userCard.upsert({
          where: { userId_cardId: { userId, cardId: card.id } },
          update: { quantity: targetQty },
          create: { userId, cardId: card.id, quantity: targetQty }
        });
        updated++;
      } catch (error) {
        console.error(`Erreur lors de l'ajout de la carte ${card.id} à l'utilisateur ${userId}:`, error);
      }
    }
    console.log(`${updated} cartes ST ajoutées/mises à jour pour l'utilisateur`);
      
    // 2. Provision des decks: utiliser un template JSON si fourni, sinon fallback ST-*
    const templatePath = process.env.STARTER_DECKS_JSON
      ? (path.isAbsolute(process.env.STARTER_DECKS_JSON) ? process.env.STARTER_DECKS_JSON : path.join(process.cwd(), process.env.STARTER_DECKS_JSON))
      : undefined

    if (templatePath && fs.existsSync(templatePath)) {
      console.log(`[starter] Utilisation du template JSON: ${templatePath}`)
      const raw = fs.readFileSync(templatePath, 'utf-8')
      const parsed = JSON.parse(raw) as {
        decks: Array<{
          id: string
          name: string
          versions: Array<{
            id: string
            name: string
            totals?: { leader: number; nonLeaders: number; total: number }
            cards: Array<{ cardId: string; code?: string; name?: string; type?: string; quantity: number }>
          }>
        }>
      }

      for (const d of parsed.decks) {
        const exists = await prisma.deck.findFirst({ where: { userId, name: d.name } })
        if (exists) {
          console.log(`[starter] Deck déjà présent, skip: ${d.name}`)
          continue
        }
        const newDeck = await prisma.deck.create({ data: { name: d.name, description: 'Deck importé (starter)', userId } })
        for (const v of d.versions) {
          const newVersion = await prisma.deckVersion.create({ data: { deckId: newDeck.id, name: v.name } })
          for (const c of v.cards) {
            await prisma.deckCard.create({ data: { deckVersionId: newVersion.id, cardId: c.cardId, quantity: c.quantity } })
          }
        }
        console.log(`[starter] Deck importé pour l'utilisateur: ${d.name}`)
      }
    } else {
      // Fallback: Trouver les decks de démarrage existants (ST-*) et copier
      const starterDecks = await prisma.deck.findMany({
        where: {
          AND: [
            { userId: null },
            { name: { startsWith: 'ST-' } }
          ]
        }
      });
      
      // Créer des copies des decks de démarrage pour l'utilisateur
      for (const starterDeck of starterDecks) {
        try {
          // Vérifier si l'utilisateur a déjà ce deck
          const existingDeck = await prisma.deck.findFirst({
            where: { name: starterDeck.name, userId }
          });
          
          if (existingDeck) {
            console.log(`Le deck ${starterDeck.name} existe déjà pour l'utilisateur ${userId}`);
            continue;
          }
          
          // Créer une copie du deck pour l'utilisateur
          const newDeck = await prisma.deck.create({
            data: { name: starterDeck.name, description: starterDeck.description, userId }
          });
          
          // Récupérer les versions du deck de démarrage
          const deckVersions = await prisma.deckVersion.findMany({ where: { deckId: starterDeck.id } });
          
          // Pour chaque version, créer une copie et ajouter les cartes
          for (const version of deckVersions) {
            const newVersion = await prisma.deckVersion.create({ data: { deckId: newDeck.id, name: version.name } });
            const deckCards = await prisma.deckCard.findMany({ where: { deckVersionId: version.id } });
            for (const deckCard of deckCards) {
              await prisma.deckCard.create({ data: { deckVersionId: newVersion.id, cardId: deckCard.cardId, quantity: deckCard.quantity } });
            }
          }
          
          console.log(`Deck ${starterDeck.name} créé pour l'utilisateur ${userId}`);
        } catch (error) {
          console.error(`Erreur lors de la création du deck ${starterDeck.name} pour l'utilisateur ${userId}:`, error);
        }
      }
    }
    
    // Marquer que l'utilisateur a reçu le starter
    await prisma.user.update({ where: { id: userId }, data: { hasStarterDecks: true } })
    console.log(`Toutes les cartes et decks de démarrage ont été ajoutés à l'utilisateur ${userId}`);
  } catch (error) {
    console.error(`Erreur lors de l'ajout des cartes de démarrage à l'utilisateur ${userId}:`, error);
    throw error;
  }
} 