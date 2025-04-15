import React from 'react';
import { GameCard } from '@/types/game';
import Image from 'next/image';

interface CardProps {
  card: GameCard;
  isSelected?: boolean;
  isOpponent?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  card,
  isSelected = false,
  isOpponent = false,
  onClick,
}) => {
  const getBackgroundColor = () => {
    switch (card.color) {
      case 'RED':
        return 'bg-red-500/20';
      case 'BLUE':
        return 'bg-blue-500/20';
      case 'GREEN':
        return 'bg-green-500/20';
      case 'PURPLE':
        return 'bg-purple-500/20';
      default:
        return 'bg-gray-500/20';
    }
  };

  return (
    <div
      className={`relative w-48 h-64 rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 ${
        isSelected ? 'ring-4 ring-yellow-400' : ''
      } ${getBackgroundColor()}`}
      onClick={onClick}
    >
      <Image
        src={isOpponent ? '/card-back.jpg' : card.imageUrl}
        alt={card.name}
        fill
        className="object-cover"
      />
      {!isOpponent && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/80 text-white">
          <div className="flex justify-between items-center">
            <span className="font-bold">{card.name}</span>
            <div className="flex gap-2">
              <span>💪 {card.power}</span>
              <span>💰 {card.cost}</span>
            </div>
          </div>
          {card.isLeader && (
            <div className="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-sm">
              Leader
            </div>
          )}
          {card.isDon && (
            <div className="absolute top-2 left-2 bg-red-400 text-white px-2 py-1 rounded-full text-sm">
              Don
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 