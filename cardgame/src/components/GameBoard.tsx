'use client';

import React, { useState, useEffect } from 'react';
import { GameState, GameCard } from '@/types/game';
import { useGame } from '@/hooks/useGame';
import { PlayerField } from './game/PlayerField';
import { GameControls } from './game/GameControls';
import { GameSetup } from './game/GameSetup';
import { toast } from 'sonner';

interface GameBoardProps {
  playerDeck: GameCard[];
  opponentDeck: GameCard[];
}

export default function GameBoard({ playerDeck, opponentDeck }: GameBoardProps) {
  const {
    gameState,
    chooseFirst,
    chooseLeader,
    setLife,
    setDon,
    drawStarting,
    mulligan,
    ready,
    drawCard,
    playCard,
    attack,
    endTurn,
    addDon,
    attachCard,
    blockAttack,
    counterAttack,
    activateEffect,
  } = useGame(playerDeck, opponentDeck);

  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null);
  const [targetCard, setTargetCard] = useState<GameCard | null>(null);

  useEffect(() => {
    if (gameState.gameOver) {
      toast.success(`Partie terminée ! ${gameState.winner === 'player' ? 'Vous avez gagné !' : 'Vous avez perdu !'}`);
    }
  }, [gameState.gameOver, gameState.winner]);

  const handleCardClick = (card: GameCard, location: 'hand' | 'field' | 'leader') => {
    if (gameState.currentPlayer !== 'player') return;

    if (selectedCard) {
      // Si une carte est déjà sélectionnée, on vérifie si c'est une attaque, un attachement ou un blocage
      if (location === 'field' || location === 'leader') {
        if (selectedCard.position === 'ACTIVE' && !selectedCard.hasAttacked) {
          // Vérifier si la carte cible a un bloqueur
          if (card.hasBlocker) {
            blockAttack('opponent', card, selectedCard);
          } else {
            attack('player', selectedCard, card);
          }
          setSelectedCard(null);
          setTargetCard(null);
        } else if (gameState.currentPhase === 'MAIN') {
          if (selectedCard.hasCounter && card.position === 'ACTIVE') {
            counterAttack('player', selectedCard, card);
          } else {
            attachCard('player', selectedCard, card);
          }
          setSelectedCard(null);
        }
      }
    } else {
      // Sélection d'une nouvelle carte
      if (location === 'hand' && gameState.currentPhase === 'MAIN') {
        setSelectedCard(card);
      } else if (location === 'field' && gameState.currentPhase === 'MAIN') {
        setSelectedCard(card);
      }
    }
  };

  const handlePlayCard = () => {
    if (selectedCard && gameState.currentPhase === 'MAIN') {
      playCard('player', selectedCard);
      // Activer les effets de la carte si elle en a
      if (selectedCard.effects && selectedCard.effects.length > 0) {
        activateEffect('player', selectedCard);
      }
      setSelectedCard(null);
    }
  };

  const handleEndTurn = () => {
    if (gameState.canEndTurn) {
      endTurn();
      setSelectedCard(null);
      setTargetCard(null);
    }
  };

  if (gameState.currentPhase === 'SETUP') {
    return (
      <GameSetup
        gameState={gameState}
        onChooseFirst={chooseFirst}
        onChooseLeader={chooseLeader}
        onSetLife={setLife}
        onSetDon={setDon}
        onDrawStarting={drawStarting}
        onMulligan={mulligan}
        onReady={ready}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="container mx-auto space-y-8">
        {/* Champ de l'adversaire */}
        <PlayerField
          player={gameState.opponent}
          isActive={gameState.currentPlayer === 'opponent'}
          onCardClick={(card) => setTargetCard(card)}
          onLeaderClick={(card) => setTargetCard(card)}
        />

        {/* Champ du joueur */}
        <PlayerField
          player={gameState.player}
          isActive={gameState.currentPlayer === 'player'}
          onCardClick={(card) => handleCardClick(card, 'field')}
          onLeaderClick={(card) => handleCardClick(card, 'leader')}
        />

        {/* Contrôles du jeu */}
        <GameControls
          currentPhase={gameState.currentPhase}
          currentPlayer={gameState.currentPlayer}
          canPlayCard={!!selectedCard && gameState.currentPhase === 'MAIN'}
          canAttack={!!selectedCard && !!targetCard}
          canEndTurn={gameState.canEndTurn}
          onDrawCard={() => drawCard('player')}
          onAddDon={() => addDon('player')}
          onEndTurn={handleEndTurn}
        />

        {/* Informations sur le tour */}
        <div className="fixed top-4 left-4 bg-white p-4 rounded-lg shadow-lg">
          <div className="text-sm">
            <p>Tour: {gameState.turnNumber}</p>
            <p>Phase: {gameState.currentPhase}</p>
            {gameState.lastAction && (
              <p className="text-gray-600">{gameState.lastAction}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 