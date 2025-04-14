'use client';

import React from 'react';
import { GameCard } from '@/types/game';
import Image from 'next/image';

interface CardProps {
  card: GameCard;
  onClick?: () => void;
  isActive?: boolean;
  isTarget?: boolean;
}

export default function Card({ card, onClick, isActive, isTarget }: CardProps) {
  const getCardColor = (color: string) => {
    switch (color) {
      case 'RED':
        return 'bg-red-500';
      case 'BLUE':
        return 'bg-blue-500';
      case 'GREEN':
        return 'bg-green-500';
      case 'BLACK':
        return 'bg-gray-900';
      case 'YELLOW':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div
      className={`
        relative w-full h-full rounded-lg overflow-hidden
        ${getCardColor(card.color)}
        ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
        ${isActive ? 'ring-4 ring-yellow-400' : ''}
        ${isTarget ? 'ring-4 ring-red-500' : ''}
      `}
      onClick={onClick}
    >
      {/* Image de la carte */}
      <div className="relative w-full h-2/3">
        <Image
          src={card.imageUrl}
          alt={card.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Informations de la carte */}
      <div className="p-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold truncate">{card.name}</h3>
          <span className="text-sm font-bold">{card.cost}</span>
        </div>
        
        <div className="text-xs mt-1">
          <div className="flex items-center gap-1">
            <span>Power:</span>
            <span className="font-bold">{card.power}</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Type:</span>
            <span className="font-bold">{card.type}</span>
          </div>
        </div>

        {/* Indicateurs d'état */}
        <div className="absolute top-1 right-1 flex gap-1">
          {card.isLeader && (
            <div className="w-4 h-4 bg-yellow-400 rounded-full" title="Leader" />
          )}
          {card.isDon && (
            <div className="w-4 h-4 bg-orange-400 rounded-full" title="Don" />
          )}
        </div>
      </div>
    </div>
  );
} 