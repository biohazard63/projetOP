import { useState } from 'react';
import { GameState, GameCard, SetupPhase } from '@/types/game';
import { PlayerField } from './PlayerField';
import { toast } from 'sonner';

interface GameSetupProps {
  gameState: GameState;
  onChooseFirst: (player: 'player' | 'opponent') => void;
  onChooseLeader: (player: 'player' | 'opponent', leader: GameCard) => void;
  onSetLife: (player: 'player' | 'opponent') => void;
  onSetDon: (player: 'player' | 'opponent') => void;
  onDrawStarting: (player: 'player' | 'opponent') => void;
  onMulligan: (player: 'player' | 'opponent') => void;
  onReady: () => void;
}

export function GameSetup({
  gameState,
  onChooseFirst,
  onChooseLeader,
  onSetLife,
  onSetDon,
  onDrawStarting,
  onMulligan,
  onReady,
}: GameSetupProps) {
  const [selectedLeader, setSelectedLeader] = useState<GameCard | null>(null);

  const renderSetupStep = () => {
    switch (gameState.setupPhase) {
      case 'CHOOSE_FIRST':
        return (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold">Qui commence ?</h2>
            <div className="flex gap-4">
              <button
                onClick={() => onChooseFirst('player')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Je commence
              </button>
              <button
                onClick={() => onChooseFirst('opponent')}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                L'adversaire commence
              </button>
            </div>
          </div>
        );

      case 'CHOOSE_LEADER':
        return (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold">
              {gameState.currentPlayer === 'player' ? 'Choisissez votre Leader' : "L'adversaire choisit son Leader"}
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {gameState[gameState.currentPlayer].deck
                .filter(card => card.type === 'LEADER')
                .map(leader => (
                  <div
                    key={leader.id}
                    className={`cursor-pointer ${
                      selectedLeader?.id === leader.id ? 'ring-4 ring-yellow-400' : ''
                    }`}
                    onClick={() => setSelectedLeader(leader)}
                  >
                    <img
                      src={leader.imageUrl}
                      alt={leader.name}
                      className="w-32 h-48 object-cover rounded-lg"
                    />
                  </div>
                ))}
            </div>
            {selectedLeader && (
              <button
                onClick={() => {
                  onChooseLeader(gameState.currentPlayer, selectedLeader);
                  setSelectedLeader(null);
                }}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Confirmer le Leader
              </button>
            )}
          </div>
        );

      case 'SET_LIFE':
        return (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold">Mise en place de la Vie</h2>
            <button
              onClick={() => onSetLife(gameState.currentPlayer)}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Placer les cartes de Vie
            </button>
          </div>
        );

      case 'SET_DON':
        return (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold">Mise en place des DON!!</h2>
            <button
              onClick={() => onSetDon(gameState.currentPlayer)}
              className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              Placer les DON!!
            </button>
          </div>
        );

      case 'DRAW_STARTING':
        return (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold">Pioche de départ</h2>
            <button
              onClick={() => onDrawStarting(gameState.currentPlayer)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Piocher 5 cartes
            </button>
          </div>
        );

      case 'MULLIGAN':
        return (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold">Mulligan</h2>
            <p>Voulez-vous remélanger votre main et repiocher ?</p>
            <div className="flex gap-4">
              <button
                onClick={() => onMulligan(gameState.currentPlayer)}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Oui, remélanger
              </button>
              <button
                onClick={() => onReady()}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Non, garder la main
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="container mx-auto space-y-8">
        {/* Champ de l'adversaire */}
        <PlayerField
          player={gameState.opponent}
          isActive={gameState.currentPlayer === 'opponent'}
        />

        {/* Champ du joueur */}
        <PlayerField
          player={gameState.player}
          isActive={gameState.currentPlayer === 'player'}
        />

        {/* Étape de mise en place */}
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-6 rounded-lg shadow-lg">
          {renderSetupStep()}
        </div>
      </div>
    </div>
  );
} 