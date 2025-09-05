import { GameState, GameCard, Player, DonAttachment, DonState } from '@/types/game';

export class DonService {
  /**
   * Active 2 DON du deck DON vers le champ DON (règle : 2 DON par tour à partir du tour 2)
   */
  static activateDon(gameState: GameState, playerId: 'player' | 'opponent'): GameState {
    const player = gameState[playerId];
    
    console.log(`🔍 DEBUG ACTIVATE DON: Joueur: ${playerId}`);
    console.log(`🔍 DEBUG ACTIVATE DON: Taille du deck DON avant: ${player.donDeck.length}`);
    console.log(`🔍 DEBUG ACTIVATE DON: Taille du champ DON avant: ${player.donField.length}`);
    console.log(`🔍 DEBUG ACTIVATE DON: canDrawDon: ${gameState.canDrawDon}`);
    
    // Vérifier si le joueur peut piocher des DON
    if (!this.canDrawDon(gameState, playerId)) {
      console.log('❌ Impossible de piocher des DON');
      return gameState;
    }

    // Piocher 2 DON du deck DON
    const donToActivate = player.donDeck.slice(0, 2);
    const remainingDonDeck = player.donDeck.slice(2);

    console.log(`💎 Activation de ${donToActivate.length} cartes DON`);
    console.log(`🔍 DEBUG ACTIVATE DON: Nouvelles tailles - Deck DON: ${remainingDonDeck.length}, Champ DON: ${player.donField.length + donToActivate.length}`);

    // Mettre à jour l'état du joueur
    const updatedPlayer: Player = {
      ...player,
      donDeck: remainingDonDeck,
      donField: [...player.donField, ...donToActivate],
      donAddedThisTurn: true // Marquer que des DON ont été ajoutés ce tour
    };

    const newGameState = {
      ...gameState,
      [playerId]: updatedPlayer,
      canDrawDon: false // Le joueur ne peut plus piocher de DON ce tour
    };

    console.log(`✅ DON activés avec succès`);
    console.log(`🔍 DEBUG ACTIVATE DON: État final - Deck DON: ${newGameState[playerId].donDeck.length}, Champ DON: ${newGameState[playerId].donField.length}`);

    return newGameState;
  }

  /**
   * Vérifie si un joueur peut piocher des DON
   */
  static canDrawDon(gameState: GameState, playerId: 'player' | 'opponent'): boolean {
    const player = gameState[playerId];
    
    // Le premier joueur du premier tour ne pioche pas de DON
    if (gameState.isFirstTurn && gameState.currentPlayer === playerId && gameState.turnNumber === 1) {
      return false;
    }
    
    // Vérifier si le joueur a déjà pioché des DON ce tour
    if (!gameState.canDrawDon) {
      return false;
    }
    
    // Vérifier s'il y a des DON dans le deck DON
    return player.donDeck.length >= 2;
  }

  /**
   * Attache un DON à une carte (Leader ou Character)
   */
  static attachDon(
    gameState: GameState, 
    playerId: 'player' | 'opponent', 
    donId: string, 
    targetCardId: string
  ): GameState {
    const player = gameState[playerId];
    
    // Vérifier que le DON est disponible dans le champ DON
    const donCard = player.donField.find(don => don.id === donId);
    if (!donCard) {
      throw new Error('DON non trouvé dans le champ DON');
    }

    // Vérifier que la cible est valide (Leader ou Character)
    const targetCard = this.findCardInPlayerField(player, targetCardId);
    if (!targetCard || (targetCard.type !== 'LEADER' && targetCard.type !== 'CHARACTER')) {
      throw new Error('Impossible d\'attacher un DON à cette carte');
    }

    // Créer l'attachement
    const attachment: DonAttachment = {
      donId,
      attachedTo: targetCardId,
      state: 'ATTACHED'
    };

    // Mettre à jour l'état du joueur
    const updatedPlayer: Player = {
      ...player,
      donField: player.donField.filter(don => don.id !== donId),
      donAttachments: [...player.donAttachments, attachment]
    };

    // Mettre à jour la carte cible
    const updatedField = this.updateCardInField(updatedPlayer, targetCardId, {
      donAttachments: [...(targetCard.donAttachments || []), attachment],
      attachedDons: (targetCard.attachedDons || 0) + 1
    });

    return {
      ...gameState,
      [playerId]: {
        ...updatedPlayer,
        field: updatedField
      }
    };
  }

