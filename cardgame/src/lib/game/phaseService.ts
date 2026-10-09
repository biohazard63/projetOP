import { GameState, GamePhase, GameCard } from '@/types/game';
import { CardStateService } from './cardStateService';
import { CombatService } from './combatService';
import { DonService } from './donService';

export class PhaseService {
  /**
   * Passe à la phase suivante
   */
  static nextPhase(gameState: GameState): GameState {
    const currentPhase = gameState.currentPhase;
    let nextPhase: GamePhase;
    let canDrawDon = gameState.canDrawDon;

    console.log(`🔄 Transition de phase: ${currentPhase} → ?`);

    switch (currentPhase) {
      case 'SETUP':
        nextPhase = 'START';
        break;
      case 'START':
        nextPhase = 'DRAW';
        canDrawDon = true; // Peut activer des DON en phase START
        console.log(`🔄 Transition: START → DRAW`);
        break;
      case 'DRAW':
        nextPhase = 'MAIN';
        break;
      case 'MAIN':
        nextPhase = 'BATTLE';
        break;
      case 'BATTLE':
        nextPhase = 'END';
        break;
      case 'END':
        nextPhase = 'START';
        // Changement de joueur actif
        const newActivePlayer = gameState.currentPlayer === 'player' ? 'opponent' : 'player';
        return this.endTurn(gameState, newActivePlayer);
      default:
        nextPhase = 'START';
    }

    console.log(`✅ Nouvelle phase: ${nextPhase}`);

    return {
      ...gameState,
      currentPhase: nextPhase,
      canDrawDon
    };
  }

  /**
   * Passe à la phase précédente
   */
  static previousPhase(gameState: GameState): GameState {
    const currentPhase = gameState.currentPhase;
    let previousPhase: GamePhase;
    let canDrawDon = gameState.canDrawDon;

    switch (currentPhase) {
      case 'START':
        previousPhase = 'SETUP';
        break;
      case 'DRAW':
        previousPhase = 'START';
        canDrawDon = false;
        break;
      case 'MAIN':
        previousPhase = 'DRAW';
        break;
      case 'BATTLE':
        previousPhase = 'MAIN';
        break;
      case 'END':
        previousPhase = 'BATTLE';
        break;
      default:
        previousPhase = 'START';
    }

    return {
      ...gameState,
      currentPhase: previousPhase,
      canDrawDon
    };
  }

  /**
   * Termine le tour actuel et passe au joueur suivant
   */
  static endTurn(gameState: GameState, newActivePlayer?: 'player' | 'opponent'): GameState {
    // Si aucun joueur n'est spécifié, alterner automatiquement
    const nextPlayer = newActivePlayer || (gameState.currentPlayer === 'player' ? 'opponent' : 'player');
    
    console.log(`🔄 Fin du tour de ${gameState.currentPlayer}, passage à ${nextPlayer}`);

    // Réinitialiser les états de combat pour le nouveau joueur
    const updatedState = CombatService.resetCombatStates(gameState, nextPlayer);

    // Rafraîchir toutes les cartes du nouveau joueur
    const refreshedState = CardStateService.refreshAllCards(updatedState, nextPlayer);

    // Réinitialiser les états spécifiques au tour
    const finalState = this.resetTurnStates(refreshedState, nextPlayer);

    // Créer l'état avec le nouveau joueur et la phase START
    const newGameState = {
      ...finalState,
      currentPlayer: nextPlayer,
      currentPhase: 'START' as GamePhase,
      canDrawDon: true, // Les deux joueurs peuvent piocher des DON
      turnNumber: gameState.currentPlayer === 'opponent' ? (gameState.turnNumber || 1) + 1 : (gameState.turnNumber || 1)
    };

    console.log(`✅ Tour de ${nextPlayer} commencé`);

    // Exécuter automatiquement les actions de la phase START (distribution des DON, etc.)
    return this.executePhaseActions(newGameState);
  }

