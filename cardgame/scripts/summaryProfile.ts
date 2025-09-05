import * as fs from 'fs';
import * as path from 'path';

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

function main() {
  console.log('📊 RÉSUMÉ COMPLET DU PROFIL UTILISATEUR\n');
  
  // Charger le profil utilisateur
  const profilePath = path.join(__dirname, '..', 'exports', 'decks.sateprod.json');
  const profile: UserProfile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  
  // Informations utilisateur
  console.log(`👤 UTILISATEUR:`);
  console.log(`   - Nom: ${profile.user.name}`);
  console.log(`   - Email: ${profile.user.email}`);
  console.log(`   - ID: ${profile.user.id}`);
  console.log('');
  
  // Statistiques générales
  const totalDecks = profile.decks.length;
  let totalCards = 0;
  let totalLeaders = 0;
  let totalNonLeaders = 0;
  let totalQuantity = 0;
  
  // Analyser chaque deck
  for (const deck of profile.decks) {
    for (const version of deck.versions) {
      totalCards += version.totals.total;
      totalLeaders += version.totals.leader;
      totalNonLeaders += version.totals.nonLeaders;
      
      for (const card of version.cards) {
        totalQuantity += card.quantity;
      }
    }
  }
  
  console.log(`📈 STATISTIQUES GÉNÉRALES:`);
  console.log(`   - Nombre total de decks: ${totalDecks}`);
  console.log(`   - Nombre total de cartes uniques: ${totalCards}`);
  console.log(`   - Nombre total de leaders: ${totalLeaders}`);
  console.log(`   - Nombre total de non-leaders: ${totalNonLeaders}`);
  console.log(`   - Nombre total d'exemplaires: ${totalQuantity}`);
  console.log('');
  
  // Détail des decks par catégorie
  console.log(`🎴 DÉTAIL DES DECKS PAR CATÉGORIE:`);
  
  const starterDecks = profile.decks.filter(deck => deck.name.includes('ST-') && deck.name.includes('Deck de Starter'));
  const mainSetDecks = profile.decks.filter(deck => deck.name.includes('OP-') && deck.name.includes('Set Principal'));
  const specialSetDecks = profile.decks.filter(deck => deck.name.includes('Set Spécial'));
  const collectionDeck = profile.decks.filter(deck => deck.name.includes('Collection Complète'));
  
  console.log(`   - Decks de Starter (ST-XX): ${starterDecks.length}`);
  console.log(`   - Sets Principaux (OP-XX): ${mainSetDecks.length}`);
  console.log(`   - Sets Spéciaux: ${specialSetDecks.length}`);
  console.log(`   - Collection Complète: ${collectionDeck.length}`);
  console.log('');
  
  // Détail des decks de starter
  if (starterDecks.length > 0) {
    console.log(`🃏 DECKS DE STARTER:`);
    for (const deck of starterDecks) {
      const version = deck.versions[0];
      console.log(`   - ${deck.name}: ${version.totals.total} cartes (${version.totals.leader} leaders, ${version.totals.nonLeaders} non-leaders)`);
    }
    console.log('');
  }
  
  // Détail des sets principaux
  if (mainSetDecks.length > 0) {
    console.log(`🎯 SETS PRINCIPAUX:`);
    for (const deck of mainSetDecks) {
      const version = deck.versions[0];
      console.log(`   - ${deck.name}: ${version.totals.total} cartes (${version.totals.leader} leaders, ${version.totals.nonLeaders} non-leaders)`);
    }
    console.log('');
  }
  
  // Détail des sets spéciaux
  if (specialSetDecks.length > 0) {
    console.log(`✨ SETS SPÉCIAUX:`);
    for (const deck of specialSetDecks) {
      const version = deck.versions[0];
      console.log(`   - ${deck.name}: ${version.totals.total} cartes (${version.totals.leader} leaders, ${version.totals.nonLeaders} non-leaders)`);
    }
    console.log('');
  }
  
  // Détail de la collection complète
  if (collectionDeck.length > 0) {
    console.log(`🌟 COLLECTION COMPLÈTE:`);
    const version = collectionDeck[0].versions[0];
    console.log(`   - ${collectionDeck[0].name}: ${version.totals.total} cartes (${version.totals.leader} leaders, ${version.totals.nonLeaders} non-leaders)`);
    console.log(`   - Nombre total d'exemplaires: ${version.cards.reduce((sum, card) => sum + card.quantity, 0)}`);
    console.log('');
  }
  
  // Récapitulatif final
  console.log(`🎉 RÉCAPITULATIF FINAL:`);
  console.log(`   Le profil utilisateur contient maintenant:`);
  console.log(`   ✅ ${totalDecks} decks différents`);
  console.log(`   ✅ ${totalCards} cartes uniques`);
  console.log(`   ✅ ${totalQuantity} exemplaires au total`);
  console.log(`   ✅ Tous les sets de One Piece Trading Card Game`);
  console.log(`   ✅ Une collection complète et organisée`);
}

if (require.main === module) {
  main();
}
