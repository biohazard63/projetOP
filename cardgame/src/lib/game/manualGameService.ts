import { GameState, GameCard, Player } from '@/types/game';
import { PhaseService } from './phaseService';
import { DonService } from './donService';
import { CombatService } from './combatService';

export class ManualGameService {
  /**
   * Initialise un état de jeu avec les vrais decks des joueurs
   */
  static initializeGameWithDecks(
    playerDeck: GameCard[],
    opponentDeck: GameCard[],
    playerLeader: GameCard,
    opponentLeader: GameCard
  ): GameState {
    // Créer les mains initiales (5 cartes)
    const playerHand = playerDeck.slice(0, 5);
    const opponentHand = opponentDeck.slice(0, 5);
    
    // Créer les decks (cartes restantes)
    const playerDeckRemaining = playerDeck.slice(5);
    const opponentDeckRemaining = opponentDeck.slice(5);
    
    // Créer les decks DON (10 DON chacun)
    const playerDonDeck = Array.from({ length: 10 }, (_, i) => ({
      id: `don-player-${i}`,
      name: 'DON!!',
      type: 'DON' as const,
      color: 'BLACK' as const,
      cost: 0,
      power: 0,
      imageUrl: '/don.png',
      effect: 'DON!! Card',
      isDon: true,
      isActive: true,
      canAttack: false,
      wasPlayedThisTurn: false,
      hasAttacked: false,
      attachedDons: 0,
      donAttachments: []
    }));
    
    const opponentDonDeck = Array.from({ length: 10 }, (_, i) => ({
      id: `don-opponent-${i}`,
      name: 'DON!!',
      type: 'DON' as const,
      color: 'BLACK' as const,
      cost: 0,
      power: 0,
      imageUrl: '/don.png',
      effect: 'DON!! Card',
      isDon: true,
      isActive: true,
      canAttack: false,
      wasPlayedThisTurn: false,
      hasAttacked: false,
      attachedDons: 0,
      donAttachments: []
    }));

    return {
      id: 'manual_game',
      player: {
        id: 'player',
        name: 'Joueur',
        lifePoints: 5,
        deck: playerDeckRemaining,
        hand: playerHand,
        field: [],
        leader: {
          ...playerLeader,
          isActive: true,
          canAttack: true,
          hasAttacked: false,
          wasPlayedThisTurn: false,
          attachedDons: 0,
          donAttachments: []
        },
        donDeck: playerDonDeck,
        donField: [],
        donAddedThisTurn: false,
        discardPile: [],
        trash: [],
        donAttachments: [],
        activeDon: 0,
        usedDonDeck: []
      },
      opponent: {
        id: 'opponent',
        name: 'Adversaire',
        lifePoints: 5,
        deck: opponentDeckRemaining,
        hand: opponentHand,
        field: [],
        leader: {
          ...opponentLeader,
          isActive: true,
          canAttack: true,
          hasAttacked: false,
          wasPlayedThisTurn: false,
          attachedDons: 0,
          donAttachments: []
        },
        donDeck: opponentDonDeck,
        donField: [],
        donAddedThisTurn: false,
        discardPile: [],
        trash: [],
        donAttachments: [],
        activeDon: 0,
        usedDonDeck: []
      },
      currentPhase: 'START',
      currentPlayer: 'player',
      setupPhase: 'COMPLETE',
      hasKeptHand: true,
      canDrawDon: true,
      battleStack: [],
      turnNumber: 1,
      isFirstTurn: true
    };
  }

  /**
   * Joue une carte depuis la main vers le terrain
   */
  static playCard(
    gameState: GameState,
    playerId: 'player' | 'opponent',
    cardId: string
  ): GameState {
    const player = gameState[playerId];
    
    // Trouver la carte dans la main
    const card = player.hand.find(c => c.id === cardId);
    if (!card) {
      throw new Error('Carte non trouvée dans la main');
    }
    
    // Vérifier que c'est un personnage
    if (card.type !== 'CHARACTER') {
      throw new Error('Seules les cartes personnage peuvent être jouées');
    }
    
    // Vérifier qu'il y a assez de DON
    if (player.donField.length < card.cost) {
      throw new Error(`Pas assez de DON pour jouer ${card.name} (nécessite ${card.cost} DON)`);
    }
    
    // Retirer la carte de la main
    const updatedHand = player.hand.filter(c => c.id !== cardId);
    
    // Ajouter la carte au terrain
    const updatedField = [...player.field, {
      ...card,
      isActive: false, // Position Rested
      wasPlayedThisTurn: true,
      canAttack: true, // TEMPORAIRE: Permettre l'attaque immédiate pour tester
      hasAttacked: false
    }];
    
    // Consommer les DON du champ - les déplacer vers DON Épuisé
    const donToUse = player.donField.slice(0, card.cost);
    const remainingDonField = player.donField.slice(card.cost);
    
    // Déplacer les DON utilisés vers usedDonDeck (DON Épuisé)
    const updatedUsedDonDeck = [...player.usedDonDeck, ...donToUse];
    
    return {
      ...gameState,
      [playerId]: {
        ...player,
        hand: updatedHand,
        field: updatedField,
        donField: remainingDonField, // Seules les cartes DON non utilisées restent
        usedDonDeck: updatedUsedDonDeck // Les DON utilisés vont dans DON Épuisé
      }
    };
  }