  /**
   * Réinitialise les états spécifiques au tour
   */
  private static resetTurnStates(gameState: GameState, playerId: 'player' | 'opponent'): GameState {
    const player = gameState[playerId];

    // Réinitialiser les états des cartes
    const updatedField = player.field.map(card => ({
      ...card,
      wasPlayedThisTurn: false,
      hasAttacked: false,
      isBlocking: false,
      isAttacking: false
    }));

    // Réinitialiser le Leader
    const updatedLeader = player.leader ? {
      ...player.leader,
      wasPlayedThisTurn: false,
      hasAttacked: false,
      isBlocking: false,
      isAttacking: false
    } : null;

    // Réinitialiser les DON
    const updatedDonField = player.donField.map(don => ({
      ...don,
      isActive: true
    }));

    return {
      ...gameState,
      [playerId]: {
        ...player,
        field: updatedField,
        leader: updatedLeader,
        donField: updatedDonField,
        // Les DON dans le champ restent actifs
      },
      canDrawDon: true // Réinitialiser pour permettre la pioche de DON
    };
  }

  /**
   * Exécute les actions automatiques d'une phase
   */
  static executePhaseActions(gameState: GameState): GameState {
    const currentPhase = gameState.currentPhase;
    let updatedState = gameState;

    console.log(`🎯 Exécution des actions automatiques pour la phase: ${currentPhase}`);

    switch (currentPhase) {
      case 'START':
        console.log('🌅 Phase START : Début du tour');
        // Distribution automatique des cartes DON au début du tour
        updatedState = this.executeStartPhase(gameState);
        break;

      case 'DRAW':
        console.log('📚 Phase DRAW : Pioche automatique');
        updatedState = this.executeDrawPhase(gameState);
        break;

      case 'MAIN':
        console.log('⚡ Phase MAIN : Actions principales');
        // Le joueur peut jouer des cartes
        break;

      case 'BATTLE':
        console.log('⚔️ Phase BATTLE : Combat');
        // Le joueur peut attaquer
        break;

      case 'END':
        console.log('🌙 Phase END : Fin du tour');
        updatedState = this.executeEndPhase(gameState);
        break;

      default:
        console.log(`❓ Phase inconnue : ${currentPhase}`);
    }

    return updatedState;
  }

  /**
   * Exécute les actions de la phase START
   */
  private static executeStartPhase(gameState: GameState): GameState {
    const activePlayer = gameState.currentPlayer;
    const player = gameState[activePlayer];

    console.log(`🔍 DEBUG START: Joueur actif: ${activePlayer}`);
    console.log(`🔍 DEBUG START: Tour: ${gameState.turnNumber}`);
    console.log(`🔍 DEBUG START: Premier tour: ${gameState.isFirstTurn}`);
    console.log(`🔍 DEBUG START: Taille du deck DON: ${player.donDeck.length}`);
    console.log(`🔍 DEBUG START: Taille DON Active: ${player.donField.length}`);
    console.log(`🔍 DEBUG START: Taille DON Épuisé: ${player.usedDonDeck.length}`);
    console.log(`🔍 DEBUG START: Cartes DON Active:`, player.donField.map(d => d.id));
    console.log(`🔍 DEBUG START: Cartes DON Épuisé:`, player.usedDonDeck.map(d => d.id));

    // 1. Restaurer les cartes DON Épuisé (les remettre en position Active)
    const restoredDonField = [...player.donField, ...player.usedDonDeck.map(don => ({ ...don, isActive: true }))];
    const emptyUsedDonDeck: GameCard[] = [];

    console.log(`🔄 Restauration de ${player.usedDonDeck.length} cartes DON Épuisé`);

    // 2. Distribuer automatiquement 2 nouvelles cartes DON (si disponibles)
    let finalDonField = restoredDonField;
    let finalDonDeck = player.donDeck;
    let donAddedThisTurn = false;

    if (player.donDeck.length >= 2) {
      const donToActivate = player.donDeck.slice(0, 2);
      finalDonDeck = player.donDeck.slice(2);
      finalDonField = [...restoredDonField, ...donToActivate];
      donAddedThisTurn = true;

      console.log(`💎 Distribution automatique de ${donToActivate.length} nouvelles cartes DON`);
    } else {
      console.log('⚠️ Pas assez de cartes DON dans le deck pour en distribuer');
    }

    console.log(`🔍 DEBUG START: État final - Deck DON: ${finalDonDeck.length}, Champ DON: ${finalDonField.length}, DON Épuisé: ${emptyUsedDonDeck.length}`);

    // Mettre à jour l'état du joueur
    const updatedPlayer = {
      ...player,
      donDeck: finalDonDeck,
      donField: finalDonField,
      usedDonDeck: emptyUsedDonDeck,
      donAddedThisTurn // Marquer que des DON ont été ajoutés ce tour (ou pas)
    };

    return {
      ...gameState,
      [activePlayer]: updatedPlayer,
      canDrawDon: false // Le joueur ne peut plus piocher de DON ce tour
    };
  }

