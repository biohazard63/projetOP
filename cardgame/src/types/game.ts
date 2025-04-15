export type CardType = 'LEADER' | 'CHARACTER' | 'EVENT' | 'STAGE' | 'DON';
export type CardColor = 'RED' | 'BLUE' | 'GREEN' | 'BLACK' | 'PURPLE' | 'YELLOW';
export type CardPosition = 'ACTIVE' | 'RESTED';
export type GamePhase = 'SETUP' | 'DRAW' | 'DON' | 'MAIN' | 'END';
export type SetupPhase = 'CHOOSE_FIRST' | 'CHOOSE_LEADER' | 'SET_LIFE' | 'SET_DON' | 'DRAW_STARTING' | 'MULLIGAN' | 'READY';
export type CardEffectType = 'ON_PLAY' | 'ON_ATTACK' | 'ON_BLOCK' | 'ON_COUNTER' | 'ON_END_TURN' | 'TRIGGER';
export type CardEffectTiming = 'IMMEDIATE' | 'END_OF_TURN' | 'NEXT_TURN' | 'CONTINUOUS';

export interface GameCard {
  id: string;
  name: string;
  type: string;
  color: string;
  cost: number;
  power: number;
  imageUrl: string;
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
}

export interface Player {
  id: string;
  name: string;
  lifePoints: number;
  deck: GameCard[];
  hand: GameCard[];
  field: GameCard[];
  leader: GameCard | null;
  activeDon: number;
  donDeck?: GameCard[];
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
  donAddedThisTurn: number;
}

export interface GameState {
  player: Player;
  opponent: Player;
  currentPhase: 'SETUP' | 'DRAW' | 'MAIN' | 'BATTLE' | 'END';
  currentPlayer: 'player' | 'opponent';
  turnNumber: number;
  selectedCard?: GameCard;
  targetCard?: GameCard;
  canPlayCard: boolean;
  canAttack: boolean;
  canEndTurn: boolean;
  lastAction?: string;
  gameOver: boolean;
  winner?: 'player' | 'opponent';
  isFirstTurn: boolean;
}

export interface GameAction {
  type: 'PLAY_CARD' | 'ATTACK' | 'ATTACH_DON' | 'ACTIVATE_EFFECT' | 'BLOCK' | 'END_PHASE';
  playerId: string;
  cardId?: string;
  targetId?: string;
  sourceId?: string;
}

export interface CardEffect {
  type: CardEffectType;
  timing: CardEffectTiming;
  description: string;
  execute: (gameState: GameState, sourceCard: GameCard, targetCard?: GameCard) => GameState;
} 