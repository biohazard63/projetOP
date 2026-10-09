import React from 'react';
import { Player, GameCard } from '@/types/game';
import Image from 'next/image';
import { Card } from './Card';
import '@/styles/game.css';

interface OpponentFieldProps {
  player: Player;
  onCardClick: (card: GameCard) => void;
  selectedCard?: GameCard;
  onToggleCardPosition?: (card: GameCard) => void;
  selectedAttacker?: string | null;
  onSelectAttacker?: (card: GameCard) => void;
  onSelectTarget?: (card: GameCard) => void;
  currentPlayer?: 'player' | 'opponent';
}

export const OpponentField: React.FC<OpponentFieldProps> = ({
  player,
  onCardClick,
  selectedCard,
  onToggleCardPosition,
  selectedAttacker,
  onSelectAttacker,
  onSelectTarget,
  currentPlayer = 'player',
}) => {
  return (
    <div className="flex flex-col gap-8 w-full rotate-180 self-end opponent-field p-4">
      {/* Info adversaire */}
      <div className="flex justify-between items-center w-full px-4 -rotate-180">
        <span className="text-white font-bold text-lg">Adversaire</span>
        <span className="text-white">Points de vie: {player.lifePoints}</span>
      </div>

      {/* CHARACTER AREA */}
      <div className="w-full px-4">
        <div className="text-white text-sm mb-2 text-center bg-gray-800 py-1 rounded-t-lg -rotate-180">CHARACTER AREA</div>
        <div className="grid grid-cols-6 gap-4">
          {/* LIFE */}
          <div className="col-span-1">
            <div className="text-white text-sm mb-2 text-center -rotate-180">LIFE</div>
            <div className="h-80 border-2 border-dashed border-red-600 rounded-lg flex items-center justify-center bg-red-900/20">
              <span className="text-red-500 font-bold text-xl -rotate-180">{player.lifePoints}</span>
            </div>
          </div>

          {/* Game Field (5 slots) */}
          <div className="col-span-5">
            <div className="text-white text-sm mb-2 text-center -rotate-180">Zone de Combat</div>
            <div className="grid grid-cols-5 gap-4">
              {Array.isArray(player.field) && player.field.slice(0, 5).map((card) => (
                <div 
                  key={card.id} 
                  className={`-rotate-180 ${
                    selectedAttacker === card.id ? 'ring-4 ring-yellow-400 ring-opacity-75 rounded-lg' : ''
                  }`}
                >
                  <Card 
                    card={card} 
                    isOpponent={true}
                    onClick={() => onCardClick(card)}
                    isSelected={selectedCard?.id === card.id}
                    onTogglePosition={onToggleCardPosition ? () => onToggleCardPosition(card) : undefined}
                    currentPlayer={currentPlayer}
                    canTogglePosition={false} // L'adversaire ne peut pas changer les positions
                    isOnField={true}
                  />
                  
                  {/* Boutons d'action en phase BATTLE - seulement si c'est le tour de l'adversaire */}
                  {currentPlayer === 'opponent' && (
                    <div className="flex gap-1 mt-2 justify-center">
                      {onSelectAttacker && (
                        <button
                          onClick={() => {
                            console.log('🔥 Bouton Attaquer cliqué pour:', card.name, card.id);
                            onSelectAttacker(card);
                          }}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          disabled={card.hasAttacked || !card.canAttack}
                        >
                          Attaquer
                        </button>
                      )}
                      {onSelectTarget && selectedAttacker && selectedAttacker !== card.id && (
                        <button
                          onClick={() => {
                            console.log('Bouton Cibler cliqué pour:', card.name);
                            onSelectTarget(card);
                          }}
                          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                          Cibler
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {Array.from({ length: Math.max(0, 5 - (player.field?.length || 0)) }).map((_, index) => (
                <div 
                  key={`empty-${index}`} 
                  className="h-80 border-2 border-dashed border-gray-600 rounded-lg bg-gray-900/20 -rotate-180"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Central Area */}
      <div className="w-full px-4">
        <div className="flex justify-end gap-4">
          {/* LEADER CARD */}
          <div className="w-56">
            <div className="text-white text-sm mb-2 text-center -rotate-180">LEADER CARD</div>
            <div className="relative -rotate-180">
              {player.leader ? (
                <>
                  <Card 
                    card={player.leader} 
                    isOpponent={true}
                    onClick={() => onCardClick(player.leader!)}
                    isSelected={selectedCard?.id === player.leader?.id}
                    currentPlayer={currentPlayer}
                    onTogglePosition={onToggleCardPosition ? () => onToggleCardPosition(player.leader!) : undefined}
                    canTogglePosition={false}
                  />
                  
                  {/* Bouton pour cibler le leader - seulement si un attaquant est sélectionné */}
                  {onSelectTarget && selectedAttacker && (
                    <div className="flex justify-center mt-2">
                      <button
                        onClick={() => onSelectTarget(player.leader!)}
                        className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                      >
                        Attaquer Leader
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-80 border-2 border-dashed border-blue-600 rounded-lg flex items-center justify-center bg-blue-900/20">
                  <span className="text-blue-500">Leader</span>
                </div>
              )}
            </div>
          </div>

          {/* STAGE CARD */}
          <div className="w-56">
            <div className="text-white text-sm mb-2 text-center -rotate-180">STAGE CARD</div>
            <div className="h-80 border-2 border-dashed border-yellow-600 rounded-lg flex items-center justify-center bg-yellow-900/20 -rotate-180">
              <span className="text-yellow-500">Stage</span>
            </div>
          </div>

          {/* DECK */}
          <div className="w-56">
            <div className="text-white text-sm mb-2 text-center -rotate-180">DECK</div>
            <div className="relative -rotate-180">
              {Array.isArray(player.deck) && player.deck.length > 0 ? (
                <div className="relative">
                  <div className="w-full h-80 border-2 border-dashed border-blue-600 rounded-lg bg-blue-900/20 flex items-center justify-center relative overflow-hidden">
                    <Image
                      src="/images/card-back.jpg"
                      alt="Dos de carte"
                      width={200}
                      height={280}
                      className="object-cover rounded-lg"
                    />
                    <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                      {player.deck.length}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-80 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-900/20">
                  <span className="text-gray-500">Deck</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* COST AREA */}
      <div className="w-full px-4">
        <div className="text-white text-sm mb-2 text-center bg-gray-800 py-1 rounded-t-lg -rotate-180">COST AREA</div>
        <div className="flex flex-col gap-4">
          {/* DON et TRASH */}
          <div className="grid grid-cols-4 gap-4">
            {/* DON Deck */}
            <div>
              <div className="text-white text-sm mb-2 text-center -rotate-180">DON DECK</div>
              <div className="relative -rotate-180">
                {Array.isArray(player.donDeck) && player.donDeck.length > 0 && (
                  <div className="relative">
                    <Card 
                      card={player.donDeck[0]} 
                      isOpponent={true}
                      onClick={() => onCardClick(player.donDeck[0])}
                      isSelected={selectedCard?.id === player.donDeck[0].id}
                      currentPlayer={currentPlayer}
                    />
                    {player.donDeck.length > 1 && (
                      <div className="absolute top-0 left-0 w-full">
                        {player.donDeck.slice(1).map((card, index) => (
                          <div 
                            key={card.id} 
                            className="absolute w-full"
                            style={{ 
                              top: `${index * 2}px`, 
                              left: `${index * 2}px`,
                              zIndex: -1 - index
                            }}
                          >
                            <Card 
                              card={card} 
                              isOpponent={true}
                              onClick={() => onCardClick(card)}
                              isSelected={selectedCard?.id === card.id}
                              currentPlayer={currentPlayer}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* DON Active */}
            <div>
              <div className="text-white text-sm mb-2 text-center -rotate-180">DON Active</div>
              <div className="relative -rotate-180">
                {Array.isArray(player.donField) && player.donField.length > 0 ? (
                  <div className="relative border-2 border-dashed border-yellow-600 rounded-lg bg-yellow-900/20 p-2">
                    {player.donField.map((card, index) => (
                      <div 
                        key={card.id} 
                        className="absolute w-full"
                        style={{ 
                          top: `${index * 2}px`, 
                          left: `${index * 2}px`,
                          zIndex: index
                        }}
                      >
                        <Card 
                          card={card} 
                          isOpponent={true}
                          onClick={() => onCardClick(card)}
                          isSelected={selectedCard?.id === card.id}
                          currentPlayer={currentPlayer}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-yellow-600 rounded-lg bg-yellow-900/20" style={{ height: '200px' }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-yellow-500">Vide</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DON Épuisé */}
            <div>
              <div className="text-white text-sm mb-2 text-center -rotate-180">DON Épuisé</div>
              <div className="relative -rotate-180">
                {Array.isArray(player.usedDonDeck) && player.usedDonDeck.length > 0 ? (
                  <div className="relative border-2 border-dashed border-red-600 rounded-lg bg-red-900/20 p-2">
                    <Card 
                      card={player.usedDonDeck[0]} 
                      isOpponent={true}
                      onClick={() => onCardClick(player.usedDonDeck[0])}
                      isSelected={selectedCard?.id === player.usedDonDeck[0].id}
                      currentPlayer={currentPlayer}
                    />
                    {player.usedDonDeck.length > 1 && (
                      <div className="absolute top-2 left-2">
                        {player.usedDonDeck.slice(1).map((card, index) => (
                          <div 
                            key={card.id} 
                            className="absolute w-full"
                            style={{ 
                              top: `${index * 2}px`, 
                              left: `${index * 2}px`,
                              zIndex: -1 - index
                            }}
                          >
                            <Card 
                              card={card} 
                              isOpponent={true}
                              onClick={() => onCardClick(card)}
                              isSelected={selectedCard?.id === card.id}
                              currentPlayer={currentPlayer}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-red-600 rounded-lg bg-red-900/20" style={{ height: '200px' }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-red-500">Vide</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Trash/Discard */}
            <div>
              <div className="text-white text-sm mb-2 text-center -rotate-180">TRASH</div>
              <div className="relative -rotate-180">
                {Array.isArray(player.discardPile) && player.discardPile.length > 0 ? (
                  <div className="relative border-2 border-dashed border-purple-600 rounded-lg bg-purple-900/20 p-2">
                    <Card 
                      card={player.discardPile[0]} 
                      isOpponent={true}
                      onClick={() => onCardClick(player.discardPile[0])}
                      isSelected={selectedCard?.id === player.discardPile[0].id}
                      currentPlayer={currentPlayer}
                    />
                    {player.discardPile.length > 1 && (
                      <div className="absolute top-2 left-2">
                        {player.discardPile.slice(1).map((card, index) => (
                          <div 
                            key={card.id} 
                            className="absolute w-full"
                            style={{ 
                              top: `${index * 2}px`, 
                              left: `${index * 2}px`,
                              zIndex: -1 - index
                            }}
                          >
                            <Card 
                              card={card} 
                              isOpponent={true}
                              onClick={() => onCardClick(card)}
                              isSelected={selectedCard?.id === card.id}
                              currentPlayer={currentPlayer}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-purple-600 rounded-lg bg-purple-900/20" style={{ height: '200px' }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-purple-500">Vide</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hand */}
          <div className="flex flex-col items-center">
            <div className="text-white text-sm mb-2 text-center -rotate-180">MAIN ({player.hand?.length || 0})</div>
            <div className="relative flex justify-center items-center" style={{ height: '330px', width: '100%' }}>
              {Array.isArray(player.hand) && player.hand.map((card, index) => {
                const totalCards = player.hand.length;
                const centerOffset = (totalCards - 1) * 30;
                const cardPosition = (index * 60) - centerOffset;
                
                return (
                  <div
                    key={card.id}
                    className="absolute transition-all duration-300 ease-in-out hover:scale-110 hover:translate-y-[-20px] -rotate-180"
                    style={{
                      left: `calc(50% + ${cardPosition}px)`,
                      top: '80px',
                      transform: `translateX(-50%) rotate(${-12 + (index * (24 / Math.max(1, totalCards - 1)))}deg)`,
                      transformOrigin: 'top center',
                      zIndex: index
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.zIndex = '9999';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.zIndex = index.toString();
                    }}
                  >
                    <div className="relative">
                      <Card
                        card={card}
                        isSelected={selectedCard?.id === card.id}
                        isOpponent={true}
                        onClick={() => onCardClick(card)}
                        currentPlayer={currentPlayer}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpponentField;