  /**
   * Exécute les actions de la phase DRAW
   */
  private static executeDrawPhase(gameState: GameState): GameState {
    const activePlayer = gameState.currentPlayer;
    const player = gameState[activePlayer];

    console.log(`🔍 DEBUG DRAW: Joueur actif: ${activePlayer}`);
    console.log(`🔍 DEBUG DRAW: Taille du deck: ${player.deck.length}`);
    console.log(`🔍 DEBUG DRAW: Taille de la main: ${player.hand.length}`);
    console.log(`🔍 DEBUG DRAW: DON ajoutés ce tour: ${player.donAddedThisTurn}`);
    console.log(`🔍 DEBUG DRAW: Taille du champ DON: ${player.donField.length}`);

    // Vérifier si les DON ont été distribués ce tour
    if (!player.donAddedThisTurn && player.donDeck.length >= 2) {
      console.log('💎 Distribution des DON en phase DRAW (rattrapage)');
      // Distribuer les DON d'abord
      const donToActivate = player.donDeck.slice(0, 2);
      const remainingDonDeck = player.donDeck.slice(2);
      
      const playerWithDon = {
        ...player,
        donDeck: remainingDonDeck,
        donField: [...player.donField, ...donToActivate],
        donAddedThisTurn: true
      };

      // Puis piocher une carte
      if (playerWithDon.deck.length === 0) {
        console.log('⚠️ Deck vide, pas de pioche possible');
        return {
          ...gameState,
          [activePlayer]: playerWithDon
        };
      }

      const drawnCard = {
        ...playerWithDon.deck[0],
        isFaceUp: true // Les cartes piochées sont face visible
      };
      const updatedDeck = playerWithDon.deck.slice(1);
      const updatedHand = [...playerWithDon.hand, drawnCard];

      console.log(`🎴 Carte piochée : ${drawnCard.name}`);
      console.log(`🔍 DEBUG DRAW: Nouvelle taille du deck: ${updatedDeck.length}`);
      console.log(`🔍 DEBUG DRAW: Nouvelle taille de la main: ${updatedHand.length}`);

      return {
        ...gameState,
        [activePlayer]: {
          ...playerWithDon,
          deck: updatedDeck,
          hand: updatedHand
        }
      };
    }

    // Piocher une carte normalement
    if (player.deck.length === 0) {
      console.log('⚠️ Deck vide, pas de pioche possible');
      return gameState;
    }

    const drawnCard = {
      ...player.deck[0],
      isFaceUp: true // Les cartes piochées sont face visible
    };
    const updatedDeck = player.deck.slice(1);
    const updatedHand = [...player.hand, drawnCard];

    console.log(`🎴 Carte piochée : ${drawnCard.name}`);
    console.log(`🔍 DEBUG DRAW: Nouvelle taille du deck: ${updatedDeck.length}`);
    console.log(`🔍 DEBUG DRAW: Nouvelle taille de la main: ${updatedHand.length}`);

    return {
      ...gameState,
      [activePlayer]: {
        ...player,
        deck: updatedDeck,
        hand: updatedHand
      }
    };
  }