  /**
   * Détache un DON d'une carte
   */
  static detachDon(
    gameState: GameState, 
    playerId: 'player' | 'opponent', 
    donId: string
  ): GameState {
    const player = gameState[playerId];
    
    // Trouver l'attachement
    const attachment = player.donAttachments.find(att => att.donId === donId);
    if (!attachment) {
      throw new Error('Attachement DON non trouvé');
    }

    // Trouver la carte DON
    const donCard = this.findDonCardById(player, donId);
    if (!donCard) {
      throw new Error('Carte DON non trouvée');
    }

    // Retirer l'attachement
    const updatedAttachments = player.donAttachments.filter(att => att.donId !== donId);
    
    // Mettre à jour la carte cible
    const targetCard = this.findCardInPlayerField(player, attachment.attachedTo);
    if (targetCard) {
      const updatedField = this.updateCardInField(player, attachment.attachedTo, {
        donAttachments: targetCard.donAttachments?.filter(att => att.donId !== donId) || [],
        attachedDons: Math.max(0, (targetCard.attachedDons || 0) - 1)
      });

      // Mettre à jour l'état du joueur
      const updatedPlayer: Player = {
        ...player,
        donAttachments: updatedAttachments,
        field: updatedField
      };

      return {
        ...gameState,
        [playerId]: updatedPlayer
      };
    }

    return gameState;
  }

  /**
   * Paiement d'un coût avec des DON
   */
  static payCost(
    gameState: GameState, 
    playerId: 'player' | 'opponent', 
    cost: number
  ): GameState {
    const player = gameState[playerId];
    
    // Vérifier que le joueur a assez de DON
    if (player.activeDon < cost) {
      throw new Error(`Pas assez de DON pour payer le coût de ${cost}`);
    }

    // Utiliser les DON du champ DON
    const donToUse = player.donField.slice(0, cost);
    const remainingDonField = player.donField.slice(cost);

    // Mettre à jour l'état du joueur
    const updatedPlayer: Player = {
      ...player,
      donField: remainingDonField,
      activeDon: player.activeDon - cost
    };

    return {
      ...gameState,
      [playerId]: updatedPlayer
    };
  }

  /**
   * Calcule le power total d'une carte (base + DON attachés)
   */
  static calculateTotalPower(card: GameCard): number {
    const basePower = card.power || 0;
    const donBonus = (card.attachedDons || 0) * 1000; // Chaque DON ajoute 1000 de power
    return basePower + donBonus;
  }

  /**
   * Vérifie si une carte peut attaquer (pas de Summoning Sickness)
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

    // Les autres cartes ne peuvent attaquer que si elles n'ont pas été jouées ce tour
    return !card.wasPlayedThisTurn;
  }

  /**
   * Met à jour l'état d'une carte dans le champ du joueur
   */
  private static updateCardInField(player: Player, cardId: string, updates: Partial<GameCard>): GameCard[] {
    return player.field.map(card => 
      card.id === cardId ? { ...card, ...updates } : card
    );
  }

  /**
   * Trouve une carte dans le champ du joueur
   */
  private static findCardInPlayerField(player: Player, cardId: string): GameCard | null {
    // Chercher dans le champ
    const card = player.field.find(c => c.id === cardId);
    if (card) return card;

    // Chercher dans le Leader
    if (player.leader?.id === cardId) return player.leader;

    return null;
  }

  /**
   * Trouve une carte DON par son ID
   */
  private static findDonCardById(player: Player, donId: string): GameCard | null {
    // Chercher dans le champ DON
    const donCard = player.donField.find(don => don.id === donId);
    if (donCard) return donCard;

    // Chercher dans les attachements
    const attachment = player.donAttachments.find(att => att.donId === donId);
    if (attachment) {
      // La carte DON est attachée, on peut la récupérer depuis le deck DON
      return player.donDeck.find(don => don.id === donId) || null;
    }

    return null;
  }

  /**
   * Redresse toutes les cartes d'un joueur au début de son tour
   */
  static refreshAllCards(gameState: GameState, playerId: 'player' | 'opponent'): GameState {
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
      canAttack: this.canCardAttack(card, true),
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
}
