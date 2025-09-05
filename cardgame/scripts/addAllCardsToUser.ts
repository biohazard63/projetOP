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
    return cards.map((card: any) => ({
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

function createCollectionDeck(): Deck {
  const deckId = generateId();
  const versionId = generateId();
  
  return {
    id: deckId,
    name: "Collection Complète - Toutes les Cartes",
    versions: [
      {
        id: versionId,
        name: "Version complète",
        totals: {
          leader: 0,
          nonLeaders: 0,
          total: 0
        },
        cards: []
      }
    ]
  };
}

function main() {
  console.log('Début de l\'ajout de toutes les cartes au profil utilisateur...');
  
  // Charger le profil utilisateur existant
  const profilePath = path.join(__dirname, '..', 'exports', 'decks.sateprod.json');
  const profile: UserProfile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  
  // Créer un nouveau deck pour la collection complète
  const collectionDeck = createCollectionDeck();
  
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
  
  // Traiter chaque set
  for (const setCode of allSets) {
    console.log(`Traitement du set ${setCode}...`);
    const cards = loadCardsFromSet(setCode);
    
    for (const card of cards) {
      const userCard: UserCard = {
        cardId: card.id,
        code: card.code,
        name: card.name,
        type: card.type,
        set: card.set || `Set ${setCode}`,
        setCode: card.setCode || setCode,
        rarity: card.rarity,
        quantity: 4 // Ajouter 4 exemplaires de chaque carte
      };
      
      collectionDeck.versions[0].cards.push(userCard);
      
      if (card.type === 'LEADER') {
        totalLeaders++;
      } else {
        totalNonLeaders++;
      }
      totalCards++;
    }
  }
  
  // Mettre à jour les totaux
  collectionDeck.versions[0].totals = {
    leader: totalLeaders,
    nonLeaders: totalNonLeaders,
    total: totalCards
  };
  
  // Ajouter le deck de collection au profil
  profile.decks.push(collectionDeck);
  
  // Sauvegarder le profil mis à jour
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf-8');
  
  console.log(`\n✅ Collection complète ajoutée avec succès !`);
  console.log(`📊 Statistiques:`);
  console.log(`   - Total des cartes: ${totalCards}`);
  console.log(`   - Leaders: ${totalLeaders}`);
  console.log(`   - Non-leaders: ${totalNonLeaders}`);
  console.log(`   - Sets traités: ${allSets.length}`);
  console.log(`\n🎴 Le deck "Collection Complète - Toutes les Cartes" a été ajouté au profil utilisateur.`);
}

if (require.main === module) {
  main();
}
