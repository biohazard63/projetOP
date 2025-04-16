import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Types pour les cartes
type Card = {
  id: string;
  name: string;
  code: string;
  rarity: string;
  type: string;
};

// Fonction pour charger les cartes depuis le fichier JSON
function loadCards(): Card[] {
  const cardsPath = path.join(process.cwd(), 'public', 'cards.json');
  const cardsData = fs.readFileSync(cardsPath, 'utf-8');
  return JSON.parse(cardsData);
}

// Fonction pour extraire les cartes des decks de démarrage
function getStarterDeckCards(cards: Card[]): Card[] {
  return cards.filter(card => card.id.startsWith('ST'));
}

// Fonction pour ajouter les cartes aux utilisateurs
async function addStarterDeckCardsToUsers(cards: Card[]) {
  try {
    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany({
      select: { id: true }
    });

    console.log(`Nombre d'utilisateurs trouvés: ${users.length}`);

    // Pour chaque utilisateur
    for (const user of users) {
      // Pour chaque carte du deck de démarrage
      for (const card of cards) {
        // Vérifier si l'utilisateur a déjà cette carte
        const existingCard = await prisma.card.findFirst({
          where: {
            id: card.id,
            users: {
              some: {
                id: user.id
              }
            }
          }
        });

        // Si l'utilisateur n'a pas la carte, l'ajouter
        if (!existingCard) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              collection: {
                connect: { id: card.id }
              }
            }
          });
          console.log(`Carte ${card.id} ajoutée à l'utilisateur ${user.id}`);
        }
      }
    }

    console.log('Toutes les cartes des decks de démarrage ont été ajoutées avec succès!');
  } catch (error) {
    console.error('Erreur lors de l\'ajout des cartes:', error);
  }
}

// Fonction principale
async function main() {
  try {
    // Charger les cartes
    const allCards = loadCards();
    console.log(`Nombre total de cartes chargées: ${allCards.length}`);

    // Extraire les cartes des decks de démarrage
    const starterDeckCards = getStarterDeckCards(allCards);
    console.log(`Nombre de cartes de decks de démarrage trouvées: ${starterDeckCards.length}`);

    // Afficher les cartes trouvées
    console.log('\nCartes des decks de démarrage:');
    starterDeckCards.forEach(card => {
      console.log(`${card.id} - ${card.name} (${card.rarity})`);
    });

    // Demander confirmation avant d'ajouter les cartes
    console.log('\nVoulez-vous ajouter ces cartes à tous les utilisateurs? (y/n)');
    process.stdin.once('data', async (data) => {
      const answer = data.toString().trim().toLowerCase();
      if (answer === 'y') {
        await addStarterDeckCardsToUsers(starterDeckCards);
      } else {
        console.log('Opération annulée');
      }
      await prisma.$disconnect();
    });
  } catch (error) {
    console.error('Erreur lors de l\'exécution du script:', error);
    await prisma.$disconnect();
  }
}

// Exécuter le script
main(); 