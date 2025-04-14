export type CardType = 'LEADER' | 'CHARACTER' | 'EVENT' | 'STAGE' | 'DON';
export type CardColor = 'RED' | 'GREEN' | 'BLUE' | 'BLACK' | 'PURPLE' | 'YELLOW';

export interface GameCard {
  id: string;
  name: string;
  cost: number;
  power: number;
  type: string;
  color: string;
  imageUrl: string;
  isLeader?: boolean;
  isDon?: boolean;
  canAttack?: boolean;
  hasAttacked?: boolean;
}

export interface Player {
  id: string;
  name: string;
  lifePoints: number;
  deck: GameCard[];
  hand: GameCard[];
  field: GameCard[];
  leader?: GameCard;
  donDeck: GameCard[];
  activeDon?: GameCard;
}

export interface GameState {
  player: Player;
  opponent: Player;
  currentPhase: 'DRAW' | 'MAIN' | 'END';
  currentPlayer: 'player' | 'opponent';
  selectedCard?: GameCard;
  selectedTarget?: GameCard;
  turnNumber: number;
  isGameOver: boolean;
}

export interface PlayerState {
  id: string;
  life: number;
  leader: GameCard | null;
  hand: GameCard[];
  field: GameCard[];
  donDeck: GameCard[];
  donZone: GameCard[];
  deck: GameCard[];
  trash: GameCard[];
}

export type GamePhase = 'DRAW' | 'DON' | 'MAIN' | 'END';

export interface GameAction {
  type: 'PLAY_CARD' | 'ATTACK' | 'ATTACH_DON' | 'ACTIVATE_EFFECT' | 'BLOCK' | 'END_PHASE';
  playerId: string;
  cardId?: string;
  targetId?: string;
  sourceId?: string;
} 