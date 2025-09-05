import { GameState, GameCard } from '@/types/game';
import { CardEffectsService, ComboEffect } from './cardEffectsService';
import { CombatService } from './combatService';

export interface GameStrategy {
  id: string;
  name: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  winCondition: string;
  requiredCards: string[];
  execute: (gameState: GameState, playerId: 'player' | 'opponent') => GameState;
}

export interface StrategyAnalysis {
  strategy: GameStrategy;
  feasibility: number; // 0-100
  currentProgress: number; // 0-100
  missingCards: string[];
  nextSteps: string[];
}

export class StrategyService {
  /**
   * Analyse la situation actuelle du jeu
   */
  static analyzeGameState(gameState: GameState, playerId: 'player' | 'opponent'): {
    fieldStrength: number;
    handQuality: number;
    deckEfficiency: number;
    lifeAdvantage: number;
    overallScore: number;
  } {
    const player = gameState[playerId];
    const opponent = gameState[playerId === 'player' ? 'opponent' : 'player'];
    
    // Force du terrain
    const fieldStrength = this.calculateFieldStrength(player);
    
    // Qualité de la main
    const handQuality = this.calculateHandQuality(player);
    
    // Efficacité du deck
    const deckEfficiency = this.calculateDeckEfficiency(player);
    
    // Avantage en points de vie
    const lifeAdvantage = player.lifePoints - opponent.lifePoints;
    
    // Score global
    const overallScore = (fieldStrength + handQuality + deckEfficiency + lifeAdvantage) / 4;
    
    return {
      fieldStrength,
      handQuality,
      deckEfficiency,
      lifeAdvantage,
      overallScore
    };
  }

  /**
   * Calcule la force du terrain
   */
  private static calculateFieldStrength(player: any): number {
    let strength = 0;
    
    // Power des cartes du terrain
    strength += player.field.reduce((sum: number, card: GameCard) => sum + card.power, 0);
    
    // Bonus pour le Leader
    if (player.leader) {
      strength += player.leader.power * 1.5; // Leader compte plus
    }
    
    // Bonus pour les combinaisons
    const availableCombos = CardEffectsService.getAvailableCombos({ player, opponent: {} } as GameState, 'player');
    strength += availableCombos.length * 500;
    
    return Math.max(0, strength);
  }

  /**
   * Calcule la qualité de la main
   */
  private static calculateHandQuality(player: any): number {
    let quality = 0;
    
    // Bonus pour chaque carte
    quality += player.hand.length * 100;
    
    // Bonus pour les cartes de haute valeur
    const highValueCards = player.hand.filter((card: GameCard) => card.power > 3000);
    quality += highValueCards.length * 200;
    
    // Bonus pour les cartes avec des effets
    const effectCards = player.hand.filter((card: GameCard) => 
      card.hasCounter || card.hasBlocker || card.hasTrigger
    );
    quality += effectCards.length * 150;
    
    return Math.max(0, quality);
  }

  /**
   * Calcule l'efficacité du deck
   */
  private static calculateDeckEfficiency(player: any): number {
    let efficiency = 0;
    
    // Bonus pour un deck bien rempli
    efficiency += Math.min(100, player.deck.length * 2);
    
    // Bonus pour les DON disponibles
    efficiency += player.activeDon * 50;
    
    return Math.max(0, efficiency);
  }

  /**
   * Suggère des stratégies basées sur l'état actuel
   */
  static suggestStrategies(gameState: GameState, playerId: 'player' | 'opponent'): StrategyAnalysis[] {
    const strategies: GameStrategy[] = [
      {
        id: 'aggro-rush',
        name: 'Attaque Rapide',
        description: 'Attaquer rapidement pour réduire les points de vie',
        difficulty: 'EASY',
        winCondition: 'Réduire les points de vie à 0',
        requiredCards: ['high-power-character'],
        execute: (state, playerId) => this.executeAggroStrategy(state, playerId)
      },
      {
        id: 'control-combo',
        name: 'Contrôle et Combinaisons',
        description: 'Utiliser des combinaisons pour contrôler le jeu',
        difficulty: 'MEDIUM',
        winCondition: 'Maîtriser le terrain avec des combinaisons',
        requiredCards: ['combo-cards'],
        execute: (state, playerId) => this.executeControlStrategy(state, playerId)
      },
      {
        id: 'defensive-stall',
        name: 'Défense et Attente',
        description: 'Défendre et attendre le bon moment',
        difficulty: 'HARD',
        winCondition: 'Survivre jusqu\'à avoir une main parfaite',
        requiredCards: ['defensive-cards'],
        execute: (state, playerId) => this.executeDefensiveStrategy(state, playerId)
      }
    ];
    
    return strategies.map(strategy => this.analyzeStrategy(gameState, strategy, playerId));
  }

