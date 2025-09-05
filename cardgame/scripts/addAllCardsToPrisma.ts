import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface Card {
  id: string;
  code: string;
  name: string;
  type: string;
  rarity: string;
  set?: string;
  setCode?: string;
}

function loadCardsFromSet(setCode: string): Card[] {
  const filePath = path.join(__dirname, '..', 'carteJson', setCode, `cards-${setCode}.json`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`Fichier non trouvé pour ${setCode}: ${filePath}`);
    return [];
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const cards = JSON.parse(content);
    return cards.map((card: Card) => ({
      id: card.id,
      code: card.code,
      name: card.name,
      type: card.type,
      rarity: card.rarity,
      set: `Set ${setCode}`,
      setCode: setCode
    }));
  } catch (error) {
    console.error(`Erreur lors du chargement de ${setCode}:`, error);
    return [];
  }
}

async function createCollectionDeck(userId: string): Promise<string> {
  const deckId = generateId();
  
  // Créer le deck dans Prisma
  await prisma.deck.create({
    data: {
      id: deckId,
      name: "Collection Complète - Toutes les Cartes",
      userId: userId,
      description: "Collection complète de toutes les cartes One Piece TCG"
    }
  });
  
  // Créer une version du deck
  const deckVersion = await prisma.deckVersion.create({
    data: {
      deckId: deckId,
      name: "Version complète"
    }
  });
  
  return deckVersion.id;
}

async function createStarterDeck(userId: string, setCode: string, cards: Card[]): Promise<string> {
  const deckId = generateId();
  
  // Créer le deck dans Prisma
  await prisma.deck.create({
    data: {
      id: deckId,
      name: `${setCode} : Deck de Starter`,
      userId: userId,
      description: `Deck de starter ${setCode} avec toutes les cartes du set`
    }
  });
  
  // Créer une version du deck
  const deckVersion = await prisma.deckVersion.create({
    data: {
      deckId: deckId,
      name: "Version initiale"
    }
  });
  
  return deckVersion.id;
}

async function createMainSetDeck(userId: string, setCode: string, cards: Card[]): Promise<string> {
  const deckId = generateId();
  
  // Créer le deck dans Prisma
  await prisma.deck.create({
    data: {
      id: deckId,
      name: `${setCode} : Set Principal`,
      userId: userId,
      description: `Set principal ${setCode} avec toutes les cartes du set`
    }
  });
  
  // Créer une version du deck
  const deckVersion = await prisma.deckVersion.create({
    data: {
      deckId: deckId,
      name: "Version complète"
    }
  });
  
  return deckVersion.id;
}

async function createSpecialSetDeck(userId: string, setCode: string, cards: Card[]): Promise<string> {
  const deckId = generateId();
  
  // Créer le deck dans Prisma
  await prisma.deck.create({
    data: {
      id: deckId,
      name: `${setCode} : Set Spécial`,
      userId: userId,
      description: `Set spécial ${setCode} avec toutes les cartes du set`
    }
  });
  
  // Créer une version du deck
  const deckVersion = await prisma.deckVersion.create({
    data: {
      deckId: deckId,
      name: "Version complète"
    }
  });
  
  return deckVersion.id;
}

async function addCardsToUserInventory(userId: string, cards: Card[], quantity: number = 4) {
  console.log(`   Ajout de ${cards.length} cartes à l'inventaire utilisateur...`);
  
  for (const card of cards) {
    // Vérifier si la carte existe déjà dans l'inventaire
    const existingCard = await prisma.userCard.findFirst({
      where: {
        userId: userId,
        cardId: card.id
      }
    });
    
    if (existingCard) {
      // Mettre à jour la quantité
      await prisma.userCard.update({
        where: { id: existingCard.id },
        data: { quantity: existingCard.quantity + quantity }
      });
    } else {
      // Créer une nouvelle entrée
      await prisma.userCard.create({
        data: {
          userId: userId,
          cardId: card.id,
          quantity: quantity
        }
      });
    }
  }
}

async function addCardsToDeck(deckVersionId: string, cards: Card[], quantity: number = 4) {
  console.log(`   Ajout de ${cards.length} cartes au deck...`);
  
  for (const card of cards) {
    // Vérifier si la carte existe déjà dans ce deck
    const existingCard = await prisma.deckCard.findFirst({
      where: {
        deckVersionId: deckVersionId,
        cardId: card.id
      }
    });
    
    if (existingCard) {
      // Mettre à jour la quantité
      await prisma.deckCard.update({
        where: { id: existingCard.id },
        data: { quantity: existingCard.quantity + quantity }
      });
    } else {
      // Créer une nouvelle entrée
      await prisma.deckCard.create({
        data: {
          deckVersionId: deckVersionId,
          cardId: card.id,
          quantity: quantity
        }
      });
    }
  }
}

