'use client';

import { useState } from 'react';
import Link from 'next/link';

// Sets principaux
const mainSets = [
  '-ROMANCE DAWN- [OP01]',
  '-PARAMOUNT WAR- [OP02]',
  '-PILLARS OF STRENGTH- [OP03]',
  '-KINGDOMS OF INTRIGUE- [OP04]',
  'OP-05',
  '-WINGS OF THE CAPTAIN-[OP06]',
  '-500 YEARS IN THE FUTURE- [OP-07]',
  '-TWO LEGENDS- [OP-08]',
  '-EMPERORS IN THE NEW WORLD- [OP-09]'
];

// Sets spéciaux
const specialSets = [
  '-Memorial Collection- [EB-01]',
  '-ONE PIECE CARD THE BEST- [PRB-01]'
];

// Sets d'événements et collections
const eventSets = [
  'Anime Expo 2023',
  'Event Pack Vol.3',
  'GIFT COLLECTION 2023 [GC-01]',
  'Included in Event Pack Vol.1',
  'Included in Event Pack Vol.2',
  'Included in Online Regional Participation Pack Vol.1',
  'Pre-Release OP03',
  'Premium Card Collection -25th Edition-',
  'Premium Card Collection -FILM RED Edition-'
];

// Combiner tous les sets dans l'ordre souhaité
const sets = [...mainSets, ...specialSets, ...eventSets];

export default function BoosterPack() {
  const [selectedSet, setSelectedSet] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenBooster = async () => {
    if (!selectedSet) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/booster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ set: selectedSet }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'ouverture du booster');
      }

      const data = await response.json();
      console.log('Booster ouvert:', data);
      // TODO: Afficher les cartes du booster
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Booster Pack</h1>
          <Link href="/game" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Retour au jeu
          </Link>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sélectionner un set
              </label>
              <select
                value={selectedSet}
                onChange={(e) => setSelectedSet(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choisir un set...</option>
                {sets.map((set, index) => (
                  <option key={index} value={set}>
                    {set}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleOpenBooster}
              disabled={!selectedSet || isLoading}
              className={`px-6 py-2 rounded font-medium ${
                !selectedSet || isLoading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Ouverture...' : 'Ouvrir le booster'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 