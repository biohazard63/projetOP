import React from 'react';
import { Player, GameCard } from '@/types/game';
import { GameZone } from './GameZone';

interface PlayerFieldProps {
  player: Player;
  isOpponent?: boolean;
  onCardClick?: (card: GameCard) => void;
  selectedCard?: GameCard;
}

export const PlayerField: React.FC<PlayerFieldProps> = ({
  player,
  isOpponent = false,
  onCardClick,
  selectedCard,
}) => {
  return (
    <div className={`flex flex-col gap-6 p-4 bg-gray-800 rounded-lg ${isOpponent ? 'mb-4' : 'mt-4'}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">{player.name}</h2>
        <div className="text-white">Points de vie: {player.lifePoints}</div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        {/* Première ligne */}
        <div className="col-span-1">
          <GameZone
            title="Life"
            cards={[]}
            isOpponent={isOpponent}
            onCardClick={onCardClick}
            selectedCard={selectedCard}
          />
        </div>

        <div className="col-span-4">
          <div className="text-center text-white text-lg font-bold mb-2">CHARACTER AREA</div>
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="border-2 border-dashed border-gray-600 rounded-lg aspect-[2/3]"></div>
            ))}
          </div>
        </div>

        <div className="col-span-1">
          <GameZone
            title="Deck"
            cards={player.deck}
            isOpponent={isOpponent}
            onCardClick={onCardClick}
            selectedCard={selectedCard}
          />
        </div>

        {/* Deuxième ligne */}
        <div className="col-span-1">
          <GameZone
            title="Don Deck"
            cards={player.donDeck || []}
            isOpponent={isOpponent}
            onCardClick={onCardClick}
            selectedCard={selectedCard}
          />
        </div>

        <div className="col-span-4">
          <div className="text-center text-white text-lg font-bold mb-2">COST AREA</div>
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="border-2 border-dashed border-gray-600 rounded-lg aspect-square"></div>
            ))}
          </div>
        </div>

        <div className="col-span-1">
          <GameZone
            title="Trash"
            cards={[]}
            isOpponent={isOpponent}
            onCardClick={onCardClick}
            selectedCard={selectedCard}
          />
        </div>

        {/* Troisième ligne */}
        <div className="col-span-1">
          <GameZone
            title="Leader"
            cards={player.leader ? [player.leader] : []}
            isOpponent={isOpponent}
            onCardClick={onCardClick}
            selectedCard={selectedCard}
          />
        </div>

        <div className="col-span-1">
          <GameZone
            title="Stage"
            cards={[]}
            isOpponent={isOpponent}
            onCardClick={onCardClick}
            selectedCard={selectedCard}
          />
        </div>

        <div className="col-span-4">
          <GameZone
            title="Main"
            cards={player.hand}
            isOpponent={isOpponent}
            onCardClick={onCardClick}
            selectedCard={selectedCard}
          />
        </div>
      </div>
    </div>
  );
}; 