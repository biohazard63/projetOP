'use client';

import React from 'react';
import { GameCard } from '@/types/game';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CardProps {
  card: GameCard;
  onClick?: () => void;
  isActive?: boolean;
  isTarget?: boolean;
  className?: string;
}

export function Card({ card, onClick, isActive = false, isTarget = false, className }: CardProps) {
  const getCardColor = (color: string) => {
    switch (color.toLowerCase()) {
      case 'red':
        return 'bg-red-100';
      case 'blue':
        return 'bg-blue-100';
      case 'green':
        return 'bg-green-100';
      case 'black':
        return 'bg-gray-100';
      default:
        return 'bg-white';
    }
  };

  return (
    <div
      className={cn(
        'relative w-32 h-48 rounded-lg shadow-lg transition-all duration-200 cursor-pointer',
        getCardColor(card.color),
        isActive && 'hover:scale-105 hover:shadow-xl',
        isTarget && 'ring-2 ring-yellow-400',
        !isActive && 'opacity-75',
        className
      )}
      onClick={onClick}
    >
      {/* Image de la carte */}
      <div className="w-full h-32 rounded-t-lg overflow-hidden">
        <Image
          src={card.imageUrl}
          alt={card.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Informations de la carte */}
      <div className="p-2">
        <h3 className="text-sm font-bold truncate">{card.name}</h3>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs">Coût: {card.cost}</span>
          <span className="text-xs">Puissance: {card.power}</span>
        </div>
        <div className="text-xs mt-1">{card.type}</div>
      </div>

      {/* Indicateurs spéciaux */}
      {card.isLeader && (
        <div className="absolute top-1 right-1 bg-yellow-400 text-xs px-1 rounded">
          Leader
        </div>
      )}
      {card.isDon && (
        <div className="absolute top-1 left-1 bg-purple-400 text-xs px-1 rounded">
          Don
        </div>
      )}
      {card.hasAttacked && (
        <div className="absolute bottom-1 right-1 bg-red-400 text-xs px-1 rounded">
          Attaqué
        </div>
      )}
    </div>
  );
} 