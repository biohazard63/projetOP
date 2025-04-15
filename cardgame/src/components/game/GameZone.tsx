import React from 'react';
import { GameCard } from '@/types/game';
import { Card } from './Card';

interface GameZoneProps {
  title: string;
  cards: GameCard[];
  isOpponent?: boolean;
  onCardClick?: (card: GameCard) => void;
  selectedCard?: GameCard;
}

export const GameZone: React.FC<GameZoneProps> = ({
  title,
  cards,
  isOpponent = false,
  onCardClick,
  selectedCard,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <div className="flex flex-wrap gap-4">
        {cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            isOpponent={isOpponent}
            isSelected={selectedCard?.id === card.id}
            onClick={() => onCardClick?.(card)}
          />
        ))}
      </div>
    </div>
  );
}; 