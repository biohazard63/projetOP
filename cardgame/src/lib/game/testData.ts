import { GameCard, GameState } from '@/types/game';

// Créer des cartes de test pour les tests
export const createTestCharacter = (id: string, name: string, cost: number, power: number, color: string = 'RED'): GameCard => ({
  id,
  name,
  type: 'CHARACTER',
  color: color as GameCard['color'],
  cost,
  power,
  imageUrl: '/test.jpg',
  effect: '',
  trigger: '',
  isLeader: false,
  isDon: false,
  hasAttacked: false,
  hasRush: false,
  hasBlocker: false,
  hasDoubleAttack: false,
  hasTrigger: false,
  hasCounter: false,
  counterValue: 0,
  attachedDons: 0,
  attachedCards: [],
  isFaceUp: true,
  effects: [],
  isBlocking: false,
  isBlocked: false,
  blocker: undefined,
  isActive: true,
  canAttack: true,
  wasPlayedThisTurn: false,
  donAttachments: []
});

export const createTestDon = (id: string): GameCard => ({
  id,
  name: 'DON!!',
  type: 'DON',
  color: 'BLACK',
  cost: 0,
  power: 0,
  imageUrl: '/don.png',
  effect: 'DON!! Card',
  trigger: '',
  isLeader: false,
  isDon: true,
  hasAttacked: false,
  hasRush: false,
  hasBlocker: false,
  hasDoubleAttack: false,
  hasTrigger: false,
  hasCounter: false,
  counterValue: 0,
  attachedDons: 0,
  attachedCards: [],
  isFaceUp: false,
  effects: [],
  isBlocking: false,
  isBlocked: false,
  blocker: undefined,
  isActive: true,
  canAttack: false,
  wasPlayedThisTurn: false,
  donAttachments: []
});

