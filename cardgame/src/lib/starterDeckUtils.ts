import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { Card } from '../types/card';
import { starterDecks } from '../scripts/importStarterDecks';

const prisma = new PrismaClient();

// Types pour les decks de démarrage
export type StarterDeck = {
  name: string;
  cards: {
    code: string;
    quantity: number;
  }[];
};

// Fonction pour charger les cartes depuis le fichier JSON
function loadCards(): Card[] {
  const cardsPath = path.join(process.cwd(), 'public', 'cards.json');
  const cardsData = fs.readFileSync(cardsPath, 'utf-8');
  return JSON.parse(cardsData);
}

// Fonction pour charger les decks de démarrage
function loadStarterDecks(): StarterDeck[] {
  const starterDecksPath = path.join(process.cwd(), 'scripts', 'importStarterDecks.ts');
  const starterDecksData = fs.readFileSync(starterDecksPath, 'utf-8');
  
  // Extraire le tableau starterDecks du fichier
  const match = starterDecksData.match(/export const starterDecks = (\[[\s\S]*?\]);/);
  if (!match) {
    throw new Error('Impossible de trouver la définition des decks de démarrage');
  }
  
  // Évaluer le tableau JavaScript en JSON
  const starterDecksString = match[1]
    .replace(/(\w+):/g, '"$1":') // Convertir les clés en chaînes
    .replace(/'/g, '"'); // Remplacer les guillemets simples par des doubles
  
  return JSON.parse(starterDecksString);
}

// Fonction pour extraire les cartes des decks de démarrage
function getStarterDeckCards(cards: Card[]): Card[] {
  return cards.filter(card => card.id.startsWith('ST'));
}

// Fonction pour créer les decks de démarrage pour un utilisateur
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
    
    // Charger toutes les cartes
    const allCards = loadCards();
    
    // Extraire les cartes des decks de démarrage
    const starterDeckCards = getStarterDeckCards(allCards);
    
    console.log(`Préparation de l'ajout de ${starterDeckCards.length} cartes de démarrage`);
    
    // Utiliser une transaction pour toutes les opérations
    await prisma.$transaction(async (tx) => {
      // 1. Ajouter toutes les cartes à la collection de l'utilisateur en une seule opération
      const cardIds = starterDeckCards.map(card => card.id);
      
      // Vérifier quelles cartes l'utilisateur a déjà
      const existingCards = await tx.card.findMany({
        where: {
          id: { in: cardIds },
          users: {
            some: {
              id: userId
            }
          }
        },
        select: { id: true }
      });
      
      const existingCardIds = new Set(existingCards.map(card => card.id));
      const cardsToAdd = cardIds.filter(id => !existingCardIds.has(id));
      
      if (cardsToAdd.length > 0) {
        // Ajouter toutes les cartes manquantes en une seule opération
        await tx.user.update({
          where: { id: userId },
          data: {
            collection: {
              connect: cardsToAdd.map(id => ({ id }))
            }
          }
        });
        console.log(`${cardsToAdd.length} cartes ajoutées à la collection`);
      }
      
      // 2. Créer les decks de démarrage un par un pour s'assurer que la relation est correcte
      for (const deckData of starterDecks) {
        // Vérifier si le deck existe déjà
        const existingDeck = await tx.deck.findFirst({
          where: {
            name: deckData.name,
            userId: userId
          }
        });
        
        if (existingDeck) {
          console.log(`Le deck ${deckData.name} existe déjà pour l'utilisateur ${userId}`);
          continue;
        }
        
        // Créer le deck
        const deck = await tx.deck.create({
          data: {
            name: deckData.name,
            userId: userId,
          }
        });
        
        console.log(`Deck ${deckData.name} créé pour l'utilisateur ${userId}`);
        
        // 3. Ajouter les cartes au deck
        const deckCardsToCreate = [];
        
        for (const cardData of deckData.cards) {
          const card = allCards.find(c => c.code === cardData.code);
          if (card) {
            deckCardsToCreate.push({
              deckId: deck.id,
              cardId: card.id,
              quantity: cardData.quantity
            });
          } else {
            console.warn(`Carte non trouvée: ${cardData.code}`);
          }
        }
        
        if (deckCardsToCreate.length > 0) {
          await tx.deckCard.createMany({
            data: deckCardsToCreate
          });
          console.log(`${deckCardsToCreate.length} cartes ajoutées au deck ${deckData.name}`);
        }
      }
    });
    
    console.log(`Toutes les cartes de démarrage ont été ajoutées à l'utilisateur ${userId}`);
  } catch (error) {
    console.error(`Erreur lors de l'ajout des cartes de démarrage à l'utilisateur ${userId}:`, error);
  }
} 