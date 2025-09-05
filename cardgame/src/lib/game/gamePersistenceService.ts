import { prisma } from '@/lib/prisma';
import { GameState, GameCard } from '@/types/game';

export class GamePersistenceService {
  /**
   * Sauvegarde un état de jeu en base de données
   */
  static async saveGameState(gameState: GameState, playerId: string, opponentId: string): Promise<string> {
    try {
      // Convertir les cartes en format JSON pour le stockage
      const playerLeaderJson = this.convertCardToJson(gameState.player.leader);
      const opponentLeaderJson = this.convertCardToJson(gameState.opponent.leader);
      
      const playerDeckJson = gameState.player.deck.map(card => this.convertCardToJson(card));
      const playerHandJson = gameState.player.hand.map(card => this.convertCardToJson(card));
      const playerFieldJson = gameState.player.field.map(card => this.convertCardToJson(card));
      const playerDonDeckJson = gameState.player.donDeck.map(card => this.convertCardToJson(card));
      const playerDonFieldJson = gameState.player.donField.map(card => this.convertCardToJson(card));
      const playerUsedDonDeckJson = gameState.player.usedDonDeck.map(card => this.convertCardToJson(card));
      const playerTrashJson = gameState.player.trash.map(card => this.convertCardToJson(card));
      const playerDiscardPileJson = gameState.player.discardPile.map(card => this.convertCardToJson(card));
      
      const opponentDeckJson = gameState.opponent.deck.map(card => this.convertCardToJson(card));
      const opponentHandJson = gameState.opponent.hand.map(card => this.convertCardToJson(card));
      const opponentFieldJson = gameState.opponent.field.map(card => this.convertCardToJson(card));
      const opponentDonDeckJson = gameState.opponent.donDeck.map(card => this.convertCardToJson(card));
      const opponentDonFieldJson = gameState.opponent.donField.map(card => this.convertCardToJson(card));
      const opponentUsedDonDeckJson = gameState.opponent.usedDonDeck.map(card => this.convertCardToJson(card));
      const opponentTrashJson = gameState.opponent.trash.map(card => this.convertCardToJson(card));
      const opponentDiscardPileJson = gameState.opponent.discardPile.map(card => this.convertCardToJson(card));

      // Créer ou mettre à jour l'état du jeu
      const savedGameState = await prisma.gameState.upsert({
        where: {
          id: gameState.id
        },
        update: {
          currentPhase: gameState.currentPhase,
          currentPlayer: gameState.currentPlayer,
          turnNumber: gameState.turnNumber,
          winner: gameState.winner,
          gameOver: gameState.gameOver,
          isFirstTurn: gameState.isFirstTurn,
          canPlayCard: gameState.canPlayCard || false,
          canAttack: gameState.canAttack || false,
          canEndTurn: gameState.canEndTurn || false,
          hasKeptHand: gameState.hasKeptHand,
          playerLife: gameState.player.lifePoints,
          playerLeader: playerLeaderJson,
          playerDeck: playerDeckJson,
          playerHand: playerHandJson,
          playerField: playerFieldJson,
          playerDonDeck: playerDonDeckJson,
          playerDonField: playerDonFieldJson,
          playerUsedDonDeck: playerUsedDonDeckJson,
          playerTrash: playerTrashJson,
          playerActiveDon: gameState.player.activeDon || 0,
          playerDonAddedThisTurn: gameState.player.donAddedThisTurn,
          playerDiscardPile: playerDiscardPileJson,
          opponentLife: gameState.opponent.lifePoints,
          opponentLeader: opponentLeaderJson,
          opponentDeck: opponentDeckJson,
          opponentHand: opponentHandJson,
          opponentField: opponentFieldJson,
          opponentDonDeck: opponentDonDeckJson,
          opponentDonField: opponentDonFieldJson,
          opponentUsedDonDeck: opponentUsedDonDeckJson,
          opponentTrash: opponentTrashJson,
          opponentActiveDon: gameState.opponent.activeDon || 0,
          opponentDonAddedThisTurn: gameState.opponent.donAddedThisTurn,
          opponentDiscardPile: opponentDiscardPileJson,
          updatedAt: new Date()
        },
        create: {
          id: gameState.id,
          playerId,
          opponentId,
          currentPhase: gameState.currentPhase,
          currentPlayer: gameState.currentPlayer,
          turnNumber: gameState.turnNumber,
          winner: gameState.winner,
          gameOver: gameState.gameOver,
          isFirstTurn: gameState.isFirstTurn,
          canPlayCard: gameState.canPlayCard || false,
          canAttack: gameState.canAttack || false,
          canEndTurn: gameState.canEndTurn || false,
          hasKeptHand: gameState.hasKeptHand,
          playerLife: gameState.player.lifePoints,
          playerLeader: playerLeaderJson,
          playerDeck: playerDeckJson,
          playerHand: playerHandJson,
          playerField: playerFieldJson,
          playerDonDeck: playerDonDeckJson,
          playerDonField: playerDonFieldJson,
          playerUsedDonDeck: playerUsedDonDeckJson,
          playerTrash: playerTrashJson,
          playerActiveDon: gameState.player.activeDon || 0,
          playerDonAddedThisTurn: gameState.player.donAddedThisTurn,
          playerDiscardPile: playerDiscardPileJson,
          opponentLife: gameState.opponent.lifePoints,
          opponentLeader: opponentLeaderJson,
          opponentDeck: opponentDeckJson,
          opponentHand: opponentHandJson,
          opponentField: opponentFieldJson,
          opponentDonDeck: opponentDonDeckJson,
          opponentDonField: opponentDonFieldJson,
          opponentUsedDonDeck: opponentUsedDonDeckJson,
          opponentTrash: opponentTrashJson,
          opponentActiveDon: gameState.opponent.activeDon || 0,
          opponentDonAddedThisTurn: gameState.opponent.donAddedThisTurn,
          opponentDiscardPile: opponentDiscardPileJson
        }
      });

      return savedGameState.id;
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde de l\'état du jeu:', error);
      throw new Error('Impossible de sauvegarder l\'état du jeu');
    }
  }

  /**
   * Récupère un état de jeu depuis la base de données
   */
  static async loadGameState(gameId: string): Promise<GameState | null> {
    try {
      const dbGameState = await prisma.gameState.findUnique({
        where: { id: gameId }
      });

      if (!dbGameState) {
        return null;
      }

      // Convertir le JSON en GameState
      return this.convertJsonToGameState(dbGameState);
    } catch (error) {
      console.error('❌ Erreur lors du chargement de l\'état du jeu:', error);
      throw new Error('Impossible de charger l\'état du jeu');
    }
  }

  /**
   * Récupère l'état de jeu actif d'un utilisateur
   */
  static async getActiveGameState(userId: string): Promise<GameState | null> {
    try {
      const dbGameState = await prisma.gameState.findFirst({
        where: {
          OR: [
            { playerId: userId },
            { opponentId: userId }
          ],
          isActive: true
        }
      });

      if (!dbGameState) {
        return null;
      }

      return this.convertJsonToGameState(dbGameState);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'état de jeu actif:', error);
      throw new Error('Impossible de récupérer l\'état de jeu actif');
    }
  }

  /**
   * Marque un état de jeu comme inactif (fin de partie)
   */
  static async deactivateGameState(gameId: string): Promise<void> {
    try {
      await prisma.gameState.update({
        where: { id: gameId },
        data: { isActive: false }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la désactivation de l\'état du jeu:', error);
      throw new Error('Impossible de désactiver l\'état du jeu');
    }
  }

  /**
   * Convertit une carte en format JSON pour le stockage
   */
  private static convertCardToJson(card: GameCard | null): any {
    if (!card) return null;
    
    return {
      id: card.id,
      name: card.name,
      type: card.type,
      color: card.color,
      cost: card.cost,
      power: card.power,
      imageUrl: card.imageUrl,
      effect: card.effect,
      trigger: card.trigger,
      isLeader: card.isLeader,
      isDon: card.isDon,
      hasAttacked: card.hasAttacked,
      hasRush: card.hasRush,
      hasBlocker: card.hasBlocker,
      hasDoubleAttack: card.hasDoubleAttack,
      hasTrigger: card.hasTrigger,
      hasCounter: card.hasCounter,
      counterValue: card.counterValue,
      attachedDons: card.attachedDons,
      donAttachments: card.donAttachments,
      isFaceUp: card.isFaceUp,
      isActive: card.isActive,
      canAttack: card.canAttack,
      wasPlayedThisTurn: card.wasPlayedThisTurn,
      isAttacking: card.isAttacking,
      isBlocking: card.isBlocking,
      isBlocked: card.isBlocked,
      blocker: card.blocker ? this.convertCardToJson(card.blocker) : undefined
    };
  }

  /**
   * Convertit le JSON de la base de données en GameState
   */
  private static convertJsonToGameState(dbGameState: any): GameState {
    const convertJsonToCard = (jsonCard: any): GameCard => ({
      id: jsonCard.id,
      name: jsonCard.name,
      type: jsonCard.type,
      color: jsonCard.color,
      cost: jsonCard.cost,
      power: jsonCard.power,
      imageUrl: jsonCard.imageUrl,
      effect: jsonCard.effect,
      trigger: jsonCard.trigger,
      isLeader: jsonCard.isLeader,
      isDon: jsonCard.isDon,
      hasAttacked: jsonCard.hasAttacked,
      hasRush: jsonCard.hasRush,
      hasBlocker: jsonCard.hasBlocker,
      hasDoubleAttack: jsonCard.hasDoubleAttack,
      hasTrigger: jsonCard.hasTrigger,
      hasCounter: jsonCard.hasCounter,
      counterValue: jsonCard.counterValue,
      attachedDons: jsonCard.attachedDons,
      donAttachments: jsonCard.donAttachments,
      isFaceUp: jsonCard.isFaceUp,
      isActive: jsonCard.isActive,
      canAttack: jsonCard.canAttack,
      wasPlayedThisTurn: jsonCard.wasPlayedThisTurn,
      isAttacking: jsonCard.isAttacking,
      isBlocking: jsonCard.isBlocking,
      isBlocked: jsonCard.isBlocked,
      blocker: jsonCard.blocker ? convertJsonToCard(jsonCard.blocker) : undefined
    });

    const convertJsonArrayToCards = (jsonArray: any[]): GameCard[] => {
      return Array.isArray(jsonArray) ? jsonArray.map(convertJsonToCard) : [];
    };

    return {
      id: dbGameState.id,
      player: {
        id: 'player',
        name: 'Joueur',
        lifePoints: dbGameState.playerLife,
        deck: convertJsonArrayToCards(dbGameState.playerDeck),
        hand: convertJsonArrayToCards(dbGameState.playerHand),
        field: convertJsonArrayToCards(dbGameState.playerField),
        leader: dbGameState.playerLeader ? convertJsonToCard(dbGameState.playerLeader) : null,
        activeDon: dbGameState.playerActiveDon,
        donDeck: convertJsonArrayToCards(dbGameState.playerDonDeck),
        usedDonDeck: convertJsonArrayToCards(dbGameState.playerUsedDonDeck),
        discardPile: convertJsonArrayToCards(dbGameState.playerDiscardPile),
        donAddedThisTurn: dbGameState.playerDonAddedThisTurn,
        donField: convertJsonArrayToCards(dbGameState.playerDonField),
        trash: convertJsonArrayToCards(dbGameState.playerTrash),
        donAttachments: []
      },
      opponent: {
        id: 'opponent',
        name: 'Adversaire',
        lifePoints: dbGameState.opponentLife,
        deck: convertJsonArrayToCards(dbGameState.opponentDeck),
        hand: convertJsonArrayToCards(dbGameState.opponentHand),
        field: convertJsonArrayToCards(dbGameState.opponentField),
        leader: dbGameState.opponentLeader ? convertJsonToCard(dbGameState.opponentLeader) : null,
        activeDon: dbGameState.opponentActiveDon,
        donDeck: convertJsonArrayToCards(dbGameState.opponentDonDeck),
        usedDonDeck: convertJsonArrayToCards(dbGameState.opponentUsedDonDeck),
        discardPile: convertJsonArrayToCards(dbGameState.opponentDiscardPile),
        donAddedThisTurn: dbGameState.opponentDonAddedThisTurn,
        donField: convertJsonArrayToCards(dbGameState.opponentDonField),
        trash: convertJsonArrayToCards(dbGameState.opponentTrash),
        donAttachments: []
      },
      currentPhase: dbGameState.currentPhase,
      currentPlayer: dbGameState.currentPlayer,
      setupPhase: 'COMPLETE', // Par défaut
      hasKeptHand: dbGameState.hasKeptHand,
      canDrawDon: true, // À gérer selon la logique du jeu
      battleStack: [],
      turnNumber: dbGameState.turnNumber,
      isFirstTurn: false // Par défaut, pas le premier tour
    };
  }
}