// Données de test prédéfinies
export const testCharacters: GameCard[] = [
  {
    id: 'luffy-001',
    name: 'Monkey D. Luffy',
    type: 'CHARACTER' as const,
    color: 'RED' as const,
    cost: 4,
    power: 5000,
    imageUrl: '/images/luffy.jpg',
    effect: 'Rush - Peut attaquer le tour où il est joué',
    hasRush: true,
    counterValue: 1000, // Valeur de contre pour le blocage
    attachedDons: 0,
    donAttachments: [],
    canAttack: true,
    wasPlayedThisTurn: false,
    isActive: true,
    hasAttacked: false,
    isAttacking: false,
    isBlocking: false,
    isFaceUp: true
  },
  {
    id: 'zoro-002',
    name: 'Roronoa Zoro',
    type: 'CHARACTER' as const,
    color: 'GREEN' as const,
    cost: 3,
    power: 4000,
    imageUrl: '/images/zoro.jpg',
    effect: 'Blocker - Peut bloquer les attaques',
    hasBlocker: true,
    counterValue: 1500, // Valeur de contre pour le blocage
    attachedDons: 0,
    donAttachments: [],
    canAttack: true,
    wasPlayedThisTurn: false,
    isActive: true,
    hasAttacked: false,
    isAttacking: false,
    isBlocking: false,
    isFaceUp: true
  },
  {
    id: 'sanji-003',
    name: 'Vinsmoke Sanji',
    type: 'CHARACTER' as const,
    color: 'BLUE' as const,
    cost: 2,
    power: 3000,
    imageUrl: '/images/sanji.jpg',
    effect: 'Double Attack - Peut attaquer deux fois par tour',
    hasDoubleAttack: true,
    attachedDons: 0,
    donAttachments: [],
    canAttack: true,
    wasPlayedThisTurn: false,
    isActive: true,
    hasAttacked: false,
    isAttacking: false,
    isBlocking: false,
    isFaceUp: true
  },
  {
    id: 'nami-004',
    name: 'Nami',
    type: 'CHARACTER' as const,
    color: 'YELLOW' as const,
    cost: 2,
    power: 2500,
    imageUrl: '/images/nami.jpg',
    effect: 'Trigger - Effet spécial lors de la pioche',
    hasTrigger: true,
    attachedDons: 0,
    donAttachments: [],
    canAttack: true,
    wasPlayedThisTurn: false,
    isActive: true,
    hasAttacked: false,
    isAttacking: false,
    isBlocking: false,
    isFaceUp: true
  },
  {
    id: 'usopp-005',
    name: 'Usopp',
    type: 'CHARACTER' as const,
    color: 'GREEN' as const,
    cost: 1,
    power: 2000,
    imageUrl: '/images/usopp.jpg',
    effect: 'Counter - Peut contrer les attaques',
    hasCounter: true,
    counterValue: 2000,
    attachedDons: 0,
    donAttachments: [],
    canAttack: true,
    wasPlayedThisTurn: false,
    isActive: true,
    hasAttacked: false,
    isAttacking: false,
    isBlocking: false,
    isFaceUp: true
  },
  {
    id: 'chopper-006',
    name: 'Tony Tony Chopper',
    type: 'CHARACTER' as const,
    color: 'BLUE' as const,
    cost: 3,
    power: 3500,
    imageUrl: '/images/chopper.jpg',
    effect: 'Blocker - Peut bloquer les attaques',
    hasBlocker: true,
    attachedDons: 0,
    donAttachments: [],
    canAttack: true,
    wasPlayedThisTurn: false,
    isActive: true,
    hasAttacked: false,
    isAttacking: false,
    isBlocking: false,
    isFaceUp: true
  },
  {
    id: 'robin-007',
    name: 'Nico Robin',
    type: 'CHARACTER' as const,
    color: 'PURPLE' as const,
    cost: 3,
    power: 3500,
    imageUrl: '/images/robin.jpg',
    effect: 'Blocker - Peut bloquer les attaques',
    hasBlocker: true,
    attachedDons: 0,
    donAttachments: [],
    canAttack: true,
    wasPlayedThisTurn: false,
    isActive: true,
    hasAttacked: false,
    isAttacking: false,
    isBlocking: false,
    isFaceUp: true
  },
  {
    id: 'franky-008',
    name: 'Franky',
    type: 'CHARACTER' as const,
    color: 'RED' as const,
    cost: 4,
    power: 4500,
    imageUrl: '/images/franky.jpg',
    effect: 'Rush - Peut attaquer le tour où il est joué',
    hasRush: true,
    attachedDons: 0,
    donAttachments: [],
    canAttack: true,
    wasPlayedThisTurn: false,
    isActive: true,
    hasAttacked: false,
    isAttacking: false,
    isBlocking: false,
    isFaceUp: true
  },
  {
    id: 'brook-009',
    name: 'Brook',
    type: 'CHARACTER' as const,
    color: 'YELLOW' as const,
    cost: 2,
    power: 2800,
    imageUrl: '/images/brook.jpg',
    effect: 'Counter - Peut contrer les attaques',
    hasCounter: true,
    counterValue: 1500,
    attachedDons: 0,
    donAttachments: [],
    canAttack: true,
    wasPlayedThisTurn: false,
    isActive: true,
    hasAttacked: false,
    isAttacking: false,
    isBlocking: false,
    isFaceUp: true
  },
  {
    id: 'jinbe-010',
    name: 'Jinbe',
    type: 'CHARACTER' as const,
    color: 'BLUE' as const,
    cost: 5,
    power: 6000,
    imageUrl: '/images/jinbe.jpg',
    effect: 'Blocker - Peut bloquer les attaques',
    hasBlocker: true,
    attachedDons: 0,
    donAttachments: [],
    canAttack: true,
    wasPlayedThisTurn: false,
    isActive: true,
    hasAttacked: false,
    isAttacking: false,
    isBlocking: false,
    isFaceUp: true
  }
];

export const testDons = Array.from({ length: 10 }, (_, i) => createTestDon(`don_${i + 1}`));

// Cartes événement pour tester les blocages
export const testEvents: GameCard[] = [
  {
    id: 'counter-001',
    name: 'Counter Attack',
    type: 'EVENT' as const,
    color: 'BLUE' as const,
    cost: 0,
    power: 0,
    imageUrl: '/images/counter.jpg',
    effect: 'Counter - Bloque une attaque',
    hasCounter: true,
    counterValue: 2000,
    attachedDons: 0,
    donAttachments: [],
    canAttack: false,
    wasPlayedThisTurn: false,
    isActive: false,
    hasAttacked: false,
    isAttacking: false,
    isBlocking: false,
    isFaceUp: true
  },
  {
    id: 'counter-002',
    name: 'Defensive Stance',
    type: 'EVENT' as const,
    color: 'GREEN' as const,
    cost: 0,
    power: 0,
    imageUrl: '/images/defense.jpg',
    effect: 'Counter - Bloque une attaque et renforce le Leader',
    hasCounter: true,
    counterValue: 1500,
    attachedDons: 0,
    donAttachments: [],
    canAttack: false,
    wasPlayedThisTurn: false,
    isActive: false,
    hasAttacked: false,
    isAttacking: false,
    isBlocking: false,
    isFaceUp: true
  }
];

// Fonction utilitaire pour créer un deck de test varié
const createTestDeck = (size: number = 15): GameCard[] => {
  const deck: GameCard[] = [];
  
  // Ajouter toutes les cartes uniques d'abord
  deck.push(...testCharacters);
  
  // Ajouter des duplications pour atteindre la taille souhaitée
  while (deck.length < size) {
    const randomIndex = Math.floor(Math.random() * testCharacters.length);
    deck.push({ ...testCharacters[randomIndex], id: `${testCharacters[randomIndex].id}_copy_${deck.length}` });
  }
  
  // Mélanger le deck
  return deck.sort(() => Math.random() - 0.5);
};

// Fonction utilitaire pour créer une main initiale variée
const createTestHand = (size: number = 5): GameCard[] => {
  const hand: GameCard[] = [];
  
  // Mélanger les personnages et événements
  const shuffledCharacters = [...testCharacters].sort(() => Math.random() - 0.5);
  const shuffledEvents = [...testEvents].sort(() => Math.random() - 0.5);
  
  // Ajouter des personnages (70% de la main)
  const characterCount = Math.floor(size * 0.7);
  for (let i = 0; i < Math.min(characterCount, shuffledCharacters.length); i++) {
    hand.push({ ...shuffledCharacters[i], id: `${shuffledCharacters[i].id}_hand_${i}` });
  }
  
  // Ajouter des événements (30% de la main)
  const eventCount = size - characterCount;
  for (let i = 0; i < Math.min(eventCount, shuffledEvents.length); i++) {
    hand.push({ ...shuffledEvents[i], id: `${shuffledEvents[i].id}_hand_${i}` });
  }
  
  // Mélanger la main finale
  return hand.sort(() => Math.random() - 0.5);
};

// Créer un état de jeu de test complet
export const createTestGameState = (): GameState => ({
  id: 'test_game',
  player: {
    id: 'player',
    name: 'Joueur Test',
    lifePoints: 5,
    deck: createTestDeck(20), // 20 cartes dans le deck (plus variées)
    hand: createTestHand(5), // 5 cartes en main (variées)
    field: [], // Pas de cartes sur le terrain au début
    leader: {
      id: 'leader_1',
      name: 'Leader Test',
      type: 'LEADER' as const,
      color: 'RED' as const,
      cost: 0,
      power: 5000,
      imageUrl: '/test.jpg',
      isFaceUp: true,
      isActive: true,
      canAttack: true,
      hasAttacked: false,
      isAttacking: false,
      isBlocking: false,
      hasBlocker: false,
      hasRush: false,
      hasDoubleAttack: false,
      wasPlayedThisTurn: false,
      lastAttackTurn: 0,
      donAttachments: []
    },
    activeDon: 0,
    donDeck: [...testDons], // 10 DON dans le deck DON
    usedDonDeck: [],
    discardPile: [],
    donAddedThisTurn: false,
    donField: [],
    trash: [],
    donAttachments: []
  },
  opponent: {
    id: 'opponent',
    name: 'Adversaire Test',
    lifePoints: 5,
    deck: createTestDeck(18), // 18 cartes dans le deck (plus variées)
    hand: createTestHand(5), // 5 cartes en main (variées)
    field: [],
    leader: {
      id: 'leader_2',
      name: 'Leader Adversaire',
      type: 'LEADER' as const,
      color: 'BLUE' as const,
      cost: 0,
      power: 5000,
      imageUrl: '/test.jpg',
      isFaceUp: true,
      isActive: true,
      canAttack: true,
      hasAttacked: false,
      isAttacking: false,
      isBlocking: false,
      hasBlocker: false,
      hasRush: false,
      hasDoubleAttack: false,
      wasPlayedThisTurn: false,
      lastAttackTurn: 0,
      donAttachments: []
    },
    activeDon: 0,
    donDeck: [...testDons], // 10 DON dans le deck DON
    usedDonDeck: [],
    discardPile: [],
    donAddedThisTurn: false,
    donField: [],
    trash: [],
    donAttachments: []
  },
  currentPhase: 'START',
  currentPlayer: 'player',
  setupPhase: 'COMPLETE',
  hasKeptHand: true,
  canDrawDon: true,
  battleStack: [],
  turnNumber: 1, // Commencer au tour 1
  isFirstTurn: true
});
