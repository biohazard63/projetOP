import React, { useState, useEffect } from 'react';
import { GameState, GameCard } from '@/types/game';
import PlayerField from './PlayerField';
import Card from './Card';
import { TestPanel } from './TestPanel';

import { PhaseService } from '@/lib/game/phaseService';
import { CombatService } from '@/lib/game/combatService';
import { PhaseActions } from './PhaseActions';
import { RotateCw as EndTurn, Zap, Target, Crown } from 'lucide-react';
import { Card as PrismaCard } from '@prisma/client';
import { CardStateService } from '@/lib/game/cardStateService';
import { toast } from 'sonner';
import { Play, SkipForward, RefreshCw, RotateCw, Sword } from 'lucide-react';

interface GameBoardProps {
  gameState: GameState;
  onCardClick: (card: GameCard) => void;
  onEndTurn: () => void;
  onDrawCard: () => void;
  onMulligan: () => void;
  onKeepHand: () => void;
  selectedAttacker?: string | null;
  onCancelAttack?: () => void;
  onSelectAttacker?: (card: GameCard) => void;
  onSelectTarget?: (card: GameCard) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onCardClick,
  onEndTurn,
  onDrawCard,
  onMulligan,
  onKeepHand,
  selectedAttacker,
  onCancelAttack,
  onSelectAttacker,
  onSelectTarget,
}) => {
  // Debug: vérifier si les fonctions sont bien reçues
  console.log('GameBoard - onSelectAttacker:', !!onSelectAttacker);
  console.log('GameBoard - onSelectTarget:', !!onSelectTarget);
  const [selectedCard, setSelectedCard] = useState<GameCard | undefined>();
  const [localGameState, setLocalGameState] = useState<GameState>(gameState);
  const [isOpen, setIsOpen] = useState(false);
  const [attackMode, setAttackMode] = useState(false);
  const [attackingCard, setAttackingCard] = useState<GameCard | undefined>();
  const [attackTarget, setAttackTarget] = useState<GameCard | undefined>();
  const [localSelectedAttacker, setLocalSelectedAttacker] = useState<string | null>(null);

  // Mettre à jour l'état local quand l'état du jeu change
  useEffect(() => {
    setLocalGameState(gameState);
  }, [gameState]);

  // Gérer les mises à jour de l'état local (pour les tests)
  const handleGameStateUpdate = (newState: GameState) => {
    setLocalGameState(newState);
    // Ici on pourrait aussi envoyer l'état au serveur si nécessaire
  };

  // Fonction pour gérer l'ouverture/fermeture du panneau de test
  const handleTestPanelToggle = () => {
    console.log('🧪 Bouton de test cliqué, état actuel:', isOpen);
    const newState = !isOpen;
    setIsOpen(newState);
    console.log('🧪 Nouvel état du panneau de test:', newState);
  };

  // Fonction pour changer la position d'une carte
  const handleToggleCardPosition = (card: GameCard) => {
    try {
      console.log('🔄 Changement de position de la carte:', card.name, 'actuel:', card.isActive ? 'Active' : 'Rested');
      
      const updatedState = CardStateService.toggleCardPosition(localGameState, 'player', card.id);
      setLocalGameState(updatedState);
      
      const newPosition = card.isActive ? 'Rested' : 'Active';
      toast.success(`${card.name} est maintenant en position ${newPosition}`);
      
      console.log('✅ Position changée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors du changement de position:', error);
      toast.error('Impossible de changer la position de la carte');
    }
  };



  // Fonction pour marquer une carte comme jouée ce tour
  const handleMarkCardAsPlayed = (card: GameCard) => {
    try {
      console.log('🎯 Marquage de la carte comme jouée ce tour:', card.name);
      
      const updatedState = CardStateService.markCardAsPlayedThisTurn(localGameState, 'player', card.id);
      toast.success(`${card.name} ne peut plus attaquer ce tour (Summoning Sickness)`);
      console.log('✅ Carte marquée comme jouée ce tour');
    } catch (error) {
      console.error('❌ Erreur lors du marquage:', error);
      toast.error('Impossible de marquer la carte');
    }
  };

  // Log pour déboguer le panneau de test
  useEffect(() => {
    console.log('🧪 Rendu du GameBoard, isOpen:', isOpen);
  }, [isOpen]);

  useEffect(() => {
    console.log('État du jeu mis à jour:', {
      joueur: {
        deck: localGameState.player.deck.length,
        main: localGameState.player.hand.length,
        terrain: localGameState.player.field.length,
        leader: localGameState.player.leader?.name,
        donField: localGameState.player.donField.length,
        activeDon: localGameState.player.activeDon,
      },
      adversaire: {
        deck: localGameState.opponent.deck.length,
        main: localGameState.opponent.hand.length,
        terrain: localGameState.opponent.field.length,
        leader: localGameState.opponent.leader?.name,
        donField: localGameState.opponent.donField.length,
        activeDon: localGameState.opponent.activeDon,
      },
      phase: localGameState.currentPhase,
      joueurActif: localGameState.currentPlayer,
      canDrawDon: localGameState.canDrawDon,
    });

    if (localGameState.currentPhase === 'SETUP' && !localGameState.player.leader) {
      toast.info('Phase de setup : Choisissez votre leader parmi vos cartes en main');
    }

    // Afficher des informations sur l'état des DON
    if (localGameState.currentPhase === 'START' && localGameState.canDrawDon) {
      toast.info('Phase START : Vous pouvez activer 2 DON de votre deck DON');
    }
  }, [localGameState]);

  const handleCardClick = (card: GameCard) => {
    console.log('Carte cliquée:', {
      nom: card.name,
      type: card.type,
      phase: localGameState.currentPhase,
      joueurActif: localGameState.currentPlayer,
      isActive: card.isActive,
      canAttack: card.canAttack,
      attachedDons: card.attachedDons,
      attackMode,
      attackingCard: attackingCard?.name,
    });

    // Gestion spéciale pour la phase de setup
    if (localGameState.currentPhase === 'SETUP') {
      if (!localGameState.player.leader) {
        // Sélection du leader
        if (card.type === 'LEADER' && localGameState.player.hand.includes(card)) {
          setSelectedCard(card);
          onCardClick(card);
        } else {
          toast.error('Vous devez choisir un leader parmi vos cartes en main');
        }
        return;
      }
    }

    // Gestion du mode attaque
    if (attackMode) {
      if (attackingCard) {
        // Une carte attaque, cette carte est la cible
        setAttackTarget(card);
      } else if (card.type === 'CHARACTER' || card.type === 'LEADER') {
        // Sélection de l'attaquant
        if (CombatService.canAttack(localGameState, card.id, 'dummy', 'player')) {
          toast.info(`${card.name} peut attaquer`);
        } else {
          toast.info(`${card.name} ne peut pas attaquer`);
        }
      }
      return;
    }

    // Gestion du jeu de cartes depuis la main
    if (localGameState.currentPhase === 'MAIN' && 
        localGameState.currentPlayer === 'player' && 
        card.type === 'CHARACTER' && 
        localGameState.player.hand.some(c => c.id === card.id)) {
      // Jouer la carte
      handlePlayCard(card);
      return;
    }

    setSelectedCard(card);
    onCardClick(card);
  };

  // Fonction pour effectuer un mulligan
  const handleMulligan = async () => {
    try {
      console.log('🔄 Tentative de mulligan...');
      
      const response = await fetch('/api/game/mulligan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du mulligan');
      }

      const updatedState = await response.json();
      setLocalGameState(updatedState);
      
      toast.success('Mulligan effectué avec succès');
      console.log('✅ Mulligan effectué');
      
    } catch (error) {
      console.error('❌ Erreur lors du mulligan:', error);
      toast.error('Impossible d\'effectuer le mulligan');
    }
  };

  // Fonction pour garder la main actuelle
  const handleKeepHand = async () => {
    try {
      console.log('✋ Tentative de conservation de la main...');
      
      const response = await fetch('/api/game/keep-hand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la conservation de la main');
      }

      const updatedState = await response.json();
      setLocalGameState(updatedState);
      
      toast.success('Main conservée, passage à la phase START');
      console.log('✅ Main conservée');
      
    } catch (error) {
      console.error('❌ Erreur lors de la conservation de la main:', error);
      toast.error('Impossible de conserver la main');
    }
  };

  // Fonction pour jouer une carte depuis la main
  const handlePlayCard = async (card: GameCard) => {
    try {
      console.log(`🎴 Tentative de jouer la carte: ${card.name}`);
      
      // Vérifier que nous sommes en phase MAIN
      if (localGameState.currentPhase !== 'MAIN') {
        toast.error('Vous devez être en phase MAIN pour jouer des cartes');
        return;
      }

      // Vérifier que c'est notre tour
      if (localGameState.currentPlayer !== 'player') {
        toast.error('Ce n\'est pas votre tour');
        return;
      }

      // Vérifier que la carte est dans notre main
      if (!localGameState.player.hand.some(c => c.id === card.id)) {
        toast.error('Cette carte n\'est pas dans votre main');
        return;
      }

      // Vérifier que c'est un personnage
      if (card.type !== 'CHARACTER') {
        toast.error('Seules les cartes personnage peuvent être jouées');
        return;
      }

      // Vérifier qu'il y a assez de DON
      if (localGameState.player.donField.length < card.cost) {
        toast.error(`Pas assez de DON pour jouer ${card.name} (nécessite ${card.cost} DON)`);
        return;
      }

      const response = await fetch('/api/game/play-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cardId: card.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du jeu de la carte');
      }

      const updatedState = await response.json();
      setLocalGameState(updatedState);
      
      toast.success(`${card.name} joué avec succès`);
      console.log('✅ Carte jouée:', card.name);
      
    } catch (error) {
      console.error('❌ Erreur lors du jeu de la carte:', error);
      toast.error('Impossible de jouer la carte');
    }
  };

  const handleAttack = async () => {
    if (!attackingCard || !attackTarget) {
      toast.error('Sélectionnez un attaquant et une cible');
      return;
    }

    try {
      console.log(`⚔️ Attaque: ${attackingCard.name} → ${attackTarget.name}`);

      const response = await fetch('/api/game/attack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          attackerId: attackingCard.id, 
          targetId: attackTarget.id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'attaque');
      }

      const updatedState = await response.json();
      setLocalGameState(updatedState);

      toast.success('⚔️ Attaque exécutée !');

      // Réinitialiser le mode attaque
      setAttackMode(false);
      setAttackingCard(undefined);
      setAttackTarget(undefined);

    } catch (error) {
      console.error('❌ Erreur lors de l\'attaque:', error);
      toast.error('Impossible d\'exécuter l\'attaque');
    }
  };

  // Nouvelles fonctions pour la gestion des phases
  const handleNextPhase = async () => {
    try {
      console.log('⏭️ Passage à la phase suivante...');
      
      const response = await fetch('/api/game/next-phase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du passage de phase');
      }

      const updatedState = await response.json();
      setLocalGameState(updatedState);
      
      const phaseDescription = PhaseService.getPhaseDescription(updatedState.currentPhase);
      toast.success(`Phase ${updatedState.currentPhase} : ${phaseDescription}`);
      
      console.log('✅ Phase suivante :', updatedState.currentPhase);
      
    } catch (error) {
      console.error('❌ Erreur lors du passage de phase:', error);
      toast.error('Impossible de passer à la phase suivante');
    }
  };

  const handlePreviousPhase = () => {
    try {
      console.log('⏮️ Retour à la phase précédente...');
      
      const updatedState = PhaseService.previousPhase(localGameState);
      setLocalGameState(updatedState);
      
      const phaseDescription = PhaseService.getPhaseDescription(updatedState.currentPhase);
      toast.info(`Retour à la phase ${updatedState.currentPhase} : ${phaseDescription}`);
      
      console.log('✅ Phase précédente :', updatedState.currentPhase);
      
    } catch (error) {
      console.error('❌ Erreur lors du retour de phase:', error);
      toast.error('Impossible de revenir à la phase précédente');
    }
  };

  const handleEndTurn = async () => {
    try {
      console.log('🔄 Fin du tour...');
      
      const response = await fetch('/api/game/end-turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la fin de tour');
      }

      const updatedState = await response.json();
      setLocalGameState(updatedState);
      
      const newActivePlayer = updatedState.currentPlayer;
      toast.success(`Tour de ${newActivePlayer === 'player' ? 'vous' : 'l\'adversaire'} commencé`);
      console.log('✅ Tour terminé, nouveau joueur actif:', newActivePlayer);
      
    } catch (error) {
      console.error('❌ Erreur lors de la fin de tour:', error);
      toast.error('Impossible de terminer le tour');
    }
  };

  const handleDrawCard = async () => {
    try {
      console.log('📚 Tentative de pioche...');
      
      if (localGameState.currentPhase !== 'DRAW') {
        toast.error('Vous devez être en phase DRAW pour piocher');
        return;
      }

      const response = await fetch('/api/game/draw-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la pioche');
      }

      const updatedState = await response.json();
      setLocalGameState(updatedState);
      
      toast.success('Carte piochée avec succès');
      console.log('✅ Carte piochée');
      
    } catch (error) {
      console.error('❌ Erreur lors de la pioche:', error);
      toast.error('Impossible de piocher une carte');
    }
  };

  // Fonctions pour gérer les attaques avec localGameState
  const handleSelectAttackerLocal = (card: GameCard) => {
    console.log('🎯 handleSelectAttackerLocal called for card:', card.name, card.id);
    
    // Vérifier que la carte peut attaquer (est sur le terrain du joueur actif)
    console.log('🎯 localGameState.currentPlayer:', localGameState.currentPlayer);
    const player = localGameState[localGameState.currentPlayer];
    console.log('🎯 Current player field IDs in handleSelectAttackerLocal:', player.field.map(c => c.id));
    const isOnField = player.field.some(c => c.id === card.id);
    
    console.log('🎯 Card canAttack:', card.canAttack, 'isOnField:', isOnField, 'hasAttacked:', card.hasAttacked);
    
    if (isOnField && card.canAttack && !card.hasAttacked) {
      // Utiliser l'état local au lieu d'appeler la fonction de page.tsx
      setLocalSelectedAttacker(card.id);
      console.log('🎯 setLocalSelectedAttacker appelé avec:', card.id);
      toast.info(`Attaquant sélectionné: ${card.name}`);
    } else if (!isOnField) {
      toast.error('Cette carte n\'est pas sur votre terrain');
    } else if (card.hasAttacked) {
      toast.error('Cette carte a déjà attaqué ce tour');
    } else {
      toast.error('Cette carte ne peut pas attaquer');
    }
  };

  const handleSelectTargetLocal = async (card: GameCard) => {
    if (!localSelectedAttacker) return;

    try {
      const response = await fetch('/api/game/attack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          attackerId: localSelectedAttacker,
          targetId: card.id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'attaque');
      }

      const updatedState = await response.json();
      setLocalGameState(updatedState);
      setLocalSelectedAttacker(null); // Réinitialiser l'attaquant local
      
      toast.success('Attaque lancée !');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(error instanceof Error ? error.message : 'Impossible de lancer l\'attaque');
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
      counterValue: card.counter ? parseInt(card.counter) : undefined,
      // Nouveaux champs pour le système de DON
      isActive: true,
      canAttack: true,
      wasPlayedThisTurn: false,
      attachedDons: 0,
      donAttachments: []
    };
  };

  return (
    <div className="flex flex-col gap-8 p-6 bg-gray-900 min-h-screen pb-24">
      {/* Affichage de fin de partie */}
      {localGameState.gameOver && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-black via-purple-900 to-black bg-opacity-90 flex items-center justify-center z-[9999] backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 p-1 rounded-2xl shadow-2xl animate-pulse"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black p-12 rounded-xl text-center max-w-lg relative overflow-hidden">
              {/* Effet de particules dorées */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent animate-pulse pointer-events-none"></div>
              
              {/* Icône de victoire avec animation */}
              <div className="text-8xl mb-6 animate-bounce pointer-events-none">
                {localGameState.winner === 'player' ? '🏆' : '💀'}
              </div>
              
              {/* Titre avec effet de brillance */}
              <h2 className="text-4xl font-black mb-6 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 bg-clip-text text-transparent animate-pulse pointer-events-none">
                {localGameState.winner === 'player' ? 'VICTOIRE !' : 'DÉFAITE !'}
              </h2>
              
              {/* Message de félicitations */}
              <p className="text-xl mb-8 text-gray-300 leading-relaxed pointer-events-none">
                {localGameState.winner === 'player' 
                  ? '🎉 Félicitations ! Vous avez dominé la bataille ! 🎉' 
                  : '😔 L\'adversaire a remporté cette bataille... 😔'}
              </p>
              
              {/* Bouton avec effet hover */}
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🎮 Bouton Nouvelle Partie cliqué !');
                  // Forcer une nouvelle partie en redirigeant vers la page de jeu
                  window.location.href = '/game';
                }}
                className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-500 hover:via-blue-400 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-blue-400/50 cursor-pointer relative z-10"
                style={{ pointerEvents: 'auto' }}
              >
                🎮 Nouvelle Partie
              </button>
              
              {/* Effet de lueur en bas */}
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-50 pointer-events-none"></div>
            </div>
          </div>
        </div>
      )}

      {/* Panneau de test (visible en mode développement) */}
      <TestPanel 
        gameState={localGameState} 
        onGameStateUpdate={handleGameStateUpdate}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />

      {/* Message de phase de setup */}
      {localGameState.currentPhase === 'SETUP' && !localGameState.player.leader && (
        <div className="bg-blue-600 text-white p-4 rounded-lg text-center">
          Choisissez votre leader parmi vos cartes en main
        </div>
      )}

      {/* Message pour l'activation des DON */}
      {localGameState.currentPhase === 'START' && localGameState.canDrawDon && localGameState.currentPlayer === 'player' && (
        <div className="bg-yellow-600 text-black p-4 rounded-lg text-center font-bold">
          🎯 Phase START : Cliquez sur &quot;Activer DON&quot; pour piocher 2 DON de votre deck DON
        </div>
      )}

      {/* Statut du jeu */}
      <div className="bg-gray-800 text-white p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-2">Statut du jeu</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Phase:</span>
            <span className="font-semibold text-blue-400">
              {localGameState.currentPhase}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Joueur actif:</span>
            <span className="font-semibold text-green-400">
              {localGameState.currentPlayer === 'player' ? 'Vous' : 'Adversaire'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tour:</span>
            <span className="font-semibold text-yellow-400">
              {localGameState.turnNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span>DON disponibles:</span>
            <span className="font-semibold text-purple-400">
              {localGameState.canDrawDon ? 'OUI' : 'NON'}
            </span>
          </div>
          <div className="mt-3 p-2 bg-gray-700 rounded text-sm">
            <span className="text-gray-300">
              {PhaseService.getPhaseDescription(localGameState.currentPhase)}
            </span>
          </div>
          <div className="mt-2 p-2 bg-gray-700 rounded text-sm">
            <span className="text-gray-300">
              Actions: {PhaseService.getAvailableActions(localGameState).join(', ')}
            </span>
          </div>
        </div>
      </div>

      {/* Plateau de jeu */}
      <div className="flex-1 flex flex-col justify-between">
        <PlayerField
          player={localGameState.opponent}
          isOpponent={true}
          onCardClick={handleCardClick}
          selectedCard={selectedCard}
          selectedAttacker={localSelectedAttacker}
          onSelectAttacker={handleSelectAttackerLocal}
          onSelectTarget={handleSelectTargetLocal}
        />

        <PlayerField
          player={localGameState.player}
          onCardClick={handleCardClick}
          selectedCard={selectedCard}
          onToggleCardPosition={handleToggleCardPosition}
          selectedAttacker={localSelectedAttacker}
          onSelectAttacker={handleSelectAttackerLocal}
          onSelectTarget={handleSelectTargetLocal}
        />
      </div>



      {/* Barre de statut simplifiée */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-3">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            {/* Informations essentielles */}
            <div className="flex gap-6 text-white text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-300">Phase:</span>
                <span className="font-semibold text-blue-400">{localGameState.currentPhase}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-300">Tour:</span>
                <span className="font-semibold text-yellow-400">{localGameState.turnNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-300">Joueur:</span>
                <span className="font-semibold text-green-400">
                  {localGameState.currentPlayer === 'player' ? 'Vous' : 'Adversaire'}
                </span>
              </div>
            </div>

            {/* Actions de phase centralisées */}
            <div className="flex-1 flex justify-center">
              <PhaseActions
                gameState={localGameState}
                onNextPhase={handleNextPhase}
                onEndTurn={handleEndTurn}
                onDrawCard={handleDrawCard}
                onMulligan={handleMulligan}
                onKeepHand={handleKeepHand}
              />
            </div>

            {/* Bouton d'annulation d'attaque */}
            {localSelectedAttacker && localGameState.currentPhase === 'BATTLE' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setLocalSelectedAttacker(null)}
                  className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm transition-colors"
                >
                  Annuler l'attaque
                </button>
              </div>
            )}

            {/* Bouton de test discret (optionnel) */}
            <div className="flex gap-2">
              <button
                onClick={handleTestPanelToggle}
                className="px-3 py-1.5 rounded-md bg-gray-600 hover:bg-gray-700 text-white text-xs transition-colors"
                title="Panneau de test"
              >
                🧪
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 