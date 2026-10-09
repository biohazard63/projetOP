import * as fs from 'fs';
import * as path from 'path';

interface Card {
  id: string;
  code: string;
  name: string;
  type: string;
  rarity: string;
  set?: string;
  setCode?: string;
}

interface UserCard {
  cardId: string;
  code: string;
  name: string;
  type: string;
  set: string;
  setCode: string;
  rarity: string;
  quantity: number;
}

interface DeckVersion {
  id: string;
  name: string;
  totals: {
    leader: number;
    nonLeaders: number;
    total: number;
  };
  cards: UserCard[];
}

interface Deck {
  id: string;
  name: string;
  versions: DeckVersion[];
}

interface UserProfile {
  user: {
    id: string;
    email: string;
    name: string;
  };
  decks: Deck[];
}

function generateId(): string {
  return 'cm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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

function createStarterDeck(setCode: string, cards: Card[]): Deck {
  const deckId = generateId();
  const versionId = generateId();
  
  let leaderCount = 0;
  let nonLeaderCount = 0;
  
  const userCards: UserCard[] = cards.map(card => {
    if (card.type === 'LEADER') {
      leaderCount++;
    } else {
      nonLeaderCount++;
    }
    
    return {
      cardId: card.id,
      code: card.code,
      name: card.name,
      type: card.type,
      set: card.set || `Set ${setCode}`,
      setCode: card.setCode || setCode,
      rarity: card.rarity,
      quantity: 4
    };
  });
  
  return {
    id: deckId,
    name: `${setCode} : Deck de Starter`,
    versions: [
      {
        id: versionId,
        name: "Version initiale",
        totals: {
          leader: leaderCount,
          nonLeaders: nonLeaderCount,
          total: cards.length
        },
        cards: userCards
      }
    ]
  };
}

function main() {
  console.log('Début de l\'ajout de tous les decks de starter au profil utilisateur...');
  
  // Charger le profil utilisateur existant
  const profilePath = path.join(__dirname, '..', 'exports', 'decks.sateprod.json');
  const profile: UserProfile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  
  // Définir tous les sets de starter
  const starterSets = [
    'ST-01', 'ST-02', 'ST-03', 'ST-04', 'ST-05', 'ST-06', 'ST-07', 'ST-08', 'ST-09',
    'ST-10', 'ST-11', 'ST-12', 'ST-13', 'ST-14', 'ST-15', 'ST-16', 'ST-17', 'ST-18',
    'ST-19', 'ST-20', 'ST-21', 'ST-23', 'ST-24', 'ST-25', 'ST-26', 'ST-27', 'ST-28'
  ];
  
  let decksAdded = 0;
  
  // Vérifier quels decks existent déjà
  const existingDeckNames = profile.decks.map(deck => deck.name);
  
  // Traiter chaque set de starter
  for (const setCode of starterSets) {
    const deckName = `${setCode} : Deck de Starter`;
    
    // Vérifier si le deck existe déjà
    if (existingDeckNames.includes(deckName)) {
      console.log(`Deck ${setCode} existe déjà, ignoré.`);
      continue;
    }
    
    console.log(`Création du deck ${setCode}...`);
    const cards = loadCardsFromSet(setCode);
    
    if (cards.length > 0) {
      const starterDeck = createStarterDeck(setCode, cards);
      profile.decks.push(starterDeck);
      decksAdded++;
      console.log(`✅ Deck ${setCode} créé avec ${cards.length} cartes`);
    } else {
      console.log(`⚠️ Aucune carte trouvée pour ${setCode}`);
    }
  }
  
  // Sauvegarder le profil mis à jour
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf-8');
  
  console.log(`\n✅ Opération terminée !`);
  console.log(`📊 Statistiques:`);
  console.log(`   - Decks ajoutés: ${decksAdded}`);
  console.log(`   - Sets traités: ${starterSets.length}`);
  console.log(`\n🎴 Tous les decks de starter ont été ajoutés au profil utilisateur.`);
}

if (require.main === module) {
  main();
}
