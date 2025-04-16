import fs from 'fs';
import path from 'path';

// Types pour les cartes
type Card = {
  id: string;
  name: string;
  code: string;
  rarity: string;
  type: string;
  imageUrl: string;
};

// Types pour les taux de drop
type DropRate = {
  rarity: string;
  dropRate: number;
  altArtRate: number;
};

// Fonction pour charger les cartes
function loadCards(): Card[] {
  const cardsPath = path.join(process.cwd(), 'public', 'cards.json');
  const cardsData = fs.readFileSync(cardsPath, 'utf-8');
  return JSON.parse(cardsData);
}

// Fonction pour charger les taux de drop
function loadDropRates(): DropRate[] {
  const csvPath = path.join(process.cwd(), 'public', 'Taux_de_Drop_avec_Alt_Art.csv');
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvData.split('\n').slice(1); // Ignorer l'en-tête

  return lines.map(line => {
    const [rarity, dropRate, altArtRate] = line.split(',');
    return {
      rarity,
      dropRate: parseFloat(dropRate),
      altArtRate: parseFloat(altArtRate)
    };
  });
}

// Fonction pour analyser les taux de drop
function analyzeDropRates(cards: Card[], dropRates: DropRate[]) {
  // Initialiser les compteurs
  const rarityCounts: Record<string, number> = {};
  const altArtCounts: Record<string, number> = {};
  const totalCards = cards.length;

  // Compter les cartes par rareté
  cards.forEach(card => {
    const rarity = card.rarity;
    rarityCounts[rarity] = (rarityCounts[rarity] || 0) + 1;
    
    // Compter les cartes alternatives
    if (card.id.includes('_p')) {
      altArtCounts[rarity] = (altArtCounts[rarity] || 0) + 1;
    }
  });

  // Afficher les résultats
  console.log('\nTaux de drop par rareté :');
  console.log('------------------------');
  dropRates.forEach(({ rarity, dropRate, altArtRate }) => {
    const count = rarityCounts[rarity] || 0;
    const altCount = altArtCounts[rarity] || 0;
    console.log(`${rarity}:`);
    console.log(`  Taux de drop: ${dropRate}%`);
    console.log(`  Taux alt art: ${altArtRate}%`);
    console.log(`  Nombre total: ${count} cartes`);
    console.log(`  Nombre d'alternatives: ${altCount} cartes`);
    console.log('------------------------');
  });

  // Afficher un résumé
  console.log('\nRésumé des taux de drop :');
  console.log('------------------------');
  dropRates.forEach(({ rarity, dropRate, altArtRate }) => {
    console.log(`${rarity}: ${dropRate}% (${altArtRate}% alt)`);
  });
}

// Exécuter l'analyse
try {
  const cards = loadCards();
  const dropRates = loadDropRates();
  analyzeDropRates(cards, dropRates);
} catch (error) {
  console.error('Erreur lors de l\'analyse des taux de drop:', error);
} 