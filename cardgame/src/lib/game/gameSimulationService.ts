import { GameState, GameCard } from '@/types/game';
import { PhaseService } from './phaseService';
import { CombatService } from './combatService';
import { CardEffectsService } from './cardEffectsService';
import { StrategyService } from './strategyService';
import { DonService } from './donService';
import { CardStateService } from './cardStateService';

export interface SimulationStep {
  turn: number;
  player: 'player' | 'opponent';
  phase: string;
  action: string;
  description: string;
  gameState: GameState;
}

export interface SimulationResult {
  steps: SimulationStep[];
  winner: 'player' | 'opponent';
  totalTurns: number;
  finalGameState: GameState;
}

export class GameSimulationService {
  /**
   * Simule une partie complète jusqu'à la victoire du premier joueur
   */
  static simulateFullGame(
    initialGameState: GameState,
    logCallback: (message: string) => void
  ): SimulationResult {
    logCallback('🎮 DÉBUT DE LA SIMULATION DE PARTIE COMPLÈTE');
    logCallback('='.repeat(50));
    
    const steps: SimulationStep[] = [];
    let currentGameState = { ...initialGameState };
    let turnNumber = 1;
    const maxTurns = 20; // Limite de sécurité
    
    try {
      // Phase de configuration
      logCallback('📋 PHASE DE CONFIGURATION');
      currentGameState = this.executeSetupPhase(currentGameState, logCallback);
      steps.push({
        turn: 0,
        player: 'player' as const,
        phase: 'SETUP',
        action: 'Configuration',
        description: 'Configuration initiale du jeu',
        gameState: { ...currentGameState }
      });
      
      // Boucle principale de la partie
      while (turnNumber <= maxTurns) {
        logCallback(`🔄 TOUR ${turnNumber} - DÉBUT`);
        logCallback('-'.repeat(30));
        
        // Tour du joueur
        logCallback(`👤 TOUR DU JOUEUR (${turnNumber})`);
        currentGameState = this.executePlayerTurn(currentGameState, turnNumber, logCallback);
              steps.push({
        turn: turnNumber,
        player: 'player' as const,
        phase: 'COMPLETE_TURN',
        action: 'Tour complet',
        description: `Tour complet du joueur au tour ${turnNumber}`,
        gameState: { ...currentGameState }
      });
        
        // Vérifier la victoire
        const gameOverCheck = CombatService.checkGameOver(currentGameState);
        if (gameOverCheck.gameOver) {
          logCallback(`🏆 FIN DE PARTIE ! Vainqueur: ${gameOverCheck.winner}`);
          logCallback(`📝 Raison: ${gameOverCheck.reason}`);
          break;
        }
        
        // Tour de l'adversaire
        logCallback(`🤖 TOUR DE L'ADVERSAIRE (${turnNumber})`);
        currentGameState = this.executeOpponentTurn(currentGameState, turnNumber, logCallback);
              steps.push({
        turn: turnNumber,
        player: 'opponent' as const,
        phase: 'COMPLETE_TURN',
        action: 'Tour complet',
        description: `Tour complet de l'adversaire au tour ${turnNumber}`,
        gameState: { ...currentGameState }
      });
        
        // Vérifier la victoire
        const gameOverCheck2 = CombatService.checkGameOver(currentGameState);
        if (gameOverCheck2.gameOver) {
          logCallback(`🏆 FIN DE PARTIE ! Vainqueur: ${gameOverCheck2.winner}`);
          logCallback(`📝 Raison: ${gameOverCheck2.reason}`);
          break;
        }
        
        turnNumber++;
        logCallback(`✅ TOUR ${turnNumber - 1} TERMINÉ`);
        logCallback('='.repeat(30));
      }
      
      if (turnNumber > maxTurns) {
        logCallback(`⚠️ LIMITE DE TOURS ATTEINTE (${maxTurns})`);
      }
      
      // Déterminer le vainqueur final
      const finalGameOverCheck = CombatService.checkGameOver(currentGameState);
      const winner = finalGameOverCheck.gameOver ? finalGameOverCheck.winner! : 'player';
      
      logCallback('🎯 RÉSULTAT FINAL DE LA SIMULATION');
      logCallback(`🏆 Vainqueur: ${winner}`);
      logCallback(`🔄 Total des tours: ${turnNumber - 1}`);
      logCallback('='.repeat(50));
      
      return {
        steps,
        winner: winner as 'player' | 'opponent',
        totalTurns: turnNumber - 1,
        finalGameState: currentGameState
      };
      
    } catch (error) {
      logCallback(`❌ ERREUR LORS DE LA SIMULATION: ${error}`);
      throw error;
    }
  }
  
