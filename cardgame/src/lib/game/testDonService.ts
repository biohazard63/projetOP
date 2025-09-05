import { DonService } from './donService';
import { GameState, GameCard } from '@/types/game';

// Créer un état de jeu de test
const createTestGameState = (): GameState => ({
  id: 'test_game',
  player: {
    id: 'player',
    name: 'Joueur Test',
    lifePoints: 5,
    deck: [],
    hand: [],
    field: [],
    leader: {
      id: 'leader_1',
      name: 'Leader Test',
      type: 'LEADER',
      color: 'RED',
      cost: 0,
      power: 5000,
      imageUrl: '/test.jpg',
      isLeader: true,
      isActive: true,
      canAttack: true,
      wasPlayedThisTurn: false,
      attachedDons: 0,
      donAttachments: []
    },
    activeDon: 0,
    donDeck: [
      { id: 'don_1', name: 'DON!!', type: 'DON', color: 'BLACK', cost: 0, power: 0, imageUrl: '/don.png', isDon: true, isActive: true, canAttack: false, wasPlayedThisTurn: false, attachedDons: 0, donAttachments: [] },
      { id: 'don_2', name: 'DON!!', type: 'DON', color: 'BLACK', cost: 0, power: 0, imageUrl: '/don.png', isDon: true, isActive: true, canAttack: false, wasPlayedThisTurn: false, attachedDons: 0, donAttachments: [] },
      { id: 'don_3', name: 'DON!!', type: 'DON', color: 'BLACK', cost: 0, power: 0, imageUrl: '/don.png', isDon: true, isActive: true, canAttack: false, wasPlayedThisTurn: false, attachedDons: 0, donAttachments: [] },
      { id: 'don_4', name: 'DON!!', type: 'DON', color: 'BLACK', cost: 0, power: 0, imageUrl: '/don.png', isDon: true, isActive: true, canAttack: false, wasPlayedThisTurn: false, attachedDons: 0, donAttachments: [] },
      { id: 'don_5', name: 'DON!!', type: 'DON', color: 'BLACK', cost: 0, power: 0, imageUrl: '/don.png', isDon: true, isActive: true, canAttack: false, wasPlayedThisTurn: false, attachedDons: 0, donAttachments: [] },
    ],
    usedDonDeck: [],
    discardPile: [],
    trash: [],
    donAddedThisTurn: false,
    donField: [],
    donAttachments: []
  },
  opponent: {
    id: 'opponent',
    name: 'Adversaire Test',
    lifePoints: 5,
    deck: [],
    hand: [],
    field: [],
    leader: {
      id: 'leader_2',
      name: 'Leader Adversaire',
      type: 'LEADER',
      color: 'BLUE',
      cost: 0,
      power: 5000,
      imageUrl: '/test.jpg',
      isLeader: true,
      isActive: true,
      canAttack: true,
      wasPlayedThisTurn: false,
      attachedDons: 0,
      donAttachments: []
    },
    activeDon: 0,
    donDeck: [],
    usedDonDeck: [],
    discardPile: [],
    trash: [],
    donAddedThisTurn: false,
    donField: [],
    donAttachments: []
  },
  currentPhase: 'START',
  currentPlayer: 'player',
  setupPhase: 'COMPLETE',
  hasKeptHand: true,
  turnNumber: 2,
  winner: undefined,
  canPlayCard: false,
  canAttack: false,
  canEndTurn: false,
  gameOver: false,
  isFirstTurn: false,
  canDrawDon: true,
  battleStack: []
});

// Tests du service DON
export const testDonService = () => {
  console.log('🧪 Début des tests du service DON');
  
  try {
    // Test 1: Activation des DON
    console.log('\n📋 Test 1: Activation des DON');
    let gameState = createTestGameState();
    console.log('État initial - DON dans le deck:', gameState.player.donDeck.length);
    console.log('État initial - DON actifs:', gameState.player.activeDon);
    
    gameState = DonService.activateDon(gameState, 'player');
    console.log('Après activation - DON dans le deck:', gameState.player.donDeck.length);
    console.log('Après activation - DON actifs:', gameState.player.activeDon);
    console.log('Après activation - DON dans le champ:', gameState.player.donField.length);
    console.log('Après activation - canDrawDon:', gameState.canDrawDon);
    
    // Test 2: Attachement d'un DON
    console.log('\n📋 Test 2: Attachement d\'un DON');
    const characterCard: GameCard = {
      id: 'char_1',
      name: 'Personnage Test',
      type: 'CHARACTER',
      color: 'RED',
      cost: 3,
      power: 3000,
      imageUrl: '/test.jpg',
      isActive: true,
      canAttack: true,
      wasPlayedThisTurn: false,
      attachedDons: 0,
      donAttachments: []
    };
    
    gameState.player.field = [characterCard];
    console.log('Avant attachement - DON attachés au personnage:', characterCard.attachedDons);
    console.log('Avant attachement - DON actifs:', gameState.player.activeDon);
    
    gameState = DonService.attachDon(gameState, 'player', 'don_1', 'char_1');
    const updatedCharacter = gameState.player.field.find(c => c.id === 'char_1');
    console.log('Après attachement - DON attachés au personnage:', updatedCharacter?.attachedDons);
    console.log('Après attachement - DON actifs:', gameState.player.activeDon);
    console.log('Après attachement - DON dans le champ:', gameState.player.donField.length);
    
    // Test 3: Calcul du power total
    console.log('\n📋 Test 3: Calcul du power total');
    if (updatedCharacter) {
      const totalPower = DonService.calculateTotalPower(updatedCharacter);
      console.log('Power de base:', updatedCharacter.power);
      console.log('DON attachés:', updatedCharacter.attachedDons);
      console.log('Power total:', totalPower);
    }
    
    // Test 4: Vérification de la capacité d'attaque
    console.log('\n📋 Test 4: Vérification de la capacité d\'attaque');
    const canAttackLeader = DonService.canCardAttack(gameState.player.leader!, true);
    const canAttackCharacter = DonService.canCardAttack(updatedCharacter!, true);
    console.log('Leader peut attaquer:', canAttackLeader);
    console.log('Personnage peut attaquer:', canAttackCharacter);
    
    // Test 5: Paiement d'un coût
    console.log('\n�� Test 5: Paiement d\'un coût');
    console.log('Avant paiement - DON actifs:', gameState.player.activeDon);
    gameState = DonService.payCost(gameState, 'player', 2);
    console.log('Après paiement d\'un coût de 2 - DON actifs:', gameState.player.activeDon);
    
    console.log('\n✅ Tous les tests du service DON ont réussi !');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  }
};

// Exporter pour utilisation dans la console du navigateur
if (typeof window !== 'undefined') {
  (window as any).testDonService = testDonService;
}
