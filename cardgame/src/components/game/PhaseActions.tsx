import React from 'react';
import { GameState } from '@/types/game';
import { PhaseService } from '@/lib/game/phaseService';

interface PhaseActionsProps {
  gameState: GameState;
  onNextPhase: () => void;
  onEndTurn: () => void;
  onDrawCard: () => void;
  onMulligan: () => void;
  onKeepHand: () => void;
}

export const PhaseActions: React.FC<PhaseActionsProps> = ({
  gameState,
  onNextPhase,
  onEndTurn,
  onDrawCard,
  onMulligan,
  onKeepHand
}) => {
  const { currentPhase, currentPlayer, canDrawDon, hasKeptHand } = gameState;
  const isPlayerTurn = currentPlayer === 'player';

  // Actions disponibles selon la phase
  const getAvailableActions = () => {
    switch (currentPhase) {
      case 'SETUP':
        if (!hasKeptHand) {
          return [
            { label: 'Mulligan', action: onMulligan, color: 'purple', icon: '🔄' },
            { label: 'Garder la main', action: onKeepHand, color: 'green', icon: '✋' }
          ];
        }
        return [];

      case 'START':
        // Phase START : aucune action, juste passer à la suivante
        return [
          { label: 'Phase suivante', action: onNextPhase, color: 'blue', icon: '⏭️' }
        ];

      case 'DRAW':
        if (isPlayerTurn) {
          return [
            { label: 'Piocher', action: onDrawCard, color: 'blue', icon: '📚' },
            { label: 'Phase suivante', action: onNextPhase, color: 'green', icon: '⏭️' }
          ];
        }
        // Même si ce n'est pas votre tour, vous pouvez passer à la phase suivante
        return [
          { label: 'Phase suivante', action: onNextPhase, color: 'green', icon: '⏭️' }
        ];

      case 'MAIN':
        return [
          { label: 'Phase suivante', action: onNextPhase, color: 'blue', icon: '⏭️' }
        ];

      case 'BATTLE':
        return [
          { label: 'Phase suivante', action: onNextPhase, color: 'blue', icon: '⏭️' }
        ];

      case 'END':
        // En phase END, toujours un bouton "Fin de tour" pour passer au joueur suivant
        return [
          { label: 'Fin de tour', action: onEndTurn, color: 'red', icon: '⏹️' }
        ];

      default:
        return [];
    }
  };

  const actions = getAvailableActions();

  if (actions.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        Aucune action disponible dans cette phase
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-gray-400 mb-2">
        Phase {currentPhase}
      </div>
      <div className="flex gap-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors text-white text-sm font-medium ${
              action.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
              action.color === 'green' ? 'bg-green-600 hover:bg-green-700' :
              action.color === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-700 text-black font-bold' :
              action.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
              action.color === 'red' ? 'bg-red-600 hover:bg-red-700' :
              'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            <span className="text-sm">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
