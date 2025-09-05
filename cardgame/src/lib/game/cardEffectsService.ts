import { GameState, GameCard, CardEffectType, CardEffectTiming } from '@/types/game';
import { CombatService } from './combatService';
import { CounterService } from './counterService';

export interface CardEffect {
  id: string;
  type: CardEffectType;
  timing: CardEffectTiming;
  description: string;
  cost?: number; // Coût en DON pour activer l'effet
  targetType?: 'SELF' | 'OPPONENT' | 'FIELD' | 'LEADER' | 'HAND' | 'DECK';
  execute: (gameState: GameState, sourceCard: GameCard, targetCard?: GameCard, playerId?: 'player' | 'opponent') => GameState;
}

export interface ComboEffect {
  id: string;
  name: string;
  description: string;
  requiredCards: string[]; // IDs des cartes requises
  effect: (gameState: GameState, playerId: 'player' | 'opponent') => GameState;
  bonus?: {
    power?: number;
    lifePoints?: number;
    drawCards?: number;
  };
}

export class CardEffectsService {
  /**
   * Exécute un effet de carte
   */
  static executeEffect(
    gameState: GameState,
    effect: CardEffect,
    sourceCard: GameCard,
    targetCard?: GameCard,
    playerId?: 'player' | 'opponent'
  ): GameState {
    console.log(`✨ Exécution de l'effet: ${effect.description}`);
    
    try {
      // Vérifier le coût si nécessaire
      if (effect.cost && effect.cost > 0) {
        const activePlayer = playerId || gameState.currentPlayer;
        const player = gameState[activePlayer];
        
        if (player.activeDon < effect.cost) {
          throw new Error(`Coût insuffisant: ${effect.cost} DON requis, ${player.activeDon} disponibles`);
        }
        
        // Consommer les DON
        gameState = this.consumeDon(gameState, activePlayer, effect.cost);
      }
      
      // Exécuter l'effet
      const updatedState = effect.execute(gameState, sourceCard, targetCard, playerId);
      
      console.log(`✅ Effet exécuté: ${effect.description}`);
      return updatedState;
      
    } catch (error) {
      console.error(`❌ Erreur lors de l'exécution de l'effet:`, error);
      return gameState;
    }
  }

  /**
   * Consomme des DON pour un joueur
   */
  private static consumeDon(
    gameState: GameState,
    playerId: 'player' | 'opponent',
    amount: number
  ): GameState {
    const player = gameState[playerId];
    const newActiveDon = Math.max(0, player.activeDon - amount);
    
    console.log(`💎 ${playerId} consomme ${amount} DON (${player.activeDon} → ${newActiveDon})`);
    
    return {
      ...gameState,
      [playerId]: {
        ...player,
        activeDon: newActiveDon
      }
    };
  }

  /**
   * Vérifie si une combinaison est possible
   */
  static canExecuteCombo(
    gameState: GameState,
    combo: ComboEffect,
    playerId: 'player' | 'opponent'
  ): boolean {
    const player = gameState[playerId];
    
    // Vérifier que toutes les cartes requises sont présentes
    const hasAllCards = combo.requiredCards.every(cardId => {
      // Chercher dans le terrain
      const fieldCard = player.field.find(card => card.id === cardId);
      if (fieldCard) return true;
      
      // Chercher dans le Leader
      if (player.leader && player.leader.id === cardId) return true;
      
      // Chercher dans la main
      const handCard = player.hand.find(card => card.id === cardId);
      if (handCard) return true;
      
      return false;
    });
    
    return hasAllCards;
  }

  /**
   * Exécute une combinaison de cartes
   */
  static executeCombo(
    gameState: GameState,
    combo: ComboEffect,
    playerId: 'player' | 'opponent'
  ): GameState {
    console.log(`🎯 Exécution de la combinaison: ${combo.name}`);
    
    if (!this.canExecuteCombo(gameState, combo, playerId)) {
      console.log(`❌ Combinaison impossible: ${combo.name}`);
      return gameState;
    }
    
    try {
      // Exécuter l'effet de la combinaison
      let updatedState = combo.effect(gameState, playerId);
      
      // Appliquer les bonus si présents
      if (combo.bonus) {
        updatedState = this.applyComboBonus(updatedState, combo.bonus, playerId);
      }
      
      console.log(`✅ Combinaison exécutée: ${combo.name}`);
      return updatedState;
      
    } catch (error) {
      console.error(`❌ Erreur lors de l'exécution de la combinaison:`, error);
      return gameState;
    }
  }

