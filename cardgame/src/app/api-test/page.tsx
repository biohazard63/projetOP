'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Set {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  legalities: {
    unlimited: string;
    standard: string;
    expanded: string;
  };
  ptcgoCode: string;
  releaseDate: string;
  updatedAt: string;
  images: {
    symbol: string;
    logo: string;
  };
}

export default function ApiTestPage() {
  const [sets, setSets] = useState<Set[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSets = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sets');
      const data = await response.json();
      
      if (data.success) {
        setSets(data.data.data || []);
        console.log('Sets récupérés dans le composant:', data.data);
      } else {
        setError(data.message || 'Erreur inconnue');
      }
    } catch (err) {
      setError('Erreur lors de la récupération des sets');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, []);

  const filteredSets = sets.filter(set => 
    set.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    set.series.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test API Sets One Piece TCG</h1>
      
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <button 
          onClick={fetchSets}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {loading ? 'Chargement...' : 'Rafraîchir les sets'}
        </button>
        
        <div className="flex-1">
          <input
            type="text"
            placeholder="Rechercher un set..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2">Chargement des sets...</p>
        </div>
      ) : filteredSets.length > 0 ? (
        <div>
          <h2 className="text-xl font-semibold mb-2">Sets récupérés ({filteredSets.length} sur {sets.length})</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSets.map((set) => (
              <div key={set.id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  {set.images?.symbol && (
                    <div className="w-8 h-8 relative">
                      <Image 
                        src={set.images.symbol} 
                        alt={`${set.name} symbol`} 
                        width={32} 
                        height={32}
                        className="object-contain"
                      />
                    </div>
                  )}
                  <h3 className="font-semibold">{set.name}</h3>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p><span className="font-medium">Série:</span> {set.series}</p>
                  <p><span className="font-medium">Date de sortie:</span> {new Date(set.releaseDate).toLocaleDateString()}</p>
                  <p><span className="font-medium">Cartes:</span> {set.printedTotal} / {set.total}</p>
                  <p><span className="font-medium">Code:</span> {set.ptcgoCode || 'N/A'}</p>
                </div>
                
                <div className="mt-2 text-xs">
                  <span className={`px-2 py-1 rounded ${set.legalities.unlimited === 'Legal' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    Unlimited: {set.legalities.unlimited}
                  </span>
                  <span className={`ml-2 px-2 py-1 rounded ${set.legalities.standard === 'Legal' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    Standard: {set.legalities.standard}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !loading && !error && (
        <p>Aucun set trouvé</p>
      )}
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Données brutes (console)</h3>
        <p className="text-sm">Les données complètes sont également disponibles dans la console du navigateur.</p>
      </div>
    </div>
  );
} 