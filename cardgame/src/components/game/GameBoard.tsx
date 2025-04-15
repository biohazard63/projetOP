import React, { useEffect, useState } from 'react';
import { GameState, GameCard } from '@/types/game';
import { PlayerField } from './PlayerField';
import { toast } from 'sonner';

interface GameBoardProps {
  gameState: GameState;
  onCardClick: (card: GameCard) => void;
  onEndTurn: () => void;
  onDrawCard: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onCardClick,
  onEndTurn,
  onDrawCard,
}) => {
  const [selectedCard, setSelectedCard] = useState<GameCard | undefined>();

  useEffect(() => {
    console.log('État du jeu mis à jour:', {
      joueur: {
        deck: gameState.player.deck.length,
        main: gameState.player.hand.length,
        terrain: gameState.player.field.length,
        leader: gameState.player.leader?.name,
      },
      adversaire: {
        deck: gameState.opponent.deck.length,
        main: gameState.opponent.hand.length,
        terrain: gameState.opponent.field.length,
        leader: gameState.opponent.leader?.name,
      },
      phase: gameState.currentPhase,
      joueurActif: gameState.currentPlayer,
    });

    if (gameState.currentPhase === 'SETUP' && !gameState.player.leader) {
      toast.info('Phase de setup : Choisissez votre leader parmi vos cartes en main');
    }
  }, [gameState]);

  const handleCardClick = (card: GameCard) => {
    console.log('Carte cliquée:', {
      nom: card.name,
      type: card.type,
      phase: gameState.currentPhase,
      joueurActif: gameState.currentPlayer,
    });

    // Gestion spéciale pour la phase de setup
    if (gameState.currentPhase === 'SETUP') {
      if (!gameState.player.leader) {
        // Sélection du leader
        if (card.type === 'LEADER' && gameState.player.hand.includes(card)) {
          setSelectedCard(card);
          onCardClick(card);
        } else {
          toast.error('Vous devez choisir un leader parmi vos cartes en main');
        }
        return;
      }
    }

    setSelectedCard(card);
    onCardClick(card);
  };

  const handleEndTurn = () => {
    console.log('Tentative de fin de tour');
    onEndTurn();
  };

  const handleDrawCard = () => {
    console.log('Tentative de pioche');
    if (gameState.currentPhase === 'DRAW') {
      onDrawCard();
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6 bg-gray-900 min-h-screen">
      {/* En-tête du jeu */}
      <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg">
        <div className="text-white">
          <span className="font-bold">Phase:</span> {gameState.currentPhase}
        </div>
        <div className="text-white">
          <span className="font-bold">Tour:</span> {gameState.turnNumber}
        </div>
        <div className="text-white">
          <span className="font-bold">Joueur actif:</span> {gameState.currentPlayer === 'player' ? 'Vous' : 'Adversaire'}
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleDrawCard}
            className={`px-4 py-2 rounded ${
              gameState.currentPhase === 'DRAW' && gameState.currentPlayer === 'player'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-600 cursor-not-allowed'
            } text-white`}
            disabled={gameState.currentPhase !== 'DRAW' || gameState.currentPlayer !== 'player'}
          >
            Piocher
          </button>
          <button
            onClick={handleEndTurn}
            className={`px-4 py-2 rounded ${
              gameState.currentPlayer === 'player' && gameState.currentPhase !== 'SETUP'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-600 cursor-not-allowed'
            } text-white`}
            disabled={gameState.currentPlayer !== 'player' || gameState.currentPhase === 'SETUP'}
          >
            Fin de tour
          </button>
        </div>
      </div>

      {/* Message de phase de setup */}
      {gameState.currentPhase === 'SETUP' && !gameState.player.leader && (
        <div className="bg-blue-600 text-white p-4 rounded-lg text-center">
          Choisissez votre leader parmi vos cartes en main
        </div>
      )}

      {/* Plateau de jeu */}
      <div className="flex-1 flex flex-col justify-between">
        <PlayerField
          player={gameState.opponent}
          isOpponent={true}
          onCardClick={handleCardClick}
          selectedCard={selectedCard}
        />

        <PlayerField
          player={gameState.player}
          onCardClick={handleCardClick}
          selectedCard={selectedCard}
        />
      </div>
    </div>
  );
}; 