  /**
   * Exécute la phase de configuration
   */
  private static executeSetupPhase(gameState: GameState, logCallback: (message: string) => void): GameState {
    logCallback('🎴 Configuration des mains initiales...');
    
    // Afficher l'état initial des DON
    logCallback(`    🔍 DON initiaux - Joueur: ${gameState.player.donDeck.length} DON dans le deck, 0 dans le champ`);
    logCallback(`    🔍 DON initiaux - Adversaire: ${gameState.opponent.donDeck.length} DON dans le deck, 0 dans le champ`);
    logCallback(`    🔍 canDrawDon initial: ${gameState.canDrawDon}`);
    
    // Simuler la garde de la main
    const updatedState = {
      ...gameState,
      hasKeptHand: true,
      setupPhase: 'COMPLETE' as const
    };
    
    logCallback('✅ Configuration terminée');
    return updatedState;
  }
  
  /**
   * Exécute le tour complet du joueur
   */
  private static executePlayerTurn(
    gameState: GameState,
    turnNumber: number,
    logCallback: (message: string) => void
  ): GameState {
    let currentState = { ...gameState };
    
    // Phase START
    logCallback('  📍 Phase START');
    
    // Phase DRAW
    logCallback('  📍 Phase DRAW');
    currentState = PhaseService.nextPhase(currentState);
    currentState = PhaseService.executePhaseActions(currentState);
    logCallback(`    📚 Pioche 1 carte (Main: ${currentState.player.hand.length} cartes)`);
    
    // Phase DON
    logCallback('  📍 Phase DON');
    currentState = PhaseService.nextPhase(currentState);
    
    if (currentState.canDrawDon) {
      currentState = DonService.activateDon(currentState, 'player');
      logCallback(`    💎 Pioche 2 DON (Champ: ${currentState.player.donField.length} DON)`);
    }
    
    // Phase MAIN
    logCallback('  📍 Phase MAIN');
    currentState = PhaseService.nextPhase(currentState);
    
    // Jouer des cartes si possible
    if (currentState.player.hand.length > 0 && currentState.player.donField.length >= 1) {
      const playableCard = currentState.player.hand.find(card => 
        card.type === 'CHARACTER' && card.cost <= currentState.player.donField.length
      );
      
      if (playableCard) {
        logCallback(`    🎴 Joue ${playableCard.name} (${playableCard.cost} DON)`);
        currentState = this.playCardToField(currentState, playableCard, 'player');
      }
    }
    
    // Phase BATTLE
    logCallback('  📍 Phase BATTLE');
    currentState = PhaseService.nextPhase(currentState);
    
    // Attaquer si possible
    if (currentState.player.field.length > 0) {
      const attacker = currentState.player.field[0];
      if (attacker.isActive && !attacker.hasAttacked) {
        logCallback(`    ⚔️ ${attacker.name} attaque`);
        currentState = this.executeAttack(currentState, attacker, 'player', logCallback);
      }
    }
    
    // Le Leader peut aussi attaquer
    if (currentState.player.leader && !currentState.player.leader.hasAttacked) {
      logCallback(`    ⚔️ ${currentState.player.leader.name} attaque`);
      currentState = this.executeLeaderAttack(currentState, currentState.player.leader, 'player', logCallback);
    }
    
    // Phase END
    logCallback('  📍 Phase END');
    currentState = PhaseService.nextPhase(currentState);
    currentState = PhaseService.executePhaseActions(currentState);
    
    // Fin du tour
    logCallback('  🔄 Fin du tour');
    currentState = PhaseService.endTurn(currentState, 'opponent');
    
    return currentState;
  }
  
