import { GamePhase } from '@/types/game';

interface GameControlsProps {
  currentPhase: GamePhase;
  currentPlayer: 'player' | 'opponent';
  canPlayCard: boolean;
  canAttack: boolean;
  canEndTurn: boolean;
  onDrawCard: () => void;
  onAddDon: () => void;
  onEndTurn: () => void;
}

export function GameControls({
  currentPhase,
  currentPlayer,
  canPlayCard,
  canAttack,
  canEndTurn,
  onDrawCard,
  onAddDon,
  onEndTurn,
}: GameControlsProps) {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 bg-white p-4 rounded-lg shadow-lg">
      <div className="text-sm font-bold">
        Phase: {currentPhase}
        <br />
        Tour de: {currentPlayer === 'player' ? 'vous' : 'l\'adversaire'}
      </div>
      
      <div className="flex gap-2">
        {currentPhase === 'DRAW' && (
          <button
            onClick={onDrawCard}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={currentPlayer !== 'player'}
          >
            Piocher
          </button>
        )}

        {currentPhase === 'DON' && (
          <button
            onClick={onAddDon}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            disabled={currentPlayer !== 'player'}
          >
            Ajouter DON!!
          </button>
        )}

        {currentPhase === 'MAIN' && (
          <>
            <button
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              disabled={!canPlayCard}
            >
              Jouer une carte
            </button>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              disabled={!canAttack}
            >
              Attaquer
            </button>
          </>
        )}

        <button
          onClick={onEndTurn}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          disabled={!canEndTurn}
        >
          Fin du tour
        </button>
      </div>
    </div>
  );
} 