function generateId(): string {
  return 'cm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function main() {
  try {
    console.log('🚀 Début de l\'ajout de toutes les cartes à la base de données Prisma...\n');
    
    // Récupérer l'utilisateur sateprod@gmail.com
    const user = await prisma.user.findUnique({
      where: { email: 'sateprod@gmail.com' }
    });
    
    if (!user) {
      console.error('❌ Utilisateur sateprod@gmail.com non trouvé dans la base de données');
      return;
    }
    
    console.log(`👤 Utilisateur trouvé: ${user.name} (${user.email})`);
    console.log(`📊 Avant modification:`);
    
    // Compter les decks existants
    const existingDecks = await prisma.deck.count({
      where: { userId: user.id }
    });
    console.log(`   - Decks existants: ${existingDecks}`);
    
    // Compter les cartes existantes
    const existingCards = await prisma.userCard.count({
      where: { userId: user.id }
    });
    console.log(`   - Cartes existantes: ${existingCards}\n`);
    
    // Définir tous les sets à traiter
    const allSets = [
      // Starter Decks
      'ST-01', 'ST-02', 'ST-03', 'ST-04', 'ST-05', 'ST-06', 'ST-07', 'ST-08', 'ST-09',
      'ST-10', 'ST-11', 'ST-12', 'ST-13', 'ST-14', 'ST-15', 'ST-16', 'ST-17', 'ST-18',
      'ST-19', 'ST-20', 'ST-21', 'ST-23', 'ST-24', 'ST-25', 'ST-26', 'ST-27', 'ST-28',
      // Sets principaux
      'OP-01', 'OP-02', 'OP-03', 'OP-04', 'OP-05', 'OP-06', 'OP-07', 'OP-08', 'OP-09',
      'OP-10', 'OP-11', 'OP-12',
      // Sets spéciaux
      'EB-01', 'EB-02',
      // Autres
      'OTHER', 'OTHER_EN', 'PRB-01', 'PROMO', 'PROMO_EN'
    ];
    
    let totalCards = 0;
    let totalLeaders = 0;
    let totalNonLeaders = 0;
    let decksCreated = 0;
    
    // 1. Créer le deck de collection complète
    console.log('🌟 Création du deck Collection Complète...');
    const collectionDeckVersionId = await createCollectionDeck(user.id);
    decksCreated++;
    
    // 2. Traiter chaque set et créer les decks correspondants
    for (const setCode of allSets) {
      console.log(`\n📦 Traitement du set ${setCode}...`);
      const cards = loadCardsFromSet(setCode);
      
      if (cards.length > 0) {
        // Ajouter les cartes à l'inventaire utilisateur
        await addCardsToUserInventory(user.id, cards);
        
        // Créer le deck correspondant selon le type
        let deckVersionId: string;
        
        if (setCode.startsWith('ST-')) {
          deckVersionId = await createStarterDeck(user.id, setCode, cards);
        } else if (setCode.startsWith('OP-')) {
          deckVersionId = await createMainSetDeck(user.id, setCode, cards);
        } else {
          deckVersionId = await createSpecialSetDeck(user.id, setCode, cards);
        }
        
        // Ajouter les cartes au deck
        await addCardsToDeck(deckVersionId, cards);
        
        decksCreated++;
        
        // Compter les cartes
        for (const card of cards) {
          if (card.type === 'LEADER') {
            totalLeaders++;
          } else {
            totalNonLeaders++;
          }
          totalCards++;
        }
        
        console.log(`   ✅ Deck ${setCode} créé avec ${cards.length} cartes`);
      } else {
        console.log(`   ⚠️ Aucune carte trouvée pour ${setCode}`);
      }
    }
    
    // 3. Ajouter toutes les cartes au deck de collection
    console.log('\n🌟 Ajout de toutes les cartes au deck Collection Complète...');
    const allCards: Card[] = [];
    for (const setCode of allSets) {
      const cards = loadCardsFromSet(setCode);
      allCards.push(...cards);
    }
    await addCardsToDeck(collectionDeckVersionId, allCards);
    
    // 4. Mettre à jour les statistiques utilisateur
    console.log('\n📊 Mise à jour des statistiques utilisateur...');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        hasStarterDecks: true
      }
    });
    
    // 5. Vérifier les nouvelles statistiques
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        decks: true,
        userCards: true
      }
    });
    
    const totalUserCards = await prisma.userCard.count({
      where: { userId: user.id }
    });
    
    console.log(`\n✅ Opération terminée avec succès !`);
    console.log(`📊 Statistiques finales:`);
    console.log(`   - Decks créés: ${decksCreated}`);
    console.log(`   - Cartes ajoutées: ${totalCards}`);
    console.log(`   - Leaders: ${totalLeaders}`);
    console.log(`   - Non-leaders: ${totalNonLeaders}`);
    console.log(`   - Total des decks: ${updatedUser?.decks.length}`);
    console.log(`   - Total des cartes dans l'inventaire: ${totalUserCards}`);
    
    console.log(`\n🎉 Votre profil Prisma a été mis à jour avec succès !`);
    console.log(`   Vous pouvez maintenant voir toutes les cartes et decks dans Prisma Studio.`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'opération:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