  /**
   * Passe à la phase suivante
   */
  static nextPhase(gameState: GameState): GameState {
    // Changer de phase
    const nextPhaseState = PhaseService.nextPhase(gameState);
    
    // Exécuter les actions automatiques de la nouvelle phase
    return PhaseService.executePhaseActions(nextPhaseState);
  }

  /**
   * Exécute les actions de la phase actuelle
   */
  static executePhaseActions(gameState: GameState): GameState {
    return PhaseService.executePhaseActions(gameState);
  }

  /**
   * Termine le tour
   */
  static endTurn(gameState: GameState): GameState {
    return PhaseService.endTurn(gameState);
  }

  /**
   * Attaque avec une carte
   */
  static attack(
    gameState: GameState,
    attackerId: string,
    targetId: string,
    playerId: 'player' | 'opponent'
  ): GameState {
    return CombatService.executeAttack(gameState, attackerId, targetId, playerId);
  }

  /**
   * Change la position d'une carte (Active/Rested)
   */
  static toggleCardPosition(
    gameState: GameState,
    playerId: 'player' | 'opponent',
    cardId: string
  ): GameState {
    const player = gameState[playerId];
    
    // Chercher la carte sur le terrain
    const card = player.field.find(c => c.id === cardId);
    if (!card) {
      throw new Error('Carte non trouvée sur le terrain');
    }
    
    // Vérifier que la carte peut changer de position
    if (card.wasPlayedThisTurn && !card.hasRush) {
      throw new Error('Cette carte ne peut pas changer de position ce tour (Summoning Sickness)');
    }
    
    // Changer la position
    const updatedField = player.field.map(c => 
      c.id === cardId ? { ...c, isActive: !c.isActive } : c
    );
    
    return {
      ...gameState,
      [playerId]: {
        ...player,
        field: updatedField
      }
    };
  }

  /**
   * Effectue un mulligan pour un joueur
   */
  static mulligan(gameState: GameState, playerId: 'player' | 'opponent'): GameState {
    const player = gameState[playerId];
    
    // Remettre les cartes de la main dans le deck
    const updatedDeck = [...player.deck, ...player.hand];
    
    // Mélanger le deck
    const shuffledDeck = this.shuffleDeck(updatedDeck);
    
    // Piocher 5 nouvelles cartes
    const newHand = shuffledDeck.slice(0, 5).map(card => ({ ...card, isFaceUp: true }));
    const remainingDeck = shuffledDeck.slice(5).map(card => ({ ...card, isFaceUp: false }));
    
    // Mettre à jour le joueur
    const updatedPlayer: Player = {
      ...player,
      deck: remainingDeck,
      hand: newHand
    };
    
    // Retourner l'état complet mis à jour
    return {
      ...gameState,
      [playerId]: updatedPlayer
    };
  }

  /**
   * Garde la main actuelle (passe à la phase suivante)
   */
  static keepHand(gameState: GameState): GameState {
    return {
      ...gameState,
      hasKeptHand: true,
      currentPhase: 'START',
      // canDrawDon sera true en phase DON, pas en phase START
    };
  }

  /**
   * Mélange un deck de cartes
   */
  private static shuffleDeck(deck: GameCard[]): GameCard[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Vérifie si une action est valide
   */
  static canPerformAction(
    gameState: GameState,
    action: 'playCard' | 'attack' | 'endTurn',
    playerId: 'player' | 'opponent',
    cardId?: string
  ): boolean {
    const player = gameState[playerId];
    
    switch (action) {
      case 'playCard':
        if (!cardId) return false;
        const card = player.hand.find(c => c.id === cardId);
        if (!card || card.type !== 'CHARACTER') return false;
        return player.donField.length >= (card.cost || 0);
        
      case 'attack':
        if (!cardId) return false;
        const attacker = player.field.find(c => c.id === cardId);
        if (!attacker) return false;
        return attacker.isActive && !attacker.hasAttacked && (attacker.canAttack !== false);
        
      case 'endTurn':
        return gameState.currentPlayer === playerId;
        
      default:
        return false;
    }
  }
}
