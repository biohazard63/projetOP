import { GameState, GameCard, BattleAction } from '@/types/game';
import { CounterService } from './counterService';
import { CardEffectsService } from './cardEffectsService';

export class CombatService {
  /**
   * Vérifie si une carte peut attaquer
   */
  static canAttack(
    gameState: GameState,
    attackerId: string,
    targetId: string,
    playerId: 'player' | 'opponent'
  ): boolean {
    const attacker = this.findCardInPlayerField(gameState, attackerId, playerId);
    const target = this.findTargetCard(gameState, targetId, playerId);

    if (!attacker || !target) {
      return false;
    }

    // Vérifier que l'attaquant est en position Active
    if (!attacker.isActive) {
      return false;
    }

    // Vérifier que l'attaquant n'a pas déjà attaqué ce tour
    if (attacker.hasAttacked) {
      return false;
    }

    return true;
  }

  /**
   * Exécute une attaque
   */
  static executeAttack(
    gameState: GameState,
    attackerId: string,
    targetId: string,
    playerId: 'player' | 'opponent'
  ): GameState {
    console.log(`⚔️ Exécution de l'attaque: ${attackerId} → ${targetId}`);

    // Vérifier que l'attaque est valide
    if (!this.canAttack(gameState, attackerId, targetId, playerId)) {
      throw new Error('Attaque invalide');
    }

    const attacker = this.findCardInPlayerField(gameState, attackerId, playerId);
    const target = this.findTargetCard(gameState, targetId, playerId);

    if (!attacker || !target) {
      throw new Error('Carte non trouvée');
    }

    // Créer l'action de combat
    const battleAction: BattleAction = {
      id: `attack_${Date.now()}_${attackerId}`,
      type: 'ATTACK',
      sourceCardId: attackerId,
      targetId: targetId,
      playerId,
      power: attacker.power,
      timestamp: Date.now()
    };

    // Ajouter l'action à la pile de combat
    let updatedState = {
      ...gameState,
      battleStack: [...gameState.battleStack, battleAction]
    };

    // Marquer l'attaquant comme attaquant
    updatedState = this.markCardAsAttacking(updatedState, attackerId, playerId);

    // Vérifier s'il y a des contre-attaques possibles
    const hasCounters = this.checkForCounters(updatedState, battleAction);
    
    if (hasCounters) {
      console.log('🛡️ Des contre-attaques sont possibles, attente de la résolution...');
      return updatedState;
    }

    // Aucun contre, résoudre immédiatement
    console.log('⚔️ Aucun contre, résolution immédiate de l\'attaque');
    return this.resolveCombat(updatedState, battleAction);
  }

  /**
   * Résout le combat après vérification des contre-attaques
   */
  static resolveCombat(
    gameState: GameState,
    attackAction: BattleAction
  ): GameState {
    console.log('⚔️ Résolution du combat...');

    // Trouver l'action d'attaque originale dans la pile actuelle
    const originalAttack = gameState.battleStack.find(
      action => action.id === attackAction.id
    );

    if (!originalAttack) {
      console.log('⚠️ Action d\'attaque non trouvée ou annulée');
      return gameState;
    }

    // Vérifier que c'est bien une BattleAction d'attaque
    if (!('sourceCardId' in originalAttack) || originalAttack.type !== 'ATTACK') {
      console.log('⚠️ Action invalide pour la résolution d\'attaque');
      return gameState;
    }

    // Exécuter l'attaque AVANT de résoudre la pile de combat
    const attacker = this.findCardInPlayerField(
      gameState,
      originalAttack.sourceCardId,
      originalAttack.playerId as 'player' | 'opponent'
    );
    const target = this.findTargetCard(
      gameState,
      originalAttack.targetId!,
      originalAttack.playerId as 'player' | 'opponent'
    );

    if (!attacker || !target) {
      console.log('⚠️ Carte non trouvée lors de la résolution');
      return gameState;
    }

    // Calculer le résultat du combat
    const combatResult = this.calculateCombatResult(attacker, target);
    console.log('⚔️ Résultat du combat:', combatResult.message);

    // Appliquer les résultats
    let updatedState = this.applyCombatResults(gameState, combatResult, attacker.id, target.id);

    // Réinitialiser les états de combat
    updatedState = this.resetCombatStates(updatedState, originalAttack.playerId as 'player' | 'opponent', attacker.id);

    // Maintenant résoudre la pile de combat (contre-attaques) si nécessaire
    updatedState = CounterService.resolveBattleStack(updatedState);

    return updatedState;
  }