  /**
   * Analyse une stratégie spécifique
   */
  private static analyzeStrategy(
    gameState: GameState,
    strategy: GameStrategy,
    playerId: 'player' | 'opponent'
  ): StrategyAnalysis {
    const player = gameState[playerId];
    
    // Vérifier les cartes requises
    const missingCards = strategy.requiredCards.filter(requiredCard => {
      const hasCard = player.field.some(card => card.id === requiredCard) ||
                     player.hand.some(card => card.id === requiredCard) ||
                     (player.leader && player.leader.id === requiredCard);
      return !hasCard;
    });
    
    // Calculer la faisabilité
    const feasibility = Math.max(0, 100 - (missingCards.length * 25));
    
    // Calculer le progrès
    const currentProgress = Math.max(0, 100 - (missingCards.length * 20));
    
    // Déterminer les prochaines étapes
    const nextSteps = this.generateNextSteps(gameState, strategy, playerId, missingCards);
    
    return {
      strategy,
      feasibility,
      currentProgress,
      missingCards,
      nextSteps
    };
  }

  /**
   * Génère les prochaines étapes pour une stratégie
   */
  private static generateNextSteps(
    gameState: GameState,
    strategy: GameStrategy,
    playerId: 'player' | 'opponent',
    missingCards: string[]
  ): string[] {
    const steps: string[] = [];
    
    if (strategy.id === 'aggro-rush') {
      if (missingCards.length > 0) {
        steps.push('Piocher des cartes de haute puissance');
        steps.push('Jouer des personnages rapidement');
      } else {
        steps.push('Attaquer directement le Leader adverse');
        steps.push('Utiliser les DON pour augmenter le power');
      }
    } else if (strategy.id === 'control-combo') {
      if (missingCards.length > 0) {
        steps.push('Construire des combinaisons de cartes');
        steps.push('Attendre d\'avoir les bonnes cartes');
      } else {
        steps.push('Exécuter les combinaisons disponibles');
        steps.push('Contrôler le terrain avec des effets');
      }
    } else if (strategy.id === 'defensive-stall') {
      if (missingCards.length > 0) {
        steps.push('Construire une main défensive');
        steps.push('Éviter les attaques inutiles');
      } else {
        steps.push('Défendre avec des cartes de blocage');
        steps.push('Attendre le bon moment pour attaquer');
      }
    }
    
    return steps;
  }

  /**
   * Exécute la stratégie d'attaque rapide
   */
  private static executeAggroStrategy(gameState: GameState, playerId: 'player' | 'opponent'): GameState {
    console.log('⚔️ Exécution de la stratégie d\'attaque rapide');
    
    const player = gameState[playerId];
    let updatedState = gameState;
    
    // Attaquer avec toutes les cartes disponibles
    for (const card of player.field) {
      if (card.isActive && !card.hasAttacked) {
        // Chercher une cible
        const target = this.findBestTarget(updatedState, card, playerId);
        if (target) {
          try {
            updatedState = CombatService.executeAttack(updatedState, card.id, target.id, playerId);
          } catch (error) {
            console.log(`⚠️ Impossible d'attaquer avec ${card.name}:`, error);
          }
        }
      }
    }
    
    return updatedState;
  }

