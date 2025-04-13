import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const API_KEY = process.env.TCG_API_KEY;
const API_URL = 'https://apitcg.com/api/one-piece/cards';

interface ApiCard {
  id: string;
  code: string;
  name: string;
  type: string;
  color: string;
  cost: number;
  power: number | null;
  counter: string | null;
  rarity: string;
  images: {
    small: string;
    large: string;
  };
  attribute?: {
    name: string;
    image: string;
  };
  family?: string;
  ability?: string;
  trigger?: string;
  set?: {
    name: string;
  };
  notes?: string[];
}

interface ApiResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: ApiCard[];
}

function parseCounter(counter: string | null | undefined): number | null {
  if (!counter || counter === '-') {
    return null;
  }
  const value = parseInt(counter);
  return isNaN(value) ? null : value;
}

async function fetchPage(page: number): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}?page=${page}`, {
    headers: {
      'x-api-key': API_KEY || ''
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur API: ${response.status} ${response.statusText}\nRéponse: ${errorText}`);
  }

  const responseText = await response.text();
  console.log('Réponse API:', responseText); // Debug
  const apiResponse = JSON.parse(responseText);
  
  if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
    throw new Error('La réponse n\'est pas un tableau de cartes');
  }

  return apiResponse;
}

async function importCards() {
  try {
    if (!API_KEY) {
      throw new Error('La clé API n\'est pas définie dans le fichier .env');
    }

    console.log('Récupération des informations de pagination...');
    const firstPage = await fetchPage(1);
    const totalPages = firstPage.totalPages;
    const totalCards = firstPage.total;
    
    console.log(`Total des cartes à importer: ${totalCards}`);
    console.log(`Nombre de pages: ${totalPages}`);

    let importedCount = 0;
    const existingCards = new Set();

    // Récupérer les IDs des cartes existantes
    const existingCardsList = await prisma.card.findMany({
      select: { id: true }
    });
    existingCardsList.forEach(card => existingCards.add(card.id));

    // Importer toutes les pages
    for (let page = 1; page <= totalPages; page++) {
      console.log(`\nTraitement de la page ${page}/${totalPages}...`);
      
      const apiResponse = await fetchPage(page);
      const cards = apiResponse.data;

      for (const card of cards) {
        try {
          const cardData = {
            id: card.id,
            code: card.code,
            name: card.name.trim(),
            type: card.type,
            color: card.color,
            cost: card.cost,
            power: card.power,
            counter: parseCounter(card.counter),
            rarity: card.rarity,
            imageUrl: card.images.large,
            attribute: card.attribute?.name,
            attributeImage: card.attribute?.image,
            family: card.family,
            ability: card.ability,
            trigger: card.trigger,
            set: card.set?.name,
            notes: card.notes ? JSON.stringify(card.notes) : null,
            effect: card.ability // Pour la compatibilité avec l'ancien champ
          };

          if (existingCards.has(card.id)) {
            console.log(`Carte ${card.id} déjà existante, mise à jour...`);
            await prisma.card.update({
              where: { id: card.id },
              data: cardData
            });
          } else {
            await prisma.card.create({
              data: cardData
            });
          }
          importedCount++;
          
          if (importedCount % 50 === 0) {
            console.log(`${importedCount}/${totalCards} cartes traitées...`);
          }
        } catch (error) {
          console.error(`Erreur lors de l'importation de la carte ${card.id}:`, error);
          console.error('Données de la carte:', JSON.stringify(card, null, 2)); // Debug
        }
      }
    }

    console.log(`\nImportation terminée. ${importedCount} cartes importées avec succès.`);
  } catch (error) {
    console.error('Erreur lors de l\'importation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importCards(); 