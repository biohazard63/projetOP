'use client';

import React, { useState, useEffect } from 'react';
import { GameState, GameCard, PlayerState } from '@/types/game';
import { Card } from '@prisma/client';
import { toast } from 'sonner';
import Image from 'next/image';

interface GameBoardProps {
  playerId: string;
  opponentId: string;
  playerDeck: Card[];
  opponentDeck: Card[];
}

export default function GameBoard({ playerId, opponentId, playerDeck, opponentDeck }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState>({
    currentPlayer: playerId,
    opponent: opponentId,
    turn: 1,
    phase: 'DRAW',
    players: {
      [playerId]: {
        id: playerId,
        life: 5,
        leader: null,
        hand: [],
        field: [],
        donDeck: [],
        donZone: [],
        deck: playerDeck,
        trash: []
      },
      [opponentId]: {
        id: opponentId,
        life: 5,
        leader: null,
        hand: [],
        field: [],
        donDeck: [],
        donZone: [],
        deck: opponentDeck,
        trash: []
      }
    },
    isAttacking: false,
    activeCard: null,
    targetCard: null
  });

  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null);

  // Initialiser le jeu avec des cartes dans la main
  useEffect(() => {
    if (playerDeck.length > 0 && opponentDeck.length > 0) {
      // Mélanger les decks
      const shuffledPlayerDeck = [...playerDeck].sort(() => Math.random() - 0.5);
      const shuffledOpponentDeck = [...opponentDeck].sort(() => Math.random() - 0.5);
      
      // Trouver un leader pour chaque joueur
      const playerLeader = shuffledPlayerDeck.find(card => card.type === 'LEADER');
      const opponentLeader = shuffledOpponentDeck.find(card => card.type === 'LEADER');
      
      // Retirer les leaders des decks
      const playerDeckWithoutLeader = shuffledPlayerDeck.filter(card => card !== playerLeader);
      const opponentDeckWithoutLeader = shuffledOpponentDeck.filter(card => card !== opponentLeader);
      
      // Tirer 5 cartes pour chaque joueur
      const playerHand = playerDeckWithoutLeader.slice(0, 5);
      const opponentHand = opponentDeckWithoutLeader.slice(0, 5);
      
      // Mettre à jour l'état du jeu
      setGameState(prev => ({
        ...prev,
        players: {
          [playerId]: {
            ...prev.players[playerId],
            leader: playerLeader ? {
              ...playerLeader,
              isLeader: true
            } : null,
            hand: playerHand.map(card => ({
              ...card,
              canAttack: false,
              hasAttacked: false
            })),
            deck: playerDeckWithoutLeader.slice(5)
          },
          [opponentId]: {
            ...prev.players[opponentId],
            leader: opponentLeader ? {
              ...opponentLeader,
              isLeader: true
            } : null,
            hand: opponentHand.map(card => ({
              ...card,
              canAttack: false,
              hasAttacked: false
            })),
            deck: opponentDeckWithoutLeader.slice(5)
          }
        }
      }));
      
      console.log('Jeu initialisé avec:');
      console.log('Deck du joueur:', playerDeckWithoutLeader.slice(5).length, 'cartess');
      console.log('Main du joueur:', playerHand.map(card => card.name));
      console.log('Leader du joueur:', playerLeader?.name);
    }
  }, [playerDeck, opponentDeck, playerId, opponentId]);

  const handleCardClick = (card: GameCard) => {
    if (gameState.phase === 'MAIN' && !gameState.isAttacking) {
      setSelectedCard(card);
    }
  };

  const handleFieldClick = (card: GameCard) => {
    if (gameState.isAttacking && gameState.activeCard) {
      // Logique d'attaque
      handleAttack(gameState.activeCard, card);
    }
  };

  const handleAttack = (attacker: GameCard, defender: GameCard) => {
    // Logique de combat
    const newGameState = { ...gameState };
    // Mise à jour des points de vie et des cartes
    setGameState(newGameState);
  };

  const handleEndPhase = () => {
    const phases: GamePhase[] = ['DRAW', 'DON', 'MAIN', 'END'];
    const currentIndex = phases.indexOf(gameState.phase);
    const nextPhase = phases[(currentIndex + 1) % phases.length];
    
    setGameState(prev => ({
      ...prev,
      phase: nextPhase,
      isAttacking: false,
      activeCard: null,
      targetCard: null
    }));
  };

  // Fonction pour afficher une carte
  const renderCard = (card: GameCard | null, isOpponent: boolean = false) => {
    if (!card) return null;
    
    return (
      <div className="relative w-full h-full">
        <div className="absolute inset-0">
          <img 
            src={card.imageUrl} 
            alt={card.name} 
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-1 rounded-b-lg">
          <div className="text-xs font-bold truncate">{card.name}</div>
          <div className="flex justify-between text-xs">
            <span>{card.cost}</span>
            {card.power && <span>{card.power}</span>}
          </div>
        </div>
        {card.isLeader && (
          <div className="absolute top-1 left-1 bg-yellow-500 text-black text-xs px-1 rounded">
            Leader
          </div>
        )}
        {card.isDon && (
          <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1 rounded">
            Don
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-gray-900 text-white p-4">
      <div className="flex flex-col h-full">
        {/* Zone de l'adversaire */}
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-4">
            {/* Leader Zone */}
            <div className="border-2 border-gray-700 rounded-lg p-2">
              {gameState.players[opponentId].leader && (
                <div className="aspect-[2/3] bg-gray-800 rounded-lg">
                  {renderCard(gameState.players[opponentId].leader, true)}
                </div>
              )}
            </div>
            
            {/* Field Zone */}
            <div className="col-span-4 grid grid-cols-4 gap-2">
              {gameState.players[opponentId].field.map((card, index) => (
                <div
                  key={card.id}
                  className="aspect-[2/3] bg-gray-800 rounded-lg cursor-pointer"
                  onClick={() => handleFieldClick(card)}
                >
                  {renderCard(card, true)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zone du joueur */}
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-4">
            {/* Field Zone */}
            <div className="col-span-4 grid grid-cols-4 gap-2">
              {gameState.players[playerId].field.map((card, index) => (
                <div
                  key={card.id}
                  className="aspect-[2/3] bg-gray-800 rounded-lg cursor-pointer"
                  onClick={() => handleFieldClick(card)}
                >
                  {renderCard(card)}
                </div>
              ))}
            </div>

            {/* Leader Zone */}
            <div className="border-2 border-gray-700 rounded-lg p-2">
              {gameState.players[playerId].leader && (
                <div className="aspect-[2/3] bg-gray-800 rounded-lg">
                  {renderCard(gameState.players[playerId].leader)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main du joueur */}
        <div className="h-32 mt-4">
          <div className="flex gap-2 overflow-x-auto">
            {gameState.players[playerId].hand.map((card) => (
              <div
                key={card.id}
                className="flex-shrink-0 w-24 aspect-[2/3] bg-gray-800 rounded-lg cursor-pointer"
                onClick={() => handleCardClick(card)}
              >
                {renderCard(card)}
              </div>
            ))}
          </div>
        </div>

        {/* Contrôles de phase */}
        <div className="mt-4 flex justify-between items-center">
          <div className="text-xl">
            Phase: {gameState.phase}
          </div>
          <button
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
            onClick={handleEndPhase}
          >
            Fin de phase
          </button>
        </div>
      </div>
    </div>
  );
} 