  /**
   * Exécute les actions de la phase END
   */
  private static executeEndPhase(gameState: GameState): GameState {
    const activePlayer = gameState.currentPlayer;
    const player = gameState[activePlayer];

    // Vérifier la taille de la main (règle de fin de tour)
    const maxHandSize = 7;
    let updatedHand = player.hand;
    let updatedTrash = player.trash;

    if (player.hand.length > maxHandSize) {
      const cardsToDiscard = player.hand.length - maxHandSize;
      const discardedCards = player.hand.slice(-cardsToDiscard);
      updatedHand = player.hand.slice(0, maxHandSize);
      updatedTrash = [...player.trash, ...discardedCards];

      console.log(`🗑️ ${cardsToDiscard} cartes défaussées (main > ${maxHandSize})`);
    }

    return {
      ...gameState,
      [activePlayer]: {
        ...player,
        hand: updatedHand,
        trash: updatedTrash
      }
    };
  }

  /**
   * Vérifie si une action est autorisée dans la phase actuelle
   */
  static canPerformAction(gameState: GameState, action: string): boolean {
    const currentPhase = gameState.currentPhase;

    switch (action) {
      case 'DRAW_CARD':
        return currentPhase === 'DRAW';
      
      case 'ACTIVATE_DON':
        return currentPhase === 'DON' && gameState.canDrawDon;
      
      case 'PLAY_CARD':
        return currentPhase === 'MAIN';
      
      case 'ATTACK':
        return currentPhase === 'BATTLE';
      
      case 'END_TURN':
        return currentPhase === 'END';
      
      default:
        return false;
    }
  }

  /**
   * Obtient la description de la phase actuelle
   */
  static getPhaseDescription(phase: GamePhase): string {
    switch (phase) {
      case 'SETUP':
        return 'Configuration : Choisissez votre Leader et gardez votre main initiale';
      case 'START':
        return 'Début : Commencez votre tour';
      case 'DRAW':
        return 'Pioche : Piochez une carte et activez des DON';
      case 'DON':
        return 'DON : Activez des DON pour les utiliser';
      case 'MAIN':
        return 'Principale : Jouez des cartes et utilisez des capacités';
      case 'BATTLE':
        return 'Combat : Attaquez avec vos personnages';
      case 'END':
        return 'Fin : Terminez votre tour';
      default:
        return 'Phase inconnue';
    }
  }

  /**
   * Obtient les actions disponibles dans la phase actuelle
   */
  static getAvailableActions(gameState: GameState): string[] {
    const currentPhase = gameState.currentPhase;
    const actions: string[] = [];

    switch (currentPhase) {
      case 'SETUP':
        actions.push('CHOOSE_LEADER', 'KEEP_HAND', 'MULLIGAN');
        break;
      case 'START':
        actions.push('NEXT_PHASE');
        break;
      case 'DRAW':
        actions.push('DRAW_CARD', 'NEXT_PHASE');
        break;
      case 'DON':
        if (gameState.canDrawDon) {
          actions.push('ACTIVATE_DON', 'NEXT_PHASE');
        } else {
          actions.push('NEXT_PHASE');
        }
        break;
      case 'MAIN':
        actions.push('PLAY_CARD', 'USE_ABILITY', 'NEXT_PHASE');
        break;
      case 'BATTLE':
        actions.push('ATTACK', 'NEXT_PHASE');
        break;
      case 'END':
        actions.push('END_TURN', 'NEXT_PHASE');
        break;
    }

    return actions;
  }
}
