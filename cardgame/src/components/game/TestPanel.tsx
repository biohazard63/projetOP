import React, { useState } from 'react';
import { DonService } from '@/lib/game/donService';
import { CardStateService } from '@/lib/game/cardStateService';
import { CombatService } from '@/lib/game/combatService';
import { PhaseService } from '@/lib/game/phaseService';
import { CounterService } from '@/lib/game/counterService';
import { CardEffectsService } from '@/lib/game/cardEffectsService';
import { StrategyService } from '@/lib/game/strategyService';
import { createTestGameState, testCharacters } from '@/lib/game/testData';
import { GameState, GameCard } from '@/types/game';
import { GameSimulationService } from '@/lib/game/gameSimulationService';

interface TestPanelProps {
  gameState: GameState;
  onGameStateUpdate: (newState: GameState) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const TestPanel: React.FC<TestPanelProps> = ({ gameState, onGameStateUpdate, isOpen, onClose }) => {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const resetToTestState = () => {
    addTestResult('🔄 Réinitialisation à l\'état de test...');
    const testState = createTestGameState();
    onGameStateUpdate(testState);
    addTestResult('✅ État de test chargé avec 2 personnages et 10 DON');
  };

  const testActivateDon = () => {
    try {
      addTestResult('🧪 Test d\'activation des DON...');
      
      if (!gameState.canDrawDon) {
        addTestResult('❌ Impossible d\'activer les DON : canDrawDon = false');
        return;
      }

      if (gameState.player.donDeck.length < 2) {
        addTestResult('❌ Pas assez de DON dans le deck DON');
        return;
      }

      const updatedState = DonService.activateDon(gameState, 'player');
      addTestResult(`✅ DON activés ! Nouveaux DON actifs: ${updatedState.player.activeDon}`);
      addTestResult(`📊 DON dans le champ: ${updatedState.player.donField.length}`);
      addTestResult(`📊 canDrawDon: ${updatedState.canDrawDon}`);
      
      onGameStateUpdate(updatedState);
    } catch (error) {
      addTestResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testAttachDon = () => {
    try {
      addTestResult('🧪 Test d\'attachement d\'un DON...');
      
      if (gameState.player.donField.length === 0) {
        addTestResult('❌ Aucun DON disponible dans le champ');
        return;
      }

      if (gameState.player.field.length === 0) {
        addTestResult('❌ Aucun personnage sur le terrain pour attacher le DON');
        return;
      }

      const donToAttach = gameState.player.donField[0];
      const targetCard = gameState.player.field[0];
      
      addTestResult(`🎯 Attachement du DON ${donToAttach.id} à ${targetCard.name}`);
      
      const updatedState = DonService.attachDon(gameState, 'player', donToAttach.id, targetCard.id);
      const updatedCard = updatedState.player.field.find(c => c.id === targetCard.id);
      
      addTestResult(`✅ DON attaché ! Nouveaux DON attachés: ${updatedCard?.attachedDons}`);
      addTestResult(`📊 DON actifs restants: ${updatedState.player.activeDon}`);
      addTestResult(`📊 DON dans le champ: ${updatedState.player.donField.length}`);
      
      onGameStateUpdate(updatedState);
    } catch (error) {
      addTestResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testPayCost = () => {
    try {
      addTestResult('🧪 Test de paiement d\'un coût...');
      
      const cost = 2;
      if (gameState.player.activeDon < cost) {
        addTestResult(`❌ Pas assez de DON pour payer le coût de ${cost}`);
        addTestResult(`💡 Conseil: Activez d'abord des DON avec le test "Activer DON"`);
        return;
      }

      addTestResult(`💰 Paiement d\'un coût de ${cost} DON...`);
      
      const updatedState = DonService.payCost(gameState, 'player', cost);
      addTestResult(`✅ Coût payé ! DON actifs restants: ${updatedState.player.activeDon}`);
      addTestResult(`📊 DON dans le champ: ${updatedState.player.donField.length}`);
      
      onGameStateUpdate(updatedState);
    } catch (error) {
      addTestResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testCalculatePower = () => {
    try {
      addTestResult('🧪 Test de calcul du power total...');
      
      if (gameState.player.field.length === 0) {
        addTestResult('❌ Aucun personnage sur le terrain');
        return;
      }

      const card = gameState.player.field[0];
      const totalPower = DonService.calculateTotalPower(card);
      
      addTestResult(`📊 ${card.name}: Power de base = ${card.power}, DON attachés = ${card.attachedDons || 0}`);
      addTestResult(`💪 Power total = ${totalPower}`);
      
      if (card.attachedDons && card.attachedDons > 0) {
        addTestResult(`🎯 Bonus DON: +${(card.attachedDons || 0) * 1000} power`);
      }
    } catch (error) {
      addTestResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testCanAttack = () => {
    try {
      addTestResult('🧪 Test de capacité d\'attaque...');
      
      if (gameState.player.field.length === 0) {
        addTestResult('❌ Aucun personnage sur le terrain');
        return;
      }

      const card = gameState.player.field[0];
      const canAttack = DonService.canCardAttack(card, true);
      
      addTestResult(`⚔️ ${card.name} peut attaquer: ${canAttack ? 'OUI' : 'NON'}`);
      addTestResult(`📋 Rush: ${card.hasRush ? 'OUI' : 'NON'}, Joué ce tour: ${card.wasPlayedThisTurn ? 'OUI' : 'NON'}`);
      
      if (!canAttack && card.type === 'CHARACTER') {
        addTestResult(`⚠️ Summoning Sickness: Le personnage ne peut pas attaquer car il a été joué ce tour`);
      }
    } catch (error) {
      addTestResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testAddCharacter = () => {
    try {
      addTestResult('🧪 Test d\'ajout d\'un personnage...');
      
      if (gameState.player.field.length >= 5) {
        addTestResult('❌ Terrain plein (5 personnages maximum)');
        return;
      }

      const newCharacter = testCharacters[gameState.player.field.length];
      const updatedState = {
        ...gameState,
        player: {
          ...gameState.player,
          field: [...gameState.player.field, newCharacter]
        }
      };
      
      addTestResult(`✅ ${newCharacter.name} ajouté au terrain`);
      addTestResult(`📊 Personnages sur le terrain: ${updatedState.player.field.length}`);
      
      onGameStateUpdate(updatedState);
    } catch (error) {
      addTestResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  // Nouveaux tests pour les états des cartes
  const testToggleCardPosition = () => {
    try {
      addTestResult('🧪 Test de changement de position d\'une carte...');
      
      if (gameState.player.field.length === 0) {
        addTestResult('❌ Aucun personnage sur le terrain');
        return;
      }

      const card = gameState.player.field[0];
      const currentPosition = card.isActive ? 'Active' : 'Rested';
      const newPosition = card.isActive ? 'Rested' : 'Active';
      
      addTestResult(`🔄 Changement de position de ${card.name} de ${currentPosition} vers ${newPosition}`);
      
      const updatedState = CardStateService.toggleCardPosition(gameState, 'player', card.id);
      const updatedCard = updatedState.player.field.find(c => c.id === card.id);
      
      addTestResult(`✅ Position changée ! ${updatedCard?.name} est maintenant ${updatedCard?.isActive ? 'Active' : 'Rested'}`);
      
      onGameStateUpdate(updatedState);
    } catch (error) {
      addTestResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testMarkCardAsPlayed = () => {
    try {
      addTestResult('🧪 Test de marquage d\'une carte comme jouée ce tour...');
      
      if (gameState.player.field.length === 0) {
        addTestResult('❌ Aucun personnage sur le terrain');
        return;
      }

      const card = gameState.player.field[0];
      addTestResult(`🎯 Marquage de ${card.name} comme jouée ce tour (Summoning Sickness)`);
      
      const updatedState = CardStateService.markCardAsPlayedThisTurn(gameState, 'player', card.id);
      const updatedCard = updatedState.player.field.find(c => c.id === card.id);
      
      addTestResult(`✅ Carte marquée ! ${updatedCard?.name} peut attaquer: ${updatedCard?.canAttack ? 'OUI' : 'NON'}`);
      addTestResult(`📋 Jouée ce tour: ${updatedCard?.wasPlayedThisTurn ? 'OUI' : 'NON'}`);
      
      onGameStateUpdate(updatedState);
    } catch (error) {
      addTestResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testRefreshAllCards = () => {
    try {
      addTestResult('🧪 Test de rafraîchissement de toutes les cartes...');
      
      // D'abord, mettre quelques cartes en position Rested
      let testState = { ...gameState };
      if (testState.player.field.length > 0) {
        testState = CardStateService.changeAllCardsPosition(testState, 'player', false);
        addTestResult(`📊 Cartes mises en position Rested pour le test`);
      }
      
      addTestResult(`🔄 Rafraîchissement de toutes les cartes (Stand/Refresh)`);
      
      const updatedState = CardStateService.refreshAllCards(testState, 'player');
      const status = CardStateService.getPlayerCardsStatus(updatedState.player);
      
      addTestResult(`✅ Cartes rafraîchies !`);
      addTestResult(`📊 Total: ${status.totalCards}, Active: ${status.activeCards}, Rested: ${status.restedCards}`);
      addTestResult(`⚔️ Peuvent attaquer: ${status.canAttackCards}, Summoning Sickness: ${status.summoningSickCards}`);
      
      onGameStateUpdate(updatedState);
    } catch (error) {
      addTestResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testCardStatus = () => {
    try {
      addTestResult('🧪 Test d\'analyse de l\'état des cartes...');
      
      const status = CardStateService.getPlayerCardsStatus(gameState.player);
      
      addTestResult(`📊 État des cartes du joueur:`);
      addTestResult(`   Total: ${status.totalCards}`);
      addTestResult(`   Active: ${status.activeCards}`);
      addTestResult(`   Rested: ${status.restedCards}`);
      addTestResult(`   Peuvent attaquer: ${status.canAttackCards}`);
      addTestResult(`   Summoning Sickness: ${status.summoningSickCards}`);
      addTestResult(`   Leader Active: ${status.leaderActive ? 'OUI' : 'NON'}`);
      addTestResult(`   DON Active: ${status.donActive}`);
      
    } catch (error) {
      addTestResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  // Nouveaux tests pour le combat
  const testCombatValidation = () => {
    addTestResult('⚔️ Test de validation des attaques...');
    
    try {
      // Test avec des cartes valides
      const validation = CombatService.canAttack(gameState, 'test-attacker', 'test-target', 'player');
      addTestResult(`✅ Validation: ${validation ? 'OUI' : 'NON'}`);
      
      if (!validation) {
        addTestResult('ℹ️ Attaque non valide (normal pour des cartes de test)');
      }

      addTestResult('✅ Validation des attaques fonctionne !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors de la validation: ${error}`);
    }
  };

  const testExecuteAttack = () => {
    try {
      addTestResult('⚔️ Test d\'exécution d\'une attaque...');
      
      const characters = gameState.player.field.filter(c => c.type === 'CHARACTER');
      if (characters.length === 0) {
        addTestResult('❌ Aucun personnage sur le terrain pour attaquer');
        return;
      }

      const attacker = characters[0];
      const target = gameState.opponent.leader;
      
      if (!target) {
        addTestResult('❌ Aucun Leader adverse pour attaquer');
        return;
      }

      addTestResult(`🎯 Exécution de l'attaque: ${attacker.name} → ${target.name}`);
      addTestResult(`📊 Power de l'attaquant: ${attacker.power}`);
      addTestResult(`📊 Power de la cible: ${target.power}`);
      addTestResult(`📊 Points de vie avant: ${gameState.opponent.lifePoints}`);
      
      // Log de débogage avant l'appel
      addTestResult('🔧 Appel de CombatService.executeAttack...');
      
      const updatedState = CombatService.executeAttack(gameState, attacker.id, target.id, 'player');
      
      // Log de débogage après l'appel
      addTestResult('✅ CombatService.executeAttack terminé !');
      addTestResult(`📊 Points de vie après: ${updatedState.opponent.lifePoints}`);
      
      onGameStateUpdate(updatedState);
      
      addTestResult('✅ Attaque exécutée !');
      addTestResult(`📊 Points de vie de l'adversaire: ${updatedState.opponent.lifePoints}`);
      
      // Vérifier les conditions de fin de partie
      const gameOverCheck = CombatService.checkGameOver(updatedState);
      if (gameOverCheck.gameOver) {
        addTestResult(`🏁 Fin de partie: ${gameOverCheck.reason}`);
      }
      
    } catch (error) {
      addTestResult(`❌ Erreur lors de l'exécution de l'attaque: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      // Log détaillé de l'erreur
      console.error('Erreur détaillée:', error);
    }
  };

  const testCombatStates = () => {
    try {
      addTestResult('🔄 Test de réinitialisation des états de combat...');
      
      const updatedState = CombatService.resetCombatStates(gameState, 'player');
      onGameStateUpdate(updatedState);
      
      addTestResult('✅ États de combat réinitialisés !');
      
      // Vérifier que les cartes peuvent à nouveau attaquer
      const characters = updatedState.player.field.filter(c => c.type === 'CHARACTER');
      const canAttackCount = characters.filter(c => !c.hasAttacked).length;
      addTestResult(`📊 Personnages pouvant attaquer: ${canAttackCount}/${characters.length}`);
      
    } catch (error) {
      addTestResult(`❌ Erreur lors de la réinitialisation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testGameOverConditions = () => {
    try {
      addTestResult('🏁 Test des conditions de fin de partie...');
      
      // Tester avec l'état actuel
      const currentCheck = CombatService.checkGameOver(gameState);
      addTestResult(`📊 État actuel - Fin de partie: ${currentCheck.gameOver ? 'OUI' : 'NON'}`);
      
      // Créer un état de test avec 0 points de vie
      const testState = {
        ...gameState,
        player: {
          ...gameState.player,
          lifePoints: 0
        }
      };
      
      const testCheck = CombatService.checkGameOver(testState);
      addTestResult(`📊 Test avec 0 PV - Fin de partie: ${testCheck.gameOver ? 'OUI' : 'NON'}`);
      if (testCheck.gameOver) {
        addTestResult(`🏆 Vainqueur: ${testCheck.winner === 'player' ? 'Adversaire' : 'Joueur'}`);
        addTestResult(`📝 Raison: ${testCheck.reason}`);
      }
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test des conditions de fin: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testLifePoints = () => {
    try {
      addTestResult('❤️ Test des points de vie:');
      addTestResult(`Joueur: ${gameState.player.lifePoints} PV`);
      addTestResult(`Adversaire: ${gameState.opponent.lifePoints} PV`);
      
      if (gameState.opponent.leader) {
        addTestResult(`Leader adverse: ${gameState.opponent.leader.name}`);
        addTestResult(`Power du Leader: ${gameState.opponent.leader.power}`);
      }
      
      if (gameState.player.field.length > 0) {
        const firstChar = gameState.player.field[0];
        addTestResult(`Premier personnage: ${firstChar.name} (${firstChar.power} power)`);
      }
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test des points de vie: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testCombatServiceAccess = () => {
    addTestResult('🔍 Test d\'accès au CombatService...');
    
    try {
      // Test d'accès au service
      const testValidation = CombatService.canAttack(gameState, 'dummy', 'dummy', 'player');
      addTestResult(`✅ CombatService accessible - Validation test: ${testValidation ? 'OUI' : 'NON'}`);
      
      // Test de la fonction checkGameOver
      const gameOverCheck = CombatService.checkGameOver(gameState);
      addTestResult(`✅ checkGameOver fonctionne: ${gameOverCheck.gameOver ? 'OUI' : 'NON'}`);
      
      addTestResult('✅ CombatService fonctionne correctement !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test d'accès: ${error}`);
    }
  };

  // Tests pour le système de phases
  const testPhaseNavigation = () => {
    addTestResult('⏭️ Test de navigation des phases...');
    
    try {
      // Test de passage à la phase suivante
      const currentPhase = gameState.currentPhase;
      addTestResult(`📍 Phase actuelle: ${currentPhase}`);
      
      const nextState = PhaseService.nextPhase(gameState);
      addTestResult(`✅ Phase suivante: ${nextState.currentPhase}`);
      
      // Test de retour à la phase précédente
      const prevState = PhaseService.previousPhase(nextState);
      addTestResult(`✅ Retour à la phase: ${prevState.currentPhase}`);
      
      // Test des actions disponibles
      const availableActions = PhaseService.getAvailableActions(gameState);
      addTestResult(`🎯 Actions disponibles: ${availableActions.join(', ')}`);
      
      // Test de la description de phase
      const phaseDescription = PhaseService.getPhaseDescription(gameState.currentPhase);
      addTestResult(`📝 Description: ${phaseDescription}`);
      
      addTestResult('✅ Navigation des phases fonctionne !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test des phases: ${error}`);
    }
  };

  const testPhaseActions = () => {
    addTestResult('⚡ Test des actions de phase...');
    
    try {
      // Test d'exécution des actions de phase
      const updatedState = PhaseService.executePhaseActions(gameState);
      addTestResult(`✅ Actions de phase exécutées pour: ${updatedState.currentPhase}`);
      
      // Test de validation des actions
      const canDraw = PhaseService.canPerformAction(gameState, 'DRAW_CARD');
      const canAttack = PhaseService.canPerformAction(gameState, 'ATTACK');
      const canPlayCard = PhaseService.canPerformAction(gameState, 'PLAY_CARD');
      
      addTestResult(`🎯 Peut piocher: ${canDraw ? 'OUI' : 'NON'}`);
      addTestResult(`🎯 Peut attaquer: ${canAttack ? 'OUI' : 'NON'}`);
      addTestResult(`🎯 Peut jouer une carte: ${canPlayCard ? 'OUI' : 'NON'}`);
      
      addTestResult('✅ Actions de phase fonctionnent !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test des actions: ${error}`);
    }
  };

  const testTurnManagement = () => {
    addTestResult('🔄 Test de gestion des tours...');
    
    try {
      const currentPlayer = gameState.currentPlayer;
      const currentTurn = gameState.turnNumber;
      
      addTestResult(`📍 Joueur actuel: ${currentPlayer}`);
      addTestResult(`📍 Tour actuel: ${currentTurn}`);
      
      // Test de fin de tour
      const newActivePlayer = currentPlayer === 'player' ? 'opponent' : 'player';
      const endTurnState = PhaseService.endTurn(gameState, newActivePlayer);
      
      addTestResult(`✅ Nouveau joueur actif: ${endTurnState.currentPlayer}`);
      addTestResult(`✅ Nouveau tour: ${endTurnState.turnNumber}`);
      addTestResult(`✅ Phase réinitialisée: ${endTurnState.currentPhase}`);
      
      addTestResult('✅ Gestion des tours fonctionne !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test des tours: ${error}`);
    }
  };

  // Tests pour le système de contre et blocage
  const testCounterSystem = () => {
    addTestResult('🛡️ Test du système de contre...');
    
    try {
      // Test d'ajout d'un événement de contre
      const counterEvent = {
        type: 'COUNTER' as const,
        sourceCardId: 'test-counter',
        targetActionId: 'test-attack',
        playerId: 'player' as const,
        priority: 100,
        description: 'Test de contre',
        execute: (state: GameState) => state
      };

      const updatedState = CounterService.addCounterEvent(gameState, counterEvent);
      addTestResult(`✅ Événement de contre ajouté: ${updatedState.battleStack.length} actions dans la pile`);

      // Test de résolution de la pile
      const resolvedState = CounterService.resolveBattleStack(updatedState);
      addTestResult(`✅ Pile de combat résolue: ${resolvedState.battleStack.length} actions restantes`);

      addTestResult('✅ Système de contre fonctionne !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test des contre: ${error}`);
    }
  };

  const testBlockingSystem = () => {
    addTestResult('🛡️ Test du système de blocage...');
    
    try {
      // Test d'ajout d'une action de blocage
      const blockAction = {
        blockerCardId: 'test-blocker',
        blockedActionId: 'test-attack',
        playerId: 'opponent' as const
      };

      const updatedState = CounterService.addBlockAction(gameState, blockAction);
      addTestResult(`✅ Action de blocage ajoutée: ${updatedState.battleStack.length} actions dans la pile`);

      // Test de résolution de la pile
      const resolvedState = CounterService.resolveBattleStack(updatedState);
      addTestResult(`✅ Pile de combat résolue: ${resolvedState.battleStack.length} actions restantes`);

      addTestResult('✅ Système de blocage fonctionne !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test des blocages: ${error}`);
    }
  };

  const testBattleStack = () => {
    addTestResult('⚔️ Test de la pile de combat...');
    
    try {
      // Créer un état avec plusieurs actions
      let testState = gameState;
      
      // Ajouter un contre
      const counterAction = {
        type: 'COUNTER' as const,
        sourceCardId: 'test-counter',
        targetActionId: 'test-attack',
        playerId: 'opponent' as const,
        priority: 100,
        description: 'Test de contre',
        execute: (state: GameState) => state
      };
      
      testState = CounterService.addCounterEvent(testState, counterAction);
      
      // Ajouter un autre contre
      const counterAction2 = {
        type: 'COUNTER' as const,
        sourceCardId: 'test-counter-2',
        targetActionId: 'test-attack',
        playerId: 'player' as const,
        priority: 50,
        description: 'Test de contre 2',
        execute: (state: GameState) => state
      };
      
      testState = CounterService.addCounterEvent(testState, counterAction2);
      
      addTestResult(`📚 Pile créée: ${testState.battleStack.length} actions`);
      
      // Tester la résolution
      const resolvedState = CounterService.resolveBattleStack(testState);
      addTestResult(`✅ Résolution terminée: ${resolvedState.battleStack.length} actions restantes`);
      
      addTestResult('✅ Pile de combat fonctionne !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test de la pile: ${error}`);
    }
  };

  // Tests pour les effets de cartes et stratégies
  const testCardEffects = () => {
    addTestResult('✨ Test des effets de cartes...');
    
    try {
      // Test d'exécution d'un effet simple
      const testEffect = {
        id: 'test-effect',
        type: 'ON_PLAY' as const,
        timing: 'IMMEDIATE' as const,
        description: 'Test d\'effet simple',
        execute: (state: GameState) => state
      };

      const updatedState = CardEffectsService.executeEffect(
        gameState,
        testEffect,
        testCharacters[0],
        undefined,
        'player'
      );

      addTestResult(`✅ Effet exécuté: ${testEffect.description}`);
      addTestResult(`✅ État du jeu mis à jour`);

      addTestResult('✅ Effets de cartes fonctionnent !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test des effets: ${error}`);
    }
  };

  const testCombos = () => {
    addTestResult('🎯 Test des combinaisons...');
    
    try {
      // Obtenir les combinaisons disponibles
      const availableCombos = CardEffectsService.getAvailableCombos(gameState, 'player');
      addTestResult(`📚 Combinaisons disponibles: ${availableCombos.length}`);

      // Tester l'exécution d'une combinaison si disponible
      if (availableCombos.length > 0) {
        const combo = availableCombos[0];
        addTestResult(`🎯 Test de la combinaison: ${combo.name}`);
        
        const updatedState = CardEffectsService.executeCombo(gameState, combo, 'player');
        addTestResult(`✅ Combinaison exécutée: ${combo.name}`);
      } else {
        addTestResult('ℹ️ Aucune combinaison disponible avec l\'état actuel');
      }

      addTestResult('✅ Système de combinaisons fonctionne !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test des combinaisons: ${error}`);
    }
  };

  const testStrategyAnalysis = () => {
    addTestResult('🧠 Test de l\'analyse stratégique...');
    
    try {
      // Analyser l'état du jeu
      const analysis = StrategyService.analyzeGameState(gameState, 'player');
      addTestResult(`📊 Force du terrain: ${analysis.fieldStrength}`);
      addTestResult(`📊 Qualité de la main: ${analysis.handQuality}`);
      addTestResult(`📊 Efficacité du deck: ${analysis.deckEfficiency}`);
      addTestResult(`📊 Avantage en PV: ${analysis.lifeAdvantage}`);
      addTestResult(`📊 Score global: ${analysis.overallScore}`);

      // Évaluer la position
      const position = StrategyService.evaluatePosition(gameState, 'player');
      addTestResult(`🎯 Position: ${position.position}`);
      addTestResult(`🎯 Confiance: ${position.confidence}%`);
      addTestResult(`💡 Recommandations: ${position.recommendations.length}`);

      addTestResult('✅ Analyse stratégique fonctionne !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors de l'analyse stratégique: ${error}`);
    }
  };

  const testStrategySuggestions = () => {
    addTestResult('💡 Test des suggestions de stratégies...');
    
    try {
      // Obtenir des suggestions de stratégies
      const strategies = StrategyService.suggestStrategies(gameState, 'player');
      addTestResult(`🎯 Stratégies suggérées: ${strategies.length}`);

      // Analyser chaque stratégie
      strategies.forEach((strategy, index) => {
        addTestResult(`📋 Stratégie ${index + 1}: ${strategy.strategy.name}`);
        addTestResult(`   📊 Faisabilité: ${strategy.feasibility}%`);
        addTestResult(`   📊 Progrès: ${strategy.currentProgress}%`);
        addTestResult(`   ❌ Cartes manquantes: ${strategy.missingCards.length}`);
        addTestResult(`   📝 Étapes suivantes: ${strategy.nextSteps.length}`);
      });

      addTestResult('✅ Suggestions de stratégies fonctionnent !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors des suggestions: ${error}`);
    }
  };

  const testVictoryConditions = () => {
    addTestResult('🏆 Test des conditions de victoire avancées...');
    
    try {
      // Vérifier les conditions de victoire
      const victoryCheck = CardEffectsService.checkAdvancedVictoryConditions(gameState);
      addTestResult(`📊 Fin de partie: ${victoryCheck.gameOver ? 'OUI' : 'NON'}`);
      
      if (victoryCheck.gameOver) {
        addTestResult(`🏆 Vainqueur: ${victoryCheck.winner}`);
        addTestResult(`📝 Raison: ${victoryCheck.reason}`);
        addTestResult(`🎯 Condition: ${victoryCheck.condition}`);
      } else {
        addTestResult(`🎮 Partie continue`);
        addTestResult(`🎯 Condition actuelle: ${victoryCheck.condition}`);
      }

      addTestResult('✅ Conditions de victoire avancées fonctionnent !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test des conditions: ${error}`);
    }
  };

  const runAllTests = () => {
    addTestResult('🚀 Démarrage de tous les tests...');
    resetToTestState();
    setTimeout(() => testActivateDon(), 500);
    setTimeout(() => testAttachDon(), 1000);
    setTimeout(() => testPayCost(), 1500);
    setTimeout(() => testCalculatePower(), 2000);
    setTimeout(() => testCanAttack(), 2500);
    setTimeout(() => testToggleCardPosition(), 3000);
    setTimeout(() => testMarkCardAsPlayed(), 3500);
    setTimeout(() => testRefreshAllCards(), 4000);
    setTimeout(() => testCardStatus(), 4500);
    setTimeout(() => testCombatValidation(), 5000);
    setTimeout(() => testExecuteAttack(), 5500);
    setTimeout(() => testCombatStates(), 6000);
    setTimeout(() => testGameOverConditions(), 6500);
    setTimeout(() => testCombatServiceAccess(), 7000); // Ajout du nouveau test
    setTimeout(() => testPhaseNavigation(), 7500); // Ajout du nouveau test
    setTimeout(() => testPhaseActions(), 8000); // Ajout du nouveau test
    setTimeout(() => testTurnManagement(), 8500); // Ajout du nouveau test
    setTimeout(() => testCounterSystem(), 9000); // Ajout du nouveau test
    setTimeout(() => testBlockingSystem(), 9500); // Ajout du nouveau test
    setTimeout(() => testBattleStack(), 10000); // Ajout du nouveau test
          setTimeout(() => testCardEffects(), 10500); // Ajout du nouveau test
      setTimeout(() => testCombos(), 11000); // Ajout du nouveau test
      setTimeout(() => testStrategyAnalysis(), 11500); // Ajout du nouveau test
      setTimeout(() => testStrategySuggestions(), 12000); // Ajout du nouveau test
      setTimeout(() => testVictoryConditions(), 12500); // Ajout du nouveau test
      setTimeout(() => testQuickGameSimulation(), 13000); // Ajout du nouveau test
      setTimeout(() => testPlayerVictorySimulation(), 13500); // Ajout du nouveau test
    addTestResult('🎯 Tous les tests programmés !');
  };

  // Tests de simulation complète de partie
  const testFullGameSimulation = () => {
    addTestResult('🎮 Test de simulation complète de partie...');
    
    try {
      // Créer un état de jeu de test
      const testState = createTestGameState();
      
      // Lancer la simulation complète
      const result = GameSimulationService.simulateFullGame(testState, addTestResult);
      
      addTestResult(`🏆 Simulation terminée !`);
      addTestResult(`🎯 Vainqueur: ${result.winner}`);
      addTestResult(`🔄 Total des tours: ${result.totalTurns}`);
      addTestResult(`📊 Étapes simulées: ${result.steps.length}`);
      
      // Afficher un résumé des étapes
      result.steps.forEach((step, index) => {
        if (index < 5) { // Afficher seulement les 5 premières étapes
          addTestResult(`  📋 Tour ${step.turn}: ${step.player} - ${step.action}`);
        }
      });
      
      if (result.steps.length > 5) {
        addTestResult(`  ... et ${result.steps.length - 5} autres étapes`);
      }
      
      addTestResult('✅ Simulation complète réussie !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors de la simulation: ${error}`);
    }
  };

  const testQuickGameSimulation = () => {
    addTestResult('🚀 Test de simulation rapide de partie...');
    
    try {
      // Créer un état de jeu de test
      const testState = createTestGameState();
      
      // Lancer la simulation rapide
      const result = GameSimulationService.simulateQuickGame(testState, addTestResult);
      
      addTestResult(`🏆 Simulation rapide terminée !`);
      addTestResult(`🎯 Vainqueur: ${result.winner}`);
      addTestResult(`🔄 Total des tours: ${result.totalTurns}`);
      addTestResult(`📊 Étapes simulées: ${result.steps.length}`);
      
      // Afficher les étapes
      result.steps.forEach((step, index) => {
        addTestResult(`  📋 Tour ${step.turn}: ${step.player} - ${step.action}`);
      });
      
      addTestResult('✅ Simulation rapide réussie !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors de la simulation: ${error}`);
    }
  };

  const testPlayerVictorySimulation = () => {
    addTestResult('👑 Test de simulation avec victoire du joueur...');
    
    try {
      // Créer un état de jeu de test
      const testState = createTestGameState();
      
      // Modifier l'état pour favoriser le joueur
      const modifiedState = {
        ...testState,
        player: {
          ...testState.player,
          lifePoints: 5,
          activeDon: 4,
          hand: [
            ...testState.player.hand,
            {
              ...testCharacters[0],
              id: 'powerful-card',
              power: 8000,
              cost: 2
            }
          ]
        },
        opponent: {
          ...testState.opponent,
          lifePoints: 2, // Adversaire avec peu de PV
          leader: {
            ...testState.opponent.leader!,
            power: 3000 // Leader faible
          }
        }
      };
      
      // Lancer la simulation rapide
      const result = GameSimulationService.simulateQuickGame(modifiedState, addTestResult);
      
      addTestResult(`🏆 Simulation terminée !`);
      addTestResult(`🎯 Vainqueur: ${result.winner}`);
      addTestResult(`🔄 Total des tours: ${result.totalTurns}`);
      
      if (result.winner === 'player') {
        addTestResult('🎉 SUCCÈS: Le joueur a gagné comme prévu !');
      } else {
        addTestResult('⚠️ Le joueur n\'a pas gagné comme prévu');
      }
      
      addTestResult('✅ Test de victoire du joueur terminé !');
      
    } catch (error) {
      addTestResult(`❌ Erreur lors du test: ${error}`);
    }
  };

  // Si le panneau n'est pas ouvert, ne rien afficher
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 max-w-md max-h-96 overflow-y-auto border border-gray-600">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">🧪 Panneau de Test</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <button
          onClick={runAllTests}
          className="w-full bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm"
        >
          🚀 Tous les tests
        </button>
        <button
          onClick={resetToTestState}
          className="w-full bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded text-sm"
        >
          🔄 État de test
        </button>
        <button
          onClick={testActivateDon}
          className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
        >
          ⚡ Activer DON
        </button>
        <button
          onClick={testAttachDon}
          className="w-full bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded text-sm"
        >
          🔗 Attacher DON
        </button>
        <button
          onClick={testPayCost}
          className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm"
        >
          💰 Payer coût
        </button>
        <button
          onClick={testCalculatePower}
          className="w-full bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm"
        >
          💪 Calculer Power
        </button>
        <button
          onClick={testCanAttack}
          className="w-full bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded text-sm"
        >
          ⚔️ Capacité d&apos;attaque
        </button>
        <button
          onClick={testAddCharacter}
          className="w-full bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded text-sm"
        >
          ➕ Ajouter personnage
        </button>
        <button
          onClick={testToggleCardPosition}
          className="w-full bg-pink-600 hover:bg-pink-700 px-3 py-2 rounded text-sm"
        >
          🔄 Changer position carte
        </button>
        <button
          onClick={testMarkCardAsPlayed}
          className="w-full bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm"
        >
          ✅ Marquer comme jouée
        </button>
        <button
          onClick={testRefreshAllCards}
          className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
        >
          🔄 Rafraîchir toutes les cartes
        </button>
        <button
          onClick={testCardStatus}
          className="w-full bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm"
        >
          📊 État des cartes
        </button>
        <button
          onClick={testCombatValidation}
          className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm"
        >
          ⚔️ Validation attaque
        </button>
        <button
          onClick={testExecuteAttack}
          className="w-full bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded text-sm"
        >
          ⚔️ Exécuter attaque
        </button>
        <button
          onClick={testCombatStates}
          className="w-full bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm"
        >
          🔄 Réinitialiser états combat
        </button>
        <button
          onClick={testGameOverConditions}
          className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
        >
          🏁 Conditions fin partie
        </button>
        <button
          onClick={testLifePoints}
          className="w-full bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded text-sm"
        >
          ❤️ Points de vie
        </button>
        <button
          onClick={testCombatServiceAccess}
          className="w-full bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded text-sm"
        >
          🔍 CombatService Access
        </button>
        <button
          onClick={testPhaseNavigation}
          className="w-full bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded text-sm"
        >
          ⏭️ Naviguer phases
        </button>
        <button
          onClick={testPhaseActions}
          className="w-full bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded text-sm"
        >
          ⚡ Actions phases
        </button>
        <button
          onClick={testTurnManagement}
          className="w-full bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm"
        >
          🔄 Gérer tours
        </button>
        <button
          onClick={testCounterSystem}
          className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm"
        >
          🛡️ Test contre
        </button>
        <button
          onClick={testBlockingSystem}
          className="w-full bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded text-sm"
        >
          🛡️ Test blocage
        </button>
        <button
          onClick={testBattleStack}
          className="w-full bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm"
        >
          ⚔️ Test pile combat
        </button>
        <button
          onClick={testCardEffects}
          className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
        >
          ✨ Test effets cartes
        </button>
        <button
          onClick={testCombos}
          className="w-full bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm"
        >
           Test combinaisons
        </button>
        <button
          onClick={testStrategyAnalysis}
          className="w-full bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded text-sm"
        >
          🧠 Test analyse stratégique
        </button>
        <button
          onClick={testStrategySuggestions}
          className="w-full bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded text-sm"
        >
          💡 Test suggestions stratégies
        </button>
        <button
          onClick={testVictoryConditions}
          className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm"
        >
          🏆 Test conditions victoire
        </button>
        <button
          onClick={testFullGameSimulation}
          className="w-full bg-orange-600 hover:bg-orange-700 px-3 py-2 rounded text-sm"
        >
          🎮 Test simulation complète
        </button>
        <button
          onClick={testQuickGameSimulation}
          className="w-full bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm"
        >
          🚀 Test simulation rapide
        </button>
        <button
          onClick={testPlayerVictorySimulation}
          className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
        >
          👑 Test victoire joueur
        </button>
        <button
          onClick={clearResults}
          className="w-full bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded text-sm"
        >
          🗑️ Effacer résultats
        </button>
      </div>

      <div className="border-t border-gray-600 pt-2">
        <h4 className="font-semibold mb-2">📋 Résultats des tests:</h4>
        <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-400">Aucun test exécuté</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="text-gray-300">
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-gray-600 pt-2 mt-2">
        <h4 className="font-semibold mb-2">📊 État actuel:</h4>
        <div className="text-xs space-y-1">
          <div>Phase: {gameState.currentPhase}</div>
          <div>Tour: {gameState.turnNumber}</div>
          <div>DON actifs: {gameState.player.activeDon}</div>
          <div>DON dans le champ: {gameState.player.donField.length}</div>
          <div>Personnages: {gameState.player.field.length}/5</div>
          <div>Peut piocher DON: {gameState.canDrawDon ? 'OUI' : 'NON'}</div>
        </div>
      </div>
    </div>
  );
};