  /**
   * Exécute la stratégie de contrôle
   */
  private static executeControlStrategy(gameState: GameState, playerId: 'player' | 'opponent'): GameState {
    console.log('🎯 Exécution de la stratégie de contrôle');
    
    let updatedState = gameState;
    
    // Exécuter les combinaisons disponibles
    const availableCombos = CardEffectsService.getAvailableCombos(updatedState, playerId);
    
    for (const combo of availableCombos) {
      try {
        updatedState = CardEffectsService.executeCombo(updatedState, combo, playerId);
      } catch (error) {
        console.log(`⚠️ Impossible d'exécuter la combinaison ${combo.name}:`, error);
      }
    }
    
    return updatedState;
  }

  /**
   * Exécute la stratégie défensive
   */
  private static executeDefensiveStrategy(gameState: GameState, playerId: 'player' | 'opponent'): GameState {
    console.log('🛡️ Exécution de la stratégie défensive');
    
    // Pour l'instant, juste passer le tour
    // Dans une implémentation complète, on pourrait :
    // - Jouer des cartes de blocage
    // - Activer des effets défensifs
    // - Éviter les attaques risquées
    
    return gameState;
  }

  /**
   * Trouve la meilleure cible pour une attaque
   */
  private static findBestTarget(
    gameState: GameState,
    attacker: GameCard,
    playerId: 'player' | 'opponent'
  ): GameCard | null {
    const opponent = gameState[playerId === 'player' ? 'opponent' : 'player'];
    
    // Priorité 1: Leader (si l'attaquant peut le vaincre)
    if (opponent.leader && attacker.power >= opponent.leader.power) {
      return opponent.leader;
    }
    
    // Priorité 2: Characters faibles
    const weakCharacters = opponent.field.filter(card => 
      card.power < attacker.power && card.isActive
    );
    
    if (weakCharacters.length > 0) {
      // Choisir le plus faible
      return weakCharacters.reduce((weakest, current) => 
        current.power < weakest.power ? current : weakest
      );
    }
    
    // Priorité 3: Leader (même si on ne peut pas le vaincre)
    if (opponent.leader) {
      return opponent.leader;
    }
    
    return null;
  }

  /**
   * Évalue la position actuelle du joueur
   */
  static evaluatePosition(gameState: GameState, playerId: 'player' | 'opponent'): {
    position: 'WINNING' | 'LOSING' | 'EVEN';
    confidence: number;
    recommendations: string[];
  } {
    const analysis = this.analyzeGameState(gameState, playerId);
    const opponentAnalysis = this.analyzeGameState(gameState, playerId === 'player' ? 'opponent' : 'player');
    
    let position: 'WINNING' | 'LOSING' | 'EVEN';
    let confidence = 0;
    
    if (analysis.overallScore > opponentAnalysis.overallScore + 200) {
      position = 'WINNING';
      confidence = Math.min(100, (analysis.overallScore - opponentAnalysis.overallScore) / 10);
    } else if (analysis.overallScore < opponentAnalysis.overallScore - 200) {
      position = 'LOSING';
      confidence = Math.min(100, (opponentAnalysis.overallScore - analysis.overallScore) / 10);
    } else {
      position = 'EVEN';
      confidence = 50;
    }
    
    // Générer des recommandations
    const recommendations = this.generateRecommendations(analysis, position);
    
    return {
      position,
      confidence,
      recommendations
    };
  }

  /**
   * Génère des recommandations basées sur l'analyse
   */
  private static generateRecommendations(
    analysis: any,
    position: 'WINNING' | 'LOSING' | 'EVEN'
  ): string[] {
    const recommendations: string[] = [];
    
    if (position === 'WINNING') {
      if (analysis.fieldStrength < 5000) {
        recommendations.push('Renforcer votre terrain pour maintenir l\'avantage');
      }
      if (analysis.lifeAdvantage < 2) {
        recommendations.push('Protéger vos points de vie');
      }
    } else if (position === 'LOSING') {
      if (analysis.fieldStrength < 3000) {
        recommendations.push('Construire un terrain plus fort');
      }
      if (analysis.handQuality < 300) {
        recommendations.push('Améliorer la qualité de votre main');
      }
    } else {
      recommendations.push('Maintenir l\'équilibre et chercher des opportunités');
    }
    
    return recommendations;
  }
}