  /**
   * Vérifie s'il y a des contre-attaques possibles
   */
  private static checkForCounters(
    gameState: GameState,
    attackAction: BattleAction
  ): boolean {
    const defenderPlayer = attackAction.playerId === 'player' ? 'opponent' : 'player';
    const defender = gameState[defenderPlayer];

    // Vérifier les cartes du terrain
    const fieldCounters = defender.field.some(card => 
      CounterService.canCounter(gameState, card, attackAction)
    );

    // Vérifier le Leader
    const leaderCounter = defender.leader && 
      CounterService.canCounter(gameState, defender.leader, attackAction);

    return fieldCounters || leaderCounter || false;
  }

  /**
   * Marque une carte comme attaquante
   */
  private static markCardAsAttacking(
    gameState: GameState,
    cardId: string,
    playerId: 'player' | 'opponent'
  ): GameState {
    const player = gameState[playerId];

    // Marquer dans le terrain
    const updatedField = player.field.map(card =>
      card.id === cardId ? { ...card, isAttacking: true } : card
    );

    // Marquer dans le Leader
    const updatedLeader = player.leader && player.leader.id === cardId
      ? { ...player.leader, isAttacking: true }
      : player.leader;

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
   * Calcule le résultat du combat
   */
  private static calculateCombatResult(attacker: GameCard, target: GameCard): {
    attackerWins: boolean;
    targetKO: boolean;
    damageToLeader?: number;
    message: string;
  } {
    const attackerPower = attacker.power;
    const targetPower = target.power;

    if (attackerPower > targetPower) {
      // L'attaquant gagne
      if (target.type === 'LEADER') {
        // Attaque du Leader : infliger des dégâts
        return {
          attackerWins: true,
          targetKO: false,
          damageToLeader: 1,
          message: `Victoire ! ${attackerPower} vs ${targetPower} - Le Leader perd 1 point de vie`
        };
      } else {
        // Attaque d'un Character : KO de la cible
        return {
          attackerWins: true,
          targetKO: true,
          message: `Victoire ! ${attackerPower} vs ${targetPower} - La cible est KO`
        };
      }
    } else if (attackerPower === targetPower) {
      // Égalité : l'attaquant gagne (règle One Piece TCG)
      if (target.type === 'LEADER') {
        // Attaque du Leader : infliger des dégâts
        return {
          attackerWins: true,
          targetKO: false,
          damageToLeader: 1,
          message: `Égalité ! ${attackerPower} vs ${targetPower} - L'attaquant gagne, le Leader perd 1 point de vie`
        };
      } else {
        // Attaque d'un Character : KO de la cible
        return {
          attackerWins: true,
          targetKO: true,
          message: `Égalité ! ${attackerPower} vs ${targetPower} - L'attaquant gagne, la cible est KO`
        };
      }
    } else {
      // L'attaquant perd
      if (attacker.type === 'LEADER') {
        // Attaque du Leader : infliger des dégâts
        return {
          attackerWins: false,
          targetKO: false,
          damageToLeader: 1,
          message: `Défaite ! ${attackerPower} vs ${targetPower} - Votre Leader perd 1 point de vie`
        };
      } else {
        // Attaque d'un Character : KO de l'attaquant
        return {
          attackerWins: false,
          targetKO: true,
          message: `Défaite ! ${attackerPower} vs ${targetPower} - Votre attaquant est KO`
        };
      }
    }
  }

  /**
   * Applique les résultats du combat
   */
  static applyCombatResults(
    gameState: GameState,
    combatResult: {
      attackerWins: boolean;
      targetKO: boolean;
      damageToLeader?: number;
      message: string;
    },
    attackerId: string,
    targetId: string
  ): GameState {
    console.log('🔧 Application des résultats du combat...');

    let updatedState = gameState;

    // Appliquer les dégâts au Leader si nécessaire
    if (combatResult.damageToLeader) {
      if (combatResult.attackerWins) {
        // Dégâts au Leader adverse
        const targetPlayer = this.getTargetPlayer(gameState, targetId);
        updatedState = this.applyDamageToLeader(updatedState, targetPlayer, combatResult.damageToLeader);
      } else {
        // Dégâts au Leader de l'attaquant
        const attackerPlayer = this.getAttackerPlayer(gameState, attackerId);
        updatedState = this.applyDamageToLeader(updatedState, attackerPlayer, combatResult.damageToLeader);
      }
    }

    // Appliquer les KO si nécessaire
    if (combatResult.targetKO) {
      if (combatResult.attackerWins) {
        // KO de la cible
        updatedState = this.removeCardFromField(updatedState, targetId);
      } else {
        // KO de l'attaquant
        updatedState = this.removeCardFromField(updatedState, attackerId);
      }
    }

    return updatedState;
  }

  /**
   * Obtient le joueur propriétaire de la cible
   */
  private static getTargetPlayer(gameState: GameState, targetId: string): 'player' | 'opponent' {
    if (gameState.player.leader?.id === targetId || 
        gameState.player.field.some(card => card.id === targetId)) {
      return 'player';
    }
    return 'opponent';
  }

  /**
   * Obtient le joueur propriétaire de l'attaquant
   */
  private static getAttackerPlayer(gameState: GameState, attackerId: string): 'player' | 'opponent' {
    if (gameState.player.leader?.id === attackerId || 
        gameState.player.field.some(card => card.id === attackerId)) {
      return 'player';
    }
    return 'opponent';
  }

  /**
   * Applique des dégâts au Leader
   */
  private static applyDamageToLeader(
    gameState: GameState,
    playerId: 'player' | 'opponent',
    damage: number
  ): GameState {
    const player = gameState[playerId];
    const newLifePoints = Math.max(0, player.lifePoints - damage);

    console.log(`💔 ${playerId} perd ${damage} point(s) de vie (${player.lifePoints} → ${newLifePoints})`);

    return {
      ...gameState,
      [playerId]: {
        ...player,
        lifePoints: newLifePoints
      }
    };
  }

  /**
   * Supprime une carte du terrain
   */
  private static removeCardFromField(
    gameState: GameState,
    cardId: string
  ): GameState {
    // Chercher dans le terrain du joueur
    const playerField = gameState.player.field.filter(card => card.id !== cardId);
    
    // Chercher dans le terrain de l'adversaire
    const opponentField = gameState.opponent.field.filter(card => card.id !== cardId);

    console.log(`🗑️ Carte ${cardId} supprimée du terrain`);

    return {
      ...gameState,
      player: {
        ...gameState.player,
        field: playerField
      },
      opponent: {
        ...gameState.opponent,
        field: opponentField
      }
    };
  }

  /**
   * Vérifie si une carte peut bloquer
   */
  static canBlock(
    gameState: GameState,
    blockerId: string,
    attackActionId: string,
    playerId: 'player' | 'opponent'
  ): boolean {
    const blocker = this.findCardInPlayerField(gameState, blockerId, playerId);
    
    if (!blocker) {
      return false;
    }

    const attackAction = gameState.battleStack.find(
      action => action.id === attackActionId && 'type' in action && action.type === 'ATTACK'
    );

    if (!attackAction || !('sourceCardId' in attackAction)) {
      return false;
    }

    return CounterService.canBlock(gameState, blocker, attackAction);
  }

  /**
   * Exécute un blocage
   */
  static executeBlock(
    gameState: GameState,
    blockerId: string,
    attackActionId: string,
    playerId: 'player' | 'opponent'
  ): GameState {
    console.log(`🛡️ Exécution du blocage: ${blockerId} bloque ${attackActionId}`);

    if (!this.canBlock(gameState, blockerId, attackActionId, playerId)) {
      throw new Error('Blocage invalide');
    }

    // Ajouter l'action de blocage à la pile
    return CounterService.addBlockAction(gameState, {
      blockerCardId: blockerId,
      blockedActionId: attackActionId,
      playerId
    });
  }

  /**
   * Vérifie les conditions de fin de partie
   */
  static checkGameOver(gameState: GameState): { gameOver: boolean; winner?: string; reason?: string } {
    // Utiliser les conditions de victoire avancées
    const advancedCheck = CardEffectsService.checkAdvancedVictoryConditions(gameState);
    
    if (advancedCheck.gameOver) {
      return {
        gameOver: true,
        winner: advancedCheck.winner,
        reason: advancedCheck.reason
      };
    }
    
    return { gameOver: false };
  }

  /**
   * Trouve une carte dans le terrain d'un joueur
   */
  static findCardInPlayerField(
    gameState: GameState,
    cardId: string,
    playerId: 'player' | 'opponent'
  ): GameCard | null {
    const player = gameState[playerId];
    
    // Chercher dans le terrain
    const fieldCard = player.field.find(card => card.id === cardId);
    if (fieldCard) return fieldCard;
    
    // Chercher dans le Leader
    if (player.leader && player.leader.id === cardId) {
      return player.leader;
    }
    
    return null;
  }

  /**
   * Trouve une carte cible (peut être dans n'importe quel champ)
   */
  static findTargetCard(
    gameState: GameState,
    targetId: string,
    playerId: 'player' | 'opponent'
  ): GameCard | null {
    // Chercher dans le terrain du joueur
    const playerCard = gameState.player.field.find(card => card.id === targetId);
    if (playerCard) return playerCard;
    
    // Chercher dans le Leader du joueur
    if (gameState.player.leader && gameState.player.leader.id === targetId) {
      return gameState.player.leader;
    }
    
    // Chercher dans le terrain de l'adversaire
    const opponentCard = gameState.opponent.field.find(card => card.id === targetId);
    if (opponentCard) return opponentCard;
    
    // Chercher dans le Leader de l'adversaire
    if (gameState.opponent.leader && gameState.opponent.leader.id === targetId) {
      return gameState.opponent.leader;
    }
    
    return null;
  }

  /**
   * Réinitialise les états de combat
   */
  static resetCombatStates(
    gameState: GameState,
    playerId: 'player' | 'opponent',
    attackerCardId?: string
  ): GameState {
    const player = gameState[playerId];

    // Réinitialiser les états des cartes du terrain
    const updatedField = player.field.map(card => {
      // Seule la carte qui a attaqué est marquée comme ayant attaqué et mise en position Rested
      if (attackerCardId && card.id === attackerCardId) {
        return {
          ...card,
          hasAttacked: true,
          isAttacking: false,
          isBlocking: false,
          isBlocked: false,
          isActive: false // Mettre la carte en position Rested après l'attaque
        };
      } else {
        // Les autres cartes gardent leur état actuel
        return {
          ...card,
          isAttacking: false,
          isBlocking: false,
          isBlocked: false
        };
      }
    });

    // Réinitialiser le Leader (seulement s'il a attaqué)
    const updatedLeader = player.leader ? {
      ...player.leader,
      hasAttacked: attackerCardId && player.leader.id === attackerCardId ? true : player.leader.hasAttacked,
      isAttacking: false,
      isBlocking: false,
      isBlocked: false
    } : null;

    // Réinitialiser les états de contre
    const finalState = CounterService.clearCounterStates(gameState);

    return {
      ...finalState,
      [playerId]: {
        ...player,
        field: updatedField,
        leader: updatedLeader
      }
    };
  }
}
