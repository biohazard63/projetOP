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
  console.log('🔧 OPTIMISATION ET NETTOYAGE DU PROFIL UTILISATEUR\n');
  
  // Charger le profil utilisateur
  const profilePath = path.join(__dirname, '..', 'exports', 'decks.sateprod.json');
  const profile: UserProfile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  
  console.log(`📊 Avant optimisation:`);
  console.log(`   - Nombre de decks: ${profile.decks.length}`);
  
  // Sauvegarder une copie de sauvegarde
  const backupPath = path.join(__dirname, '..', 'exports', `decks.sateprod.backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(profile, null, 2), 'utf-8');
  console.log(`💾 Sauvegarde créée: ${path.basename(backupPath)}`);
  
  // Supprimer les decks en double basés sur le nom
  const uniqueDecks: Deck[] = [];
  const seenNames = new Set<string>();
  
  for (const deck of profile.decks) {
    if (!seenNames.has(deck.name)) {
      seenNames.add(deck.name);
      uniqueDecks.push(deck);
    } else {
      console.log(`🗑️ Deck en double supprimé: ${deck.name}`);
    }
  }
  
  // Mettre à jour le profil
  profile.decks = uniqueDecks;
  
  // Trier les decks par nom pour une meilleure organisation
  profile.decks.sort((a, b) => {
    // Priorité: Collection Complète, puis Decks de Starter, puis Sets Principaux, puis Sets Spéciaux
    if (a.name.includes('Collection Complète')) return -1;
    if (b.name.includes('Collection Complète')) return 1;
    if (a.name.includes('Deck de Starter') && !b.name.includes('Deck de Starter')) return -1;
    if (b.name.includes('Deck de Starter') && !a.name.includes('Deck de Starter')) return 1;
    if (a.name.includes('Set Principal') && !b.name.includes('Set Principal')) return -1;
    if (b.name.includes('Set Principal') && !a.name.includes('Set Principal')) return 1;
    return a.name.localeCompare(b.name);
  });
  
  // Sauvegarder le profil optimisé
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf-8');
  
  console.log(`\n📊 Après optimisation:`);
  console.log(`   - Nombre de decks: ${profile.decks.length}`);
  console.log(`   - Decks en double supprimés: ${profile.decks.length - uniqueDecks.length}`);
  
  // Afficher la nouvelle organisation
  console.log(`\n🎴 ORGANISATION FINALE DES DECKS:`);
  
  const categories = {
    'Collection Complète': profile.decks.filter(d => d.name.includes('Collection Complète')),
    'Decks de Starter': profile.decks.filter(d => d.name.includes('Deck de Starter')),
    'Sets Principaux': profile.decks.filter(d => d.name.includes('Set Principal')),
    'Sets Spéciaux': profile.decks.filter(d => d.name.includes('Set Spécial'))
  };
  
  for (const [category, decks] of Object.entries(categories)) {
    if (decks.length > 0) {
      console.log(`\n${category}:`);
      for (const deck of decks) {
        const version = deck.versions[0];
        console.log(`   - ${deck.name}: ${version.totals.total} cartes`);
      }
    }
  }
  
  console.log(`\n✅ Profil utilisateur optimisé avec succès !`);
  console.log(`📁 Sauvegarde disponible: ${path.basename(backupPath)}`);
}

if (require.main === module) {
  main();
}