  /**
   * Exécute le tour complet de l'adversaire
   */
  private static executeOpponentTurn(
    gameState: GameState,
    turnNumber: number,
    logCallback: (message: string) => void
  ): GameState {
    let currentState = { ...gameState };
    
    // Phase START
    logCallback('  📍 Phase START');
    
    // Phase DRAW
    logCallback('  📍 Phase DRAW');
    currentState = PhaseService.nextPhase(currentState);
    currentState = PhaseService.executePhaseActions(currentState);
    logCallback(`    📚 Pioche 1 carte (Main: ${currentState.opponent.hand.length} cartes)`);
    
    // Phase DON
    logCallback('  📍 Phase DON');
    currentState = PhaseService.nextPhase(currentState);
    
    if (currentState.canDrawDon) {
      currentState = DonService.activateDon(currentState, 'opponent');
      logCallback(`    💎 Pioche 2 DON (Champ: ${currentState.opponent.donField.length} DON)`);
    }
    
    // Phase MAIN
    logCallback('  📍 Phase MAIN');
    currentState = PhaseService.nextPhase(currentState);
    
    // Jouer des cartes si possible
    if (currentState.opponent.hand.length > 0 && currentState.opponent.donField.length >= 1) {
      const playableCard = currentState.opponent.hand.find(card => 
        card.type === 'CHARACTER' && card.cost <= currentState.opponent.donField.length
      );
      
      if (playableCard) {
        logCallback(`    🎴 Joue ${playableCard.name} (${playableCard.cost} DON)`);
        currentState = this.playCardToField(currentState, playableCard, 'opponent');
      }
    }
    
    // Phase BATTLE
    logCallback('  📍 Phase BATTLE');
    currentState = PhaseService.nextPhase(currentState);
    
    // Attaquer si possible
    if (currentState.opponent.field.length > 0 && turnNumber > 2) {
      const attacker = currentState.opponent.field[0];
      if (attacker.isActive && !attacker.hasAttacked) {
        logCallback(`    ⚔️ ${attacker.name} attaque`);
        currentState = this.executeAttack(currentState, attacker, 'opponent', logCallback);
      }
    }
    
    // Le Leader peut aussi attaquer
    if (currentState.opponent.leader && !currentState.opponent.leader.hasAttacked) {
      logCallback(`    ⚔️ ${currentState.opponent.leader.name} attaque`);
      currentState = this.executeLeaderAttack(currentState, currentState.opponent.leader, 'opponent', logCallback);
    }
    
    // Phase END
    logCallback('  📍 Phase END');
    currentState = PhaseService.nextPhase(currentState);
    currentState = PhaseService.executePhaseActions(currentState);
    
    // Fin du tour
    logCallback('  🔄 Fin du tour');
    currentState = PhaseService.endTurn(currentState);
    
    return currentState;
  }
  
