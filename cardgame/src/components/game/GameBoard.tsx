import React, { useEffect, useState } from 'react';
import { GameState, GameCard } from '@/types/game';
import { PlayerField } from './PlayerField';
import { toast } from 'sonner';
import { Play, SkipForward, RefreshCw, RotateCcw } from 'lucide-react';
import { Card as PrismaCard } from '@prisma/client';

interface GameBoardProps {
  gameState: GameState;
  onCardClick: (card: GameCard) => void;
  onEndTurn: () => void;
  onDrawCard: () => void;
  onMulligan: () => void;
  onKeepHand: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onCardClick,
  onEndTurn,
  onDrawCard,
  onMulligan,
  onKeepHand,
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

  const cardToGameCard = (card: PrismaCard, isFaceUp: boolean = true): GameCard => {
    return {
      id: card.id,
      name: card.name,
      type: card.type as GameCard['type'],
      color: card.color as GameCard['color'],
      cost: card.cost,
      power: card.power || 0,
      imageUrl: card.imageUrl,
      effect: card.effect || undefined,
      trigger: card.trigger || undefined,
      isFaceUp,
      isLeader: card.type === 'LEADER',
      isDon: card.type === 'DON',
      hasAttacked: false,
      hasRush: card.effect?.includes('[Rush]') || false,
      hasBlocker: card.effect?.includes('[Blocker]') || false,
      hasDoubleAttack: card.effect?.includes('[Double Attack]') || false,
      hasTrigger: !!card.trigger,
      hasCounter: card.counter !== null && card.counter !== undefined,
      counterValue: card.counter ? parseInt(card.counter) : undefined
    };
  };

  return (
    <div className="flex flex-col gap-8 p-6 bg-gray-900 min-h-screen pb-24">
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

      {/* Barre de statut fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4">
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            {/* Informations de jeu */}
            <div className="flex gap-8 text-white">
              <div>
                <span className="font-bold">Phase:</span> {gameState.currentPhase}
              </div>
              <div>
                <span className="font-bold">Tour:</span> {gameState.turnNumber}
              </div>
              <div>
                <span className="font-bold">Joueur actif:</span> {gameState.currentPlayer === 'player' ? 'Vous' : 'Adversaire'}
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-4">
              {gameState.currentPhase === 'SETUP' && !gameState.hasKeptHand ? (
                <>
                  <button
                    onClick={onMulligan}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                    title="Remettre vos cartes dans le deck et en piocher de nouvelles"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>Mulligan</span>
                  </button>
                  <button
                    onClick={onKeepHand}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                    title="Garder votre main actuelle"
                  >
                    <Play className="w-5 h-5" />
                    <span>Garder la main</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleDrawCard}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      gameState.currentPhase === 'DRAW' && gameState.currentPlayer === 'player'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-600 cursor-not-allowed'
                    } text-white`}
                    disabled={gameState.currentPhase !== 'DRAW' || gameState.currentPlayer !== 'player'}
                    title="Piocher une carte"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Piocher</span>
                  </button>

                  <button
                    onClick={handleEndTurn}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      gameState.currentPlayer === 'player' && gameState.currentPhase !== 'SETUP'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-gray-600 cursor-not-allowed'
                    } text-white`}
                    disabled={gameState.currentPlayer !== 'player' || gameState.currentPhase === 'SETUP'}
                    title="Terminer le tour"
                  >
                    <SkipForward className="w-5 h-5" />
                    <span>Fin de tour</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 