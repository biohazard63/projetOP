import { Card as PrismaCard } from '@prisma/client'

export type Card = {
  id: string;
  name: string;
  code: string;
  type: string;
  color: string;
  cost: number;
  power?: number;
  counter?: string;
  effect?: string;
  rarity: string;
  imageUrl: string;
  set?: string;
  attribute?: string;
  attributeImage?: string;
  family?: string;
  ability?: string;
  trigger?: string;
  notes?: string;
  isParallel: boolean;
  isAltArt: boolean;
  isSpecial: boolean;
};

// Type étendu pour les cartes avec des propriétés supplémentaires
export type ExtendedCardType = PrismaCard & {
  isParallel?: boolean;
  isAltArt?: boolean;
  isUltraRare?: boolean;
  position?: number;
  isNew?: boolean;
}

export type CardRarity = 'C' | 'UC' | 'R' | 'SR' | 'L' | 'SEC' | 'SP CARD' | 'TR'
export type CardType = 'CHARACTER' | 'EVENT' | 'STAGE' | 'LEADER' 