  /**
   * Applique les bonus d'une combinaison
   */
  private static applyComboBonus(
    gameState: GameState,
    bonus: any,
    playerId: 'player' | 'opponent'
  ): GameState {
    const player = gameState[playerId];
    let updatedState = gameState;
    
    // Bonus de power
    if (bonus.power) {
      updatedState = this.applyPowerBonus(updatedState, bonus.power, playerId);
    }
    
    // Bonus de points de vie
    if (bonus.lifePoints) {
      updatedState = this.applyLifeBonus(updatedState, bonus.lifePoints, playerId);
    }
    
    // Bonus de pioche
    if (bonus.drawCards) {
      updatedState = this.applyDrawBonus(updatedState, bonus.drawCards, playerId);
    }
    
    return updatedState;
  }

  /**
   * Applique un bonus de power
   */
  private static applyPowerBonus(
    gameState: GameState,
    powerBonus: number,
    playerId: 'player' | 'opponent'
  ): GameState {
    const player = gameState[playerId];
    
    // Augmenter le power de toutes les cartes du terrain
    const updatedField = player.field.map(card => ({
      ...card,
      power: card.power + powerBonus
    }));
    
    // Augmenter le power du Leader si présent
    const updatedLeader = player.leader ? {
      ...player.leader,
      power: player.leader.power + powerBonus
    } : null;
    
    console.log(`⚡ ${playerId} reçoit +${powerBonus} power pour toutes ses cartes`);
    
    return {
      ...gameState,
      [playerId]: {
        ...player,
        field: updatedField,
        leader: updatedLeader
      }
    };
  }

  /**
   * Applique un bonus de points de vie
   */
  private static applyLifeBonus(
    gameState: GameState,
    lifeBonus: number,
    playerId: 'player' | 'opponent'
  ): GameState {
    const player = gameState[playerId];
    const newLifePoints = Math.min(10, player.lifePoints + lifeBonus); // Max 10 PV
    
    console.log(`❤️ ${playerId} reçoit +${lifeBonus} points de vie (${player.lifePoints} → ${newLifePoints})`);
    
    return {
      ...gameState,
      [playerId]: {
        ...player,
        lifePoints: newLifePoints
      }
    };
  }

  /**
   * Applique un bonus de pioche
   */
  private static applyDrawBonus(
    gameState: GameState,
    drawBonus: number,
    playerId: 'player' | 'opponent'
  ): GameState {
    const player = gameState[playerId];
    
    if (player.deck.length === 0) {
      console.log(`⚠️ ${playerId} n'a plus de cartes à piocher`);
      return gameState;
    }
    
    // Piocher des cartes
    const cardsToDraw = Math.min(drawBonus, player.deck.length);
    const drawnCards = player.deck.slice(0, cardsToDraw);
    const updatedDeck = player.deck.slice(cardsToDraw);
    const updatedHand = [...player.hand, ...drawnCards];
    
    console.log(`🎴 ${playerId} pioche ${cardsToDraw} carte(s)`);
    
    return {
      ...gameState,
      [playerId]: {
        ...player,
        deck: updatedDeck,
        hand: updatedHand
      }
    };
  }

  /**
   * Vérifie les conditions de victoire avancées
   */
  static checkAdvancedVictoryConditions(gameState: GameState): {
    gameOver: boolean;
    winner?: string;
    reason?: string;
    condition: string;
  } {
    // Condition 1: Points de vie
    if (gameState.player.lifePoints <= 0) {
      return {
        gameOver: true,
        winner: 'opponent',
        reason: 'Le joueur a perdu tous ses points de vie',
        condition: 'LIFE_POINTS'
      };
    }
    
    if (gameState.opponent.lifePoints <= 0) {
      return {
        gameOver: true,
        winner: 'player',
        reason: 'L\'adversaire a perdu tous ses points de vie',
        condition: 'LIFE_POINTS'
      };
    }
    
    // Condition 2: Deck vide
    if (gameState.player.deck.length === 0) {
      return {
        gameOver: true,
        winner: 'opponent',
        reason: 'Le joueur n\'a plus de cartes à piocher',
        condition: 'DECK_EMPTY'
      };
    }
    
    if (gameState.opponent.deck.length === 0) {
      return {
        gameOver: true,
        winner: 'player',
        reason: 'L\'adversaire n\'a plus de cartes à piocher',
        condition: 'DECK_EMPTY'
      };
    }
    
    // Condition 3: Terrain vide (optionnel)
    if (gameState.player.field.length === 0 && gameState.player.leader?.power === 0) {
      return {
        gameOver: true,
        winner: 'opponent',
        reason: 'Le joueur n\'a plus de cartes sur le terrain',
        condition: 'FIELD_EMPTY'
      };
    }
    
    if (gameState.opponent.field.length === 0 && gameState.opponent.leader?.power === 0) {
      return {
        gameOver: true,
        winner: 'player',
        reason: 'L\'adversaire n\'a plus de cartes sur le terrain',
        condition: 'FIELD_EMPTY'
      };
    }
    
    // Condition 4: Main vide (optionnel)
    if (gameState.player.hand.length === 0 && gameState.player.deck.length === 0) {
      return {
        gameOver: true,
        winner: 'opponent',
        reason: 'Le joueur n\'a plus de cartes en main ni en deck',
        condition: 'HAND_EMPTY'
      };
    }
    
    if (gameState.opponent.hand.length === 0 && gameState.opponent.deck.length === 0) {
      return {
        gameOver: true,
        winner: 'player',
        reason: 'L\'adversaire n\'a plus de cartes en main ni en deck',
        condition: 'HAND_EMPTY'
      };
    }
    
    return {
      gameOver: false,
      condition: 'NONE'
    };
  }

  /**
   * Obtient la liste des combinaisons disponibles
   */
  static getAvailableCombos(gameState: GameState, playerId: 'player' | 'opponent'): ComboEffect[] {
    // Combinaisons prédéfinies
    const allCombos: ComboEffect[] = [
      {
        id: 'combo-1',
        name: 'Double Strike',
        description: 'Deux cartes de même couleur donnent +1000 power',
        requiredCards: ['card-1', 'card-2'],
        effect: (state, playerId) => state,
        bonus: { power: 1000 }
      },
      {
        id: 'combo-2',
        name: 'Life Boost',
        description: 'Trois cartes de même type donnent +2 points de vie',
        requiredCards: ['card-1', 'card-2', 'card-3'],
        effect: (state, playerId) => state,
        bonus: { lifePoints: 2 }
      },
      {
        id: 'combo-3',
        name: 'Card Draw',
        description: 'Leader + Character donnent +1 carte',
        requiredCards: ['leader', 'character'],
        effect: (state, playerId) => state,
        bonus: { drawCards: 1 }
      }
    ];
    
    // Filtrer les combinaisons disponibles
    return allCombos.filter(combo => this.canExecuteCombo(gameState, combo, playerId));
  }

  /**
   * Nettoie les effets temporaires
   */
  static clearTemporaryEffects(gameState: GameState): GameState {
    // Réinitialiser les bonus de power temporaires
    const resetCardPower = (card: GameCard) => {
      // Ici on pourrait stocker le power original et le restaurer
      return card;
    };
    
    const updatedPlayerField = gameState.player.field.map(resetCardPower);
    const updatedOpponentField = gameState.opponent.field.map(resetCardPower);
    
    const updatedPlayerLeader = gameState.player.leader ? resetCardPower(gameState.player.leader) : null;
    const updatedOpponentLeader = gameState.opponent.leader ? resetCardPower(gameState.opponent.leader) : null;
    
    return {
      ...gameState,
      player: {
        ...gameState.player,
        field: updatedPlayerField,
        leader: updatedPlayerLeader
      },
      opponent: {
        ...gameState.opponent,
        field: updatedOpponentField,
        leader: updatedOpponentLeader
      }
    };
  }
}
