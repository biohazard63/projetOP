'use client';

import React, { useState } from 'react';
import { GameCard } from '@/types/game';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CardProps {
  card: GameCard;
  onClick?: () => void;
  isActive?: boolean;
  isTarget?: boolean;
  className?: string;
  showDetails?: boolean;
  quantity?: number;
}

export function Card({ card, onClick, isActive = false, isTarget = false, className, showDetails = false, quantity }: CardProps) {
  const [hasImageError, setHasImageError] = useState(false);

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
      className={`relative ${className} ${isActive ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onClick}
    >
      <div className="relative aspect-[63/88] rounded-lg overflow-hidden shadow-lg">
        {card.imageUrl && !hasImageError ? (
          <img
            src={card.imageUrl}
            alt={typeof card.name === 'string' ? card.name : 'Carte'}
            className="w-full h-full object-contain"
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex flex-col items-center justify-center p-2">
            <span className="text-gray-400 text-xs text-center">Image non disponible</span>
            <h3 className="text-sm font-bold truncate text-white mt-2">{typeof card.name === 'string' ? card.name : 'Carte sans nom'}</h3>
          </div>
        )}
      </div>
      {showDetails && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-2">
          <h3 className="text-sm font-bold truncate text-white">{typeof card.name === 'string' ? card.name : 'Carte sans nom'}</h3>
          {quantity !== undefined && (
            <p className="text-xs text-gray-300">Quantité: {quantity}</p>
          )}
        </div>
      )}
    </div>
  );
} 