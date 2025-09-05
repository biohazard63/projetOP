export type CardType = 'LEADER' | 'CHARACTER' | 'EVENT' | 'STAGE' | 'DON';
export type CardColor = 'RED' | 'BLUE' | 'GREEN' | 'BLACK' | 'PURPLE' | 'YELLOW';
export type CardPosition = 'ACTIVE' | 'RESTED';
export type GamePhase = 'SETUP' | 'START' | 'DRAW' | 'MAIN' | 'BATTLE' | 'END';
export type SetupPhase = 'CHOOSE_FIRST' | 'CHOOSE_LEADER' | 'SET_LIFE' | 'SET_DON' | 'DRAW_STARTING' | 'MULLIGAN' | 'READY';
export type CardEffectType = 'ON_PLAY' | 'ON_ATTACK' | 'ON_DEFEND' | 'ON_DISCARD' | 'ON_DRAW' | 'TRIGGER';
export type CardEffectTiming = 'IMMEDIATE' | 'RESPONSE' | 'END_TURN' | 'START_TURN';

// Nouveaux types pour le système de DON
export type DonState = 'ACTIVE' | 'ATTACHED' | 'USED';
export type DonAttachment = {
  donId: string;
  attachedTo: string; // ID de la carte à laquelle le DON est attaché
  state: DonState;
};

export interface GameCard {
  id: string;
  name: string;
  type: CardType;
  color: CardColor;
  cost: number;
  power: number;
  imageUrl: string;
  effect?: string;
  trigger?: string;
  isLeader?: boolean;
  isDon?: boolean;
  position?: CardPosition;
  hasAttacked?: boolean;
  hasRush?: boolean;
  hasBlocker?: boolean;
  hasDoubleAttack?: boolean;
  hasTrigger?: boolean;
  hasCounter?: boolean;
  counterValue?: number;
  attachedDons?: number;
  attachedCards?: GameCard[];
  isFaceUp?: boolean;
  effects?: CardEffect[];
  isBlocking?: boolean;
  isBlocked?: boolean;
  blocker?: GameCard;
  
  // Nouveaux champs pour le système de DON
  donAttachments?: DonAttachment[];
  canAttack?: boolean; // Pour Summoning Sickness
  wasPlayedThisTurn?: boolean; // Pour Summoning Sickness
  isActive?: boolean; // true = Active, false = Rested
  
  // Nouveaux champs pour le système de combat
  attackTarget?: string; // ID de la cible de l'attaque
  isAttacking?: boolean; // Si la carte est en train d'attaquer
  lastAttackTurn?: number; // Tour de la dernière attaque
}

export interface Player {
  id: string;
  name: string;
  lifePoints: number;
  leader: GameCard | null;
  deck: GameCard[];
  hand: GameCard[];
  field: GameCard[];
  donDeck: GameCard[];
  activeDon: number; // DON disponibles pour payer des coûts
  usedDonDeck: GameCard[];
  discardPile: GameCard[];
  trash: GameCard[];
  donAddedThisTurn: boolean; // Changé de number à boolean
  
  // Nouveaux champs pour le système de DON
  donField: GameCard[]; // DON disponibles (Active + Attached)
  donAttachments: DonAttachment[]; // Suivi des attachements
}

export interface PlayerState {
  id: string;
  name: string;
  lifePoints: number;
  deck: GameCard[];
  hand: GameCard[];
  field: GameCard[];
  donZone: GameCard[];
  trash: GameCard[];
  leader?: GameCard;
  activeDon: number;
  life: GameCard[];
  stage?: GameCard;
  hasMulliganed?: boolean;
  donAddedThisTurn: boolean; // Changé de number à boolean
  
  // Nouveaux champs pour le système de DON
  donField: GameCard[];
  donAttachments: DonAttachment[];
}

export interface GameState {
  id: string;
  player: Player;
  opponent: Player;
  currentPhase: GamePhase;
  currentPlayer: 'player' | 'opponent';
  setupPhase: 'CHOOSE_FIRST' | 'CHOOSE_LEADER' | 'SET_LIFE' | 'SET_DON' | 'DRAW_STARTING' | 'MULLIGAN' | 'KEEP_HAND' | 'READY' | 'COMPLETE';
  hasKeptHand: boolean;
  canDrawDon: boolean;
  battleStack: BattleStackItem[];
  turnNumber: number; // Numéro du tour actuel
  isFirstTurn: boolean; // Si c'est le premier tour de la partie
  gameOver?: boolean; // Si la partie est terminée
  winner?: 'player' | 'opponent'; // Qui a gagné
  canEndTurn?: boolean; // Si le joueur peut terminer son tour
  canPlayCard?: boolean; // Si le joueur peut jouer une carte
  canAttack?: boolean; // Si le joueur peut attaquer
  currentAction?: string; // Action en cours
}

// Nouveaux types pour le système de combat
export interface BattleAction {
  id: string; // ID unique pour identifier l'action
  type: 'ATTACK' | 'BLOCK' | 'COUNTER';
  sourceCardId: string;
  targetId?: string;
  playerId: string;
  power?: number;
  timestamp: number;
}

export interface CounterEvent {
  id: string;
  type: 'TRIGGER' | 'BLOCK' | 'COUNTER';
  description: string;
  execute: (gameState: GameState) => GameState;
  priority: number;
}

export interface BlockAction {
  id: string;
  blockerCardId: string;
  blockedActionId: string;
  playerId: 'player' | 'opponent';
  timestamp: number;
}

export type BattleStackItem = BattleAction | CounterEvent | BlockAction;

export interface GameAction {
  type: 'PLAY_CARD' | 'ATTACK' | 'ATTACH_DON' | 'ACTIVATE_EFFECT' | 'BLOCK' | 'END_PHASE' | 'ACTIVATE_DON' | 'PAY_COST';
  playerId: string;
  cardId?: string;
  targetId?: string;
  sourceId?: string;
  donCount?: number; // Nombre de DON à utiliser
}

export interface CardEffect {
  type: CardEffectType;
  timing: CardEffectTiming;
  description: string;
  execute: (gameState: GameState, sourceCard: GameCard, targetCard?: GameCard) => GameState;
} 