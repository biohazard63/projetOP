import { GameState, GameCard, BattleAction, GamePhase } from '@/types/game';
import { CombatService } from './combatService';

export interface CounterEvent {
  id: string;
  type: 'COUNTER' | 'BLOCK' | 'TRIGGER';
  sourceCardId: string;
  targetActionId?: string; // ID de l'action à contrer
  playerId: 'player' | 'opponent';
  priority: number; // Priorité de résolution (plus élevé = résolu en premier)
  timestamp: number;
  description: string;
  execute: (gameState: GameState) => GameState;
}

export interface BlockAction {
  id: string;
  blockerCardId: string;
  blockedActionId: string;
  playerId: 'player' | 'opponent';
  timestamp: number;
}

export class CounterService {
  /**
   * Ajoute un événement de contre à la pile de combat
   */
  static addCounterEvent(
    gameState: GameState,
    counterEvent: Omit<CounterEvent, 'id' | 'timestamp'>
  ): GameState {
    const newCounterEvent: CounterEvent = {
      ...counterEvent,
      id: `counter_${Date.now()}_${Math.random()}`,
      timestamp: Date.now()
    };

    const updatedBattleStack = [...gameState.battleStack, newCounterEvent];
    
    console.log(`🛡️ Événement de contre ajouté: ${newCounterEvent.description}`);
    
    return {
      ...gameState,
      battleStack: updatedBattleStack
    };
  }

  /**
   * Ajoute une action de blocage
   */
  static addBlockAction(
    gameState: GameState,
    blockAction: Omit<BlockAction, 'id' | 'timestamp'>
  ): GameState {
    const newBlockAction: BlockAction = {
      ...blockAction,
      id: `block_${Date.now()}_${Math.random()}`,
      timestamp: Date.now()
    };

    const updatedBattleStack = [...gameState.battleStack, newBlockAction];
    
    console.log(`🛡️ Action de blocage ajoutée: ${newBlockAction.blockerCardId}`);
    
    return {
      ...gameState,
      battleStack: updatedBattleStack
    };
  }

  /**
   * Vérifie si une carte peut contrer une action
   */
  static canCounter(
    gameState: GameState,
    card: GameCard,
    targetAction: BattleAction
  ): boolean {
    // Vérifier que la carte est en position Active
    if (!card.isActive) {
      return false;
    }

    // Vérifier que la carte n'a pas déjà été utilisée ce tour
    if (card.hasAttacked || card.isBlocking) {
      return false;
    }

    // Vérifier que la carte a des capacités de contre
    if (!card.hasCounter) {
      return false;
    }

    // Vérifier que la carte appartient au joueur actif
    const isPlayerCard = gameState.player.field.some(c => c.id === card.id) ||
                        gameState.player.leader?.id === card.id;
    const isOpponentCard = gameState.opponent.field.some(c => c.id === card.id) ||
                          gameState.opponent.leader?.id === card.id;

    if (gameState.currentPlayer === 'player' && !isPlayerCard) {
      return false;
    }
    if (gameState.currentPlayer === 'opponent' && !isOpponentCard) {
      return false;
    }

    return true;
  }

  /**
   * Vérifie si une carte peut bloquer une attaque
   */
  static canBlock(
    gameState: GameState,
    blockerCard: GameCard,
    attackAction: BattleAction
  ): boolean {
    // Vérifier que la carte est en position Active
    if (!blockerCard.isActive) {
      return false;
    }

    // Vérifier que la carte n'a pas déjà bloqué ce tour
    if (blockerCard.isBlocking) {
      return false;
    }

    // Vérifier que la carte a la capacité de bloquer
    if (!blockerCard.hasBlocker) {
      return false;
    }

    // Vérifier que la carte appartient au joueur défenseur
    const isDefenderCard = gameState.player.field.some(c => c.id === blockerCard.id) ||
                          gameState.player.leader?.id === blockerCard.id;
    const isAttackerCard = gameState.opponent.field.some(c => c.id === blockerCard.id) ||
                          gameState.opponent.leader?.id === blockerCard.id;

    // Le défenseur est le joueur qui n'est pas l'attaquant
    const attackerPlayer = attackAction.playerId;
    const defenderPlayer = attackerPlayer === 'player' ? 'opponent' : 'player';

    if (defenderPlayer === 'player' && !isDefenderCard) {
      return false;
    }
    if (defenderPlayer === 'opponent' && !isAttackerCard) {
      return false;
    }

    return true;
  }

  /**
   * Résout la pile de combat en respectant les priorités
   */
  static resolveBattleStack(gameState: GameState): GameState {
    if (gameState.battleStack.length === 0) {
      return gameState;
    }

    console.log('⚔️ Résolution de la pile de combat...');
    console.log(`📚 ${gameState.battleStack.length} actions à résoudre`);

    // Trier par priorité (plus élevé = résolu en premier)
    const sortedStack = [...gameState.battleStack].sort((a, b) => {
      if ('priority' in a && 'priority' in b) {
        return b.priority - a.priority;
      }
      // Les actions sans priorité sont résolues en dernier
      return 1;
    });

    let currentState = gameState;

    // Résoudre chaque action dans l'ordre
    for (const action of sortedStack) {
      try {
        if ('execute' in action) {
          // C'est un CounterEvent
          console.log(`🛡️ Exécution du contre: ${action.description}`);
          currentState = action.execute(currentState);
        } else if ('blockerCardId' in action) {
          // C'est un BlockAction
          console.log(`🛡️ Exécution du blocage: ${action.blockerCardId}`);
          currentState = this.executeBlockAction(currentState, action);
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la résolution de l'action:`, error);
      }
    }

    // Vider la pile de combat
    const finalState = {
      ...currentState,
      battleStack: []
    };

    console.log('✅ Pile de combat résolue !');
    return finalState;
  }

  /**
   * Exécute une action de blocage
   */
  private static executeBlockAction(
    gameState: GameState,
    blockAction: BlockAction
  ): GameState {
    // Marquer la carte comme bloquante
    const updatedState = this.markCardAsBlocking(gameState, blockAction.blockerCardId);
    
    // Trouver l'action d'attaque bloquée
    const attackAction = gameState.battleStack.find(
      action => 'sourceCardId' in action && action.id === blockAction.blockedActionId
    );

    if (attackAction && 'sourceCardId' in attackAction) {
      // Marquer l'attaquant comme bloqué
      return this.markCardAsBlocked(updatedState, attackAction.sourceCardId);
    }

    return updatedState;
  }

  /**
   * Marque une carte comme bloquante
   */
  private static markCardAsBlocking(
    gameState: GameState,
    cardId: string
  ): GameState {
    // Chercher dans le terrain du joueur
    const playerField = gameState.player.field.map(card =>
      card.id === cardId ? { ...card, isBlocking: true } : card
    );

    // Chercher dans le Leader du joueur
    const playerLeader = gameState.player.leader && gameState.player.leader.id === cardId
      ? { ...gameState.player.leader, isBlocking: true }
      : gameState.player.leader;

    // Chercher dans le terrain de l'adversaire
    const opponentField = gameState.opponent.field.map(card =>
      card.id === cardId ? { ...card, isBlocking: true } : card
    );

    // Chercher dans le Leader de l'adversaire
    const opponentLeader = gameState.opponent.leader && gameState.opponent.leader.id === cardId
      ? { ...gameState.opponent.leader, isBlocking: true }
      : gameState.opponent.leader;

    return {
      ...gameState,
      player: {
        ...gameState.player,
        field: playerField,
        leader: playerLeader
      },
      opponent: {
        ...gameState.opponent,
        field: opponentField,
        leader: opponentLeader
      }
    };
  }

  /**
   * Marque une carte comme bloquée
   */
  private static markCardAsBlocked(
    gameState: GameState,
    cardId: string
  ): GameState {
    // Chercher dans le terrain du joueur
    const playerField = gameState.player.field.map(card =>
      card.id === cardId ? { ...card, isBlocked: true } : card
    );

    // Chercher dans le Leader du joueur
    const playerLeader = gameState.player.leader && gameState.player.leader.id === cardId
      ? { ...gameState.player.leader, isBlocked: true }
      : gameState.player.leader;

    // Chercher dans le terrain de l'adversaire
    const opponentField = gameState.opponent.field.map(card =>
      card.id === cardId ? { ...card, isBlocked: true } : card
    );

    // Chercher dans le Leader de l'adversaire
    const opponentLeader = gameState.opponent.leader && gameState.opponent.leader.id === cardId
      ? { ...gameState.opponent.leader, isBlocked: true }
      : gameState.opponent.leader;

    return {
      ...gameState,
      player: {
        ...gameState.player,
        field: playerField,
        leader: playerLeader
      },
      opponent: {
        ...gameState.opponent,
        field: opponentField,
        leader: opponentLeader
      }
    };
  }

  /**
   * Vérifie si une action peut être contrecarrée
   */
  static canBeCountered(
    gameState: GameState,
    action: BattleAction
  ): boolean {
    // Seules les attaques peuvent être contrecarrées pour l'instant
    return action.type === 'ATTACK';
  }

  /**
   * Obtient la priorité d'une carte pour les contre-attaques
   */
  static getCardPriority(card: GameCard): number {
    let priority = 0;

    // Priorité de base selon le type de carte
    if (card.type === 'LEADER') {
      priority += 100;
    } else if (card.type === 'CHARACTER') {
      priority += 50;
    }

    // Bonus pour les capacités spéciales
    if (card.hasCounter) {
      priority += 25;
    }
    if (card.hasBlocker) {
      priority += 20;
    }
    if (card.hasTrigger) {
      priority += 15;
    }

    return priority;
  }

  /**
   * Nettoie les états de contre et de blocage
   */
  static clearCounterStates(gameState: GameState): GameState {
    const clearCardStates = (cards: GameCard[]) =>
      cards.map(card => ({
        ...card,
        isBlocking: false,
        isBlocked: false
      }));

    const clearLeader = (leader: GameCard | null) =>
      leader ? {
        ...leader,
        isBlocking: false,
        isBlocked: false
      } : null;

    return {
      ...gameState,
      player: {
        ...gameState.player,
        field: clearCardStates(gameState.player.field),
        leader: clearLeader(gameState.player.leader)
      },
      opponent: {
        ...gameState.opponent,
        field: clearCardStates(gameState.opponent.field),
        leader: clearLeader(gameState.opponent.leader)
      },
      battleStack: []
    };
  }
}
