'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { GameCard } from '@/types/game';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CardProps {
  card: GameCard;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
  showDetails?: boolean;
  quantity?: number;
}

export function Card({ card, onClick, isActive = false, className, showDetails = false, quantity }: Readonly<CardProps>) {
  const [hasImageError, setHasImageError] = useState(false);

  const altText = useMemo(() => (typeof card.name === 'string' ? card.name : 'Carte'), [card.name]);
  const isClickable = Boolean(onClick);
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (!isClickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  }, [isClickable, onClick]);

  const Container = isClickable ? 'button' : 'div';

  return (
    <Container
      className={cn('relative', className, isActive && 'ring-2 ring-blue-500')}
      onClick={onClick}
      onKeyDown={!isClickable ? handleKeyDown : undefined}
      aria-label={isClickable ? `Carte ${altText}` : undefined}
      type={isClickable ? 'button' : undefined}
    >
      <div className="relative aspect-[63/88] rounded-lg overflow-hidden shadow-lg">
        {card.imageUrl && !hasImageError ? (
          <Image
            src={card.imageUrl}
            alt={altText}
            fill
            sizes="(max-width: 768px) 45vw, 20vw"
            loading="lazy"
            className="object-contain"
            onError={() => setHasImageError(true)}
            priority={false}
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
    </Container>
  );
} 