import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { Card } from '../types/card';

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

// Fonction pour extraire les cartes des decks de démarrage
function getStarterDeckCards(cards: Card[]): Card[] {
  return cards.filter(card => card.code.startsWith('ST'));
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
    
    // Charger toutes les cartes
    const allCards = loadCards();
    
    // Extraire les cartes des decks de démarrage
    const starterDeckCards = getStarterDeckCards(allCards);
    
    console.log(`Préparation de l'ajout de ${starterDeckCards.length} cartes de démarrage`);
    
    // 1. Ajouter toutes les cartes à la collection de l'utilisateur
    for (const card of starterDeckCards) {
      try {
        await prisma.userCard.upsert({
        where: {
            userId_cardId: {
              userId: userId,
              cardId: card.id
          }
        },
          update: {
            quantity: {
              increment: 1
            }
          },
          create: {
            userId: userId,
            cardId: card.id,
            quantity: 1
          }
        });
      } catch (error) {
        console.error(`Erreur lors de l'ajout de la carte ${card.id} à l'utilisateur ${userId}:`, error);
            }
          }
    
    console.log(`${starterDeckCards.length} cartes ajoutées à la collection`);
      
    // 2. Trouver les decks de démarrage existants
    const starterDecks = await prisma.deck.findMany({
      where: {
        AND: [
          { userId: null },
          { name: { startsWith: 'ST-' } }
        ]
      }
    });
    
    // 3. Créer des copies des decks de démarrage pour l'utilisateur
    for (const starterDeck of starterDecks) {
      try {
        // Vérifier si l'utilisateur a déjà ce deck
        const existingDeck = await prisma.deck.findFirst({
          where: {
            name: starterDeck.name,
            userId: userId
          }
        });
        
        if (existingDeck) {
          console.log(`Le deck ${starterDeck.name} existe déjà pour l'utilisateur ${userId}`);
          continue;
        }
        
        // Créer une copie du deck pour l'utilisateur
        const newDeck = await prisma.deck.create({
          data: {
            name: starterDeck.name,
            description: starterDeck.description,
            userId: userId
          }
        });
        
        // Récupérer les versions du deck de démarrage
        const deckVersions = await prisma.deckVersion.findMany({
          where: {
            deckId: starterDeck.id
          }
        });
        
        // Pour chaque version, créer une copie et ajouter les cartes
        for (const version of deckVersions) {
          // Créer une nouvelle version pour le deck de l'utilisateur
          const newVersion = await prisma.deckVersion.create({
            data: {
              deckId: newDeck.id,
              name: version.name
            }
          });
          
          // Récupérer les cartes de cette version
          const deckCards = await prisma.deckCard.findMany({
            where: {
              deckVersionId: version.id
          }
          });
          
          // Ajouter les cartes à la nouvelle version
          for (const deckCard of deckCards) {
            await prisma.deckCard.create({
              data: {
                deckVersionId: newVersion.id,
                cardId: deckCard.cardId,
                quantity: deckCard.quantity
              }
            });
          }
        }
        
        console.log(`Deck ${starterDeck.name} créé pour l'utilisateur ${userId}`);
      } catch (error) {
        console.error(`Erreur lors de la création du deck ${starterDeck.name} pour l'utilisateur ${userId}:`, error);
        }
      }
    
    console.log(`Toutes les cartes et decks de démarrage ont été ajoutés à l'utilisateur ${userId}`);
  } catch (error) {
    console.error(`Erreur lors de l'ajout des cartes de démarrage à l'utilisateur ${userId}:`, error);
    throw error;
  }
} 