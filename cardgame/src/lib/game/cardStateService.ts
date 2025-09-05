import { GameState, GameCard, Player } from '@/types/game';

export class CardStateService {
  /**
   * Change la position d'une carte entre Active et Rested
   */
  static toggleCardPosition(
    gameState: GameState,
    playerId: 'player' | 'opponent',
    cardId: string
  ): GameState {
    const player = gameState[playerId];
    
    // Trouver la carte dans le champ
    const card = player.field.find(c => c.id === cardId);
    let updatedField = player.field;
    
    if (card) {
      // Carte trouvée dans le champ
      const newPosition = !card.isActive;
      updatedField = player.field.map(c => 
        c.id === cardId ? { ...c, isActive: newPosition } : c
      );
    } else if (player.leader?.id === cardId) {
      // Carte trouvée dans le leader
      const updatedLeader = {
        ...player.leader,
        isActive: !player.leader.isActive
      };
      
      return {
        ...gameState,
        [playerId]: {
          ...player,
          leader: updatedLeader
        }
      };
    } else {
      // Carte non trouvée
      throw new Error('Carte non trouvée');
    }

    return {
      ...gameState,
      [playerId]: {
        ...player,
        field: updatedField
      }
    };
  }

  /**
   * Marque une carte comme "jouée ce tour" (pour Summoning Sickness)
   */
  static markCardAsPlayedThisTurn(
    gameState: GameState,
    playerId: 'player' | 'opponent',
    cardId: string
  ): GameState {
    const player = gameState[playerId];
    
    // Trouver la carte dans le champ
    const card = player.field.find(c => c.id === cardId);
    let updatedField = player.field;
    
    if (card) {
      // Carte trouvée dans le champ
      updatedField = player.field.map(c => 
        c.id === cardId ? { ...c, wasPlayedThisTurn: true, canAttack: false } : c
      );
    } else if (player.leader?.id === cardId) {
      // Carte trouvée dans le leader
      const updatedLeader = {
        ...player.leader,
        wasPlayedThisTurn: true,
        canAttack: false
      };
      
      return {
        ...gameState,
        [playerId]: {
          ...player,
          leader: updatedLeader
        }
      };
    } else {
      // Carte non trouvée
      throw new Error('Carte non trouvée');
    }

    return {
      ...gameState,
      [playerId]: {
        ...player,
        field: updatedField
      }
    };
  }

  /**
   * Redresse toutes les cartes d'un joueur au début de son tour (Stand/Refresh)
   */
  static refreshAllCards(
    gameState: GameState,
    playerId: 'player' | 'opponent'
  ): GameState {
    const player = gameState[playerId];
    
    // Redresser le Leader
    const updatedLeader = player.leader ? {
      ...player.leader,
      isActive: true,
      canAttack: true,
      wasPlayedThisTurn: false
    } : null;

    // Redresser les cartes du champ
    const updatedField = player.field.map(card => ({
      ...card,
      isActive: true,
      canAttack: this.canCardAttackAfterRefresh(card),
      wasPlayedThisTurn: false
    }));

    // Redresser les DON du champ
    const updatedDonField = player.donField.map(don => ({
      ...don,
      isActive: true
    }));

    const updatedPlayer: Player = {
      ...player,
      leader: updatedLeader,
      field: updatedField,
      donField: updatedDonField,
      donAddedThisTurn: false // Réinitialiser le compteur de DON ajoutés ce tour
    };

    return {
      ...gameState,
      [playerId]: updatedPlayer,
      canDrawDon: true // Le joueur peut maintenant piocher des DON
    };
  }

  /**
   * Vérifie si une carte peut attaquer après le refresh
   */
  private static canCardAttackAfterRefresh(card: GameCard): boolean {
    // TEMPORAIRE: Toutes les cartes peuvent attaquer pour tester
    return true;
    
    // Le Leader peut toujours attaquer
    if (card.type === 'LEADER') {
      return true;
    }

    // Les cartes avec Rush peuvent attaquer immédiatement
    if (card.hasRush) {
      return true;
    }

    // Les autres cartes ne peuvent attaquer que si elles n'ont pas été jouées ce tour
    return !card.wasPlayedThisTurn;
  }

  /**
   * Vérifie si une carte peut être utilisée pour une action spécifique
   */
  static canCardBeUsedForAction(
    card: GameCard,
    action: 'attack' | 'block' | 'activate' | 'attach'
  ): boolean {
    switch (action) {
      case 'attack':
        return this.canCardAttack(card, true);
      
      case 'block':
        // Seules les cartes avec Blocker peuvent bloquer
        return Boolean(card.hasBlocker && card.isActive);
      
      case 'activate':
        // Seules les cartes actives peuvent être activées
        return Boolean(card.isActive);
      
      case 'attach':
        // Seules les cartes actives peuvent recevoir des attachements
        return Boolean(card.isActive);
      
      default:
        return false;
    }
  }

  /**
   * Vérifie si une carte peut attaquer (règles complètes)
   */
  static canCardAttack(card: GameCard, isCurrentPlayer: boolean): boolean {
    // Le Leader peut toujours attaquer
    if (card.type === 'LEADER') {
      return true;
    }

    // Les cartes avec Rush peuvent attaquer immédiatement
    if (card.hasRush) {
      return true;
    }

    // Les cartes doivent être en position Active pour attaquer
    if (!card.isActive) {
      return false;
    }

    // Les autres cartes ne peuvent attaquer que si elles n'ont pas été jouées ce tour
    return !card.wasPlayedThisTurn;
  }

  /**
   * Change la position de toutes les cartes d'un joueur
   */
  static changeAllCardsPosition(
    gameState: GameState,
    playerId: 'player' | 'opponent',
    newPosition: boolean
  ): GameState {
    const player = gameState[playerId];
    
    // Changer la position du Leader
    const updatedLeader = player.leader ? {
      ...player.leader,
      isActive: newPosition
    } : null;

    // Changer la position des cartes du champ
    const updatedField = player.field.map(card => ({
      ...card,
      isActive: newPosition
    }));

    // Changer la position des DON du champ
    const updatedDonField = player.donField.map(don => ({
      ...don,
      isActive: newPosition
    }));

    const updatedPlayer: Player = {
      ...player,
      leader: updatedLeader,
      field: updatedField,
      donField: updatedDonField
    };

    return {
      ...gameState,
      [playerId]: updatedPlayer
    };
  }

  /**
   * Vérifie l'état général des cartes d'un joueur
   */
  static getPlayerCardsStatus(player: Player) {
    const activeCards = player.field.filter(card => card.isActive).length;
    const restedCards = player.field.filter(card => !card.isActive).length;
    const canAttackCards = player.field.filter(card => this.canCardAttack(card, true)).length;
    const summoningSickCards = player.field.filter(card => card.wasPlayedThisTurn).length;

    return {
      totalCards: player.field.length,
      activeCards,
      restedCards,
      canAttackCards,
      summoningSickCards,
      leaderActive: player.leader?.isActive || false,
      donActive: player.donField.filter(don => don.isActive).length
    };
  }
}