  /**
   * Joue une carte sur le terrain
   */
  private static playCardToField(
    gameState: GameState,
    card: GameCard,
    playerId: 'player' | 'opponent'
  ): GameState {
    const player = gameState[playerId];
    
    // Retirer la carte de la main
    const updatedHand = player.hand.filter(c => c.id !== card.id);
    
    // Ajouter la carte au terrain
    const updatedField = [...player.field, {
      ...card,
      isActive: false, // Position Rested
      wasPlayedThisTurn: true,
      canAttack: false // Summoning Sickness
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
   * Exécute une attaque
   */
  private static executeAttack(
    gameState: GameState,
    attacker: GameCard,
    playerId: 'player' | 'opponent',
    logCallback: (message: string) => void
  ): GameState {
    try {
      const opponentId = playerId === 'player' ? 'opponent' : 'player';
      const opponent = gameState[opponentId];
      
      // Choisir une cible (priorité au Leader)
      let target: GameCard;
      let targetType: string;
      
      if (opponent.leader && attacker.power >= opponent.leader.power) {
        // Attaquer le Leader si on peut le vaincre
        target = opponent.leader;
        targetType = 'Leader';
        logCallback(`      🎯 Cible: Leader ${target.name} (Power: ${target.power})`);
      } else if (opponent.field.length > 0) {
        // Choisir la carte la plus faible sur le terrain
        target = opponent.field.reduce((weakest, current) => 
          current.power < weakest.power ? current : weakest
        );
        targetType = 'Personnage';
        logCallback(`      🎯 Cible: ${target.name} (Power: ${target.power})`);
      } else if (opponent.leader) {
        // Attaquer le Leader même si on ne peut pas le vaincre (pour faire des dégâts)
        target = opponent.leader;
        targetType = 'Leader';
        logCallback(`      🎯 Cible: Leader ${target.name} (Power: ${target.power}) - Attaque désespérée`);
      } else {
        logCallback(`      ❌ Aucune cible disponible`);
        return gameState;
      }
      
      // Vérifier si l'adversaire peut bloquer l'attaque
      const blockResult = this.checkForBlock(gameState, opponentId, attacker, target, logCallback);
      if (blockResult.isBlocked) {
        logCallback(`      🛡️ Attaque bloquée par ${blockResult.blockType} !`);
        return blockResult.updatedState;
      }
      
      // Exécuter l'attaque si pas de blocage
      const updatedState = CombatService.executeAttack(gameState, attacker.id, target.id, playerId);
      
      // Marquer la carte comme ayant attaqué
      const player = updatedState[playerId];
      const updatedField = player.field.map(card => 
        card.id === attacker.id ? { ...card, hasAttacked: true } : card
      );
      
      logCallback(`      ✅ Attaque exécutée: ${attacker.name} → ${targetType} ${target.name}`);
      
      return {
        ...updatedState,
        [playerId]: {
          ...player,
          field: updatedField
        }
      };
      
    } catch (error) {
      logCallback(`      ❌ Erreur lors de l'attaque: ${error}`);
      return gameState;
    }
  }
  
  /**
   * Vérifie si l'adversaire peut bloquer une attaque
   */
  private static checkForBlock(
    gameState: GameState,
    defenderId: 'player' | 'opponent',
    attacker: GameCard,
    target: GameCard,
    logCallback: (message: string) => void
  ): { isBlocked: boolean; blockType: string; updatedState: GameState } {
    const defender = gameState[defenderId];
    const turnNumber = gameState.turnNumber || 1;
    
    // Dans les tours 2-3, simuler des blocages pour tester
    if (turnNumber >= 2 && turnNumber <= 3) {
      // Tour 2 : Blocage avec un personnage (effet coûteux)
      if (turnNumber === 2 && defender.hand.some(card => card.type === 'CHARACTER')) {
        const blockingCharacter = defender.hand.find(card => card.type === 'CHARACTER');
        if (blockingCharacter) {
          // Ajouter la valeur counterValue au pouvoir du personnage
          const enhancedPower = blockingCharacter.power + (blockingCharacter.counterValue || 0);
          logCallback(`      🛡️ Blocage avec personnage: ${blockingCharacter.name} (Power: ${blockingCharacter.power} → ${enhancedPower})`);
          
          // Retirer le personnage de la main et l'ajouter au terrain avec le pouvoir augmenté
          const updatedHand = defender.hand.filter(card => card.id !== blockingCharacter.id);
          const enhancedCharacter = {
            ...blockingCharacter,
            power: enhancedPower,
            isActive: false,
            wasPlayedThisTurn: true,
            canAttack: false
          };
          
          const updatedField = [...defender.field, enhancedCharacter];
          
          // Consommer des DON pour le blocage (effet coûteux)
          const donToRest = defender.donField.slice(0, 2); // Coût de 2 pour le blocage
          const remainingDonField = defender.donField.slice(2);
          
          const updatedDonField = [
            ...donToRest.map(don => ({ ...don, isActive: false })),
            ...remainingDonField.map(don => ({ ...don, isActive: true }))
          ];
          
          const updatedState = {
            ...gameState,
            [defenderId]: {
              ...defender,
              hand: updatedHand,
              field: updatedField,
              donField: updatedDonField
            }
          };
          
          return {
            isBlocked: true,
            blockType: `Personnage ${blockingCharacter.name} (Power: ${enhancedPower})`,
            updatedState
          };
        }
      }
      
      // Tour 3 : Blocage avec une carte événement (counter)
      if (turnNumber === 3 && defender.hand.some(card => card.type === 'EVENT')) {
        const blockingEvent = defender.hand.find(card => card.type === 'EVENT');
        if (blockingEvent) {
          // Ajouter la valeur counterValue au pouvoir du Leader
          const leader = defender.leader;
          if (leader) {
            const enhancedLeaderPower = leader.power + (blockingEvent.counterValue || 0);
            logCallback(`      🛡️ Blocage avec événement: ${blockingEvent.name} (Counter) - Leader Power: ${leader.power} → ${enhancedLeaderPower}`);
            
            // Retirer l'événement de la main
            const updatedHand = defender.hand.filter(card => card.id !== blockingEvent.id);
            
            // Mettre à jour le Leader avec le pouvoir augmenté
            const updatedLeader = {
              ...leader,
              power: enhancedLeaderPower
            };
            
            // Pas de coût DON pour les événements counter
            const updatedState = {
              ...gameState,
              [defenderId]: {
                ...defender,
                hand: updatedHand,
                leader: updatedLeader
              }
            };
            
            return {
              isBlocked: true,
              blockType: `Événement ${blockingEvent.name} (Leader Power: ${enhancedLeaderPower})`,
              updatedState
            };
          }
        }
      }
    }
    
    // Pas de blocage
    return {
      isBlocked: false,
      blockType: '',
      updatedState: gameState
    };
  }
  
  /**
   * Exécute une attaque du Leader
   */
  private static executeLeaderAttack(
    gameState: GameState,
    leader: GameCard,
    playerId: 'player' | 'opponent',
    logCallback: (message: string) => void
  ): GameState {
    try {
      const opponentId = playerId === 'player' ? 'opponent' : 'player';
      const opponent = gameState[opponentId];
      
      // Choisir une cible (priorité au Leader adverse)
      let target: GameCard;
      let targetType: string;
      
      if (opponent.leader) {
        // Attaquer le Leader adverse
        target = opponent.leader;
        targetType = 'Leader';
        logCallback(`      🎯 Cible: Leader ${target.name} (Power: ${target.power})`);
      } else if (opponent.field.length > 0) {
        // Choisir la carte la plus faible sur le terrain
        target = opponent.field.reduce((weakest, current) => 
          current.power < weakest.power ? current : weakest
        );
        targetType = 'Personnage';
        logCallback(`      🎯 Cible: ${target.name} (Power: ${target.power})`);
      } else {
        logCallback(`      ❌ Aucune cible disponible`);
        return gameState;
      }
      
      // Vérifier si l'adversaire peut bloquer l'attaque du Leader
      const blockResult = this.checkForBlock(gameState, opponentId, leader, target, logCallback);
      if (blockResult.isBlocked) {
        logCallback(`      🛡️ Attaque du Leader bloquée par ${blockResult.blockType} !`);
        return blockResult.updatedState;
      }
      
      // Calculer le résultat du combat manuellement
      const combatResult = this.calculateLeaderCombatResult(leader, target);
      logCallback(`      ⚔️ Résultat: ${combatResult.message}`);
      
      // Appliquer les résultats manuellement
      let updatedState = gameState;
      
      // Appliquer les dégâts au Leader si nécessaire
      if (combatResult.damageToLeader) {
        if (combatResult.attackerWins) {
          // Dégâts au Leader adverse
          const opponentPlayer = updatedState[opponentId];
          const newLifePoints = Math.max(0, opponentPlayer.lifePoints - combatResult.damageToLeader);
          
          logCallback(`      💔 ${opponentId} perd ${combatResult.damageToLeader} point(s) de vie (${opponentPlayer.lifePoints} → ${newLifePoints})`);
          
          updatedState = {
            ...updatedState,
            [opponentId]: {
              ...opponentPlayer,
              lifePoints: newLifePoints
            }
          };
        } else {
          // Dégâts au Leader de l'attaquant
          const attackerPlayer = updatedState[playerId];
          const newLifePoints = Math.max(0, attackerPlayer.lifePoints - combatResult.damageToLeader);
          
          logCallback(`      💔 ${playerId} perd ${combatResult.damageToLeader} point(s) de vie (${attackerPlayer.lifePoints} → ${newLifePoints})`);
          
          updatedState = {
            ...updatedState,
            [playerId]: {
              ...attackerPlayer,
              lifePoints: newLifePoints
            }
          };
        }
      }
      
      // Marquer le Leader comme ayant attaqué
      const player = updatedState[playerId];
      const updatedLeader = {
        ...player.leader!,
        hasAttacked: true
      };
      
      logCallback(`      ✅ Attaque du Leader exécutée: ${leader.name} → ${targetType} ${target.name}`);
      
      return {
        ...updatedState,
        [playerId]: {
          ...player,
          leader: updatedLeader
        }
      };
      
    } catch (error) {
      logCallback(`      ❌ Erreur lors de l'attaque du Leader: ${error}`);
      return gameState;
    }
  }
  
  /**
   * Calcule le résultat du combat pour un Leader
   */
  private static calculateLeaderCombatResult(attacker: GameCard, target: GameCard): {
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
   * Simule une partie rapide (version condensée)
   */
  static simulateQuickGame(
    initialGameState: GameState,
    logCallback: (message: string) => void
  ): SimulationResult {
    logCallback('🚀 SIMULATION RAPIDE DE PARTIE');
    logCallback('🎯 Objectif: Faire gagner le premier joueur rapidement');
    
    let currentState = { ...initialGameState };
    let turnNumber = 1;
    
    try {
      // Configuration rapide
      currentState = {
        ...currentState,
        hasKeptHand: true,
        setupPhase: 'COMPLETE' as const
      };
      
      // Tour 1: Le joueur joue agressivement
      logCallback('🔄 TOUR 1 - STRATÉGIE AGRESSIVE');
      currentState = this.executeAggressivePlayerTurn(currentState, logCallback);
      
      // Vérifier la victoire
      let gameOverCheck = CombatService.checkGameOver(currentState);
      if (gameOverCheck.gameOver) {
        logCallback(`🏆 VICTOIRE RAPIDE ! Vainqueur: ${gameOverCheck.winner}`);
        return {
                  steps: [{
          turn: 1,
          player: 'player' as const,
          phase: 'VICTORY',
          action: 'Victoire rapide',
          description: 'Victoire du joueur au tour 1',
          gameState: currentState
        }],
          winner: 'player',
          totalTurns: 1,
          finalGameState: currentState
        };
      }
      
      // Tour 2: L'adversaire défend
      logCallback('🔄 TOUR 2 - DÉFENSE ADVERSAIRE');
      currentState = this.executeDefensiveOpponentTurn(currentState, logCallback);
      
      // Tour 3: Le joueur finit le travail
      logCallback('🔄 TOUR 3 - FINALISATION');
      currentState = this.executeFinishingPlayerTurn(currentState, logCallback);
      
      // Vérifier la victoire finale
      gameOverCheck = CombatService.checkGameOver(currentState);
      const winner = gameOverCheck.gameOver ? gameOverCheck.winner! : 'player';
      
      logCallback(`🏆 FIN DE PARTIE ! Vainqueur: ${winner}`);
      
      return {
        steps: [{
          turn: 3,
                  player: winner as 'player' | 'opponent',
        phase: 'VICTORY',
        action: 'Fin de partie',
        description: `Victoire de ${winner as 'player' | 'opponent'} au tour 3`,
          gameState: currentState
        }],
        winner: winner as 'player' | 'opponent',
        totalTurns: 3,
        finalGameState: currentState
      };
      
    } catch (error) {
      logCallback(`❌ ERREUR: ${error}`);
      throw error;
    }
  }
  
  /**
   * Tour agressif du joueur
   */
  private static executeAggressivePlayerTurn(
    gameState: GameState,
    logCallback: (message: string) => void
  ): GameState {
    let currentState = { ...gameState };
    
    // Activer DON
    currentState = DonService.activateDon(currentState, 'player');
    logCallback('  💎 DON activés');
    
    // Jouer des cartes agressives
    if (currentState.player.hand.length > 0) {
      const highPowerCard = currentState.player.hand.find(card => card.power >= 4000);
      if (highPowerCard) {
        logCallback(`  🎴 Jouer carte puissante: ${highPowerCard.name}`);
        currentState = this.playCardToField(currentState, highPowerCard, 'player');
      }
    }
    
    // Attaquer directement le Leader
    if (currentState.player.field.length > 0) {
      const attacker = currentState.player.field[0];
      currentState = this.executeAttack(currentState, attacker, 'player', logCallback);
    }
    
    return currentState;
  }
  
  /**
   * Tour défensif de l'adversaire
   */
  private static executeDefensiveOpponentTurn(
    gameState: GameState,
    logCallback: (message: string) => void
  ): GameState {
    let currentState = { ...gameState };
    
    // Activer DON
    currentState = DonService.activateDon(currentState, 'opponent');
    logCallback('  💎 DON activés (adversaire)');
    
    // Jouer une carte défensive
    if (currentState.opponent.hand.length > 0) {
      const defensiveCard = currentState.opponent.hand[0];
      logCallback(`  🎴 Carte défensive jouée: ${defensiveCard.name}`);
      currentState = this.playCardToField(currentState, defensiveCard, 'opponent');
    }
    
    return currentState;
  }
  
  /**
   * Tour de finalisation du joueur
   */
  private static executeFinishingPlayerTurn(
    gameState: GameState,
    logCallback: (message: string) => void
  ): GameState {
    let currentState = { ...gameState };
    
    // Activer plus de DON
    currentState = DonService.activateDon(currentState, 'player');
    logCallback('  💎 DON supplémentaires activés');
    
    // Attaquer pour finir
    if (currentState.player.field.length > 0) {
      const attacker = currentState.player.field[0];
      if (!attacker.hasAttacked) {
        currentState = this.executeAttack(currentState, attacker, 'player', logCallback);
      }
    }
    
    return currentState;
  }
}
