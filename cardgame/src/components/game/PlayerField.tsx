import React from 'react';
import { Player, GameCard } from '@/types/game';
import Image from 'next/image';
import { Card } from './Card';
import '@/styles/game.css';

interface PlayerFieldProps {
  player: Player;
  isOpponent?: boolean;
  onCardClick: (card: GameCard) => void;
  selectedCard?: GameCard;
  onToggleCardPosition?: (card: GameCard) => void; // Nouvelle prop
  selectedAttacker?: string | null; // ID de la carte attaquante sélectionnée
  onSelectAttacker?: (card: GameCard) => void;
  onSelectTarget?: (card: GameCard) => void;
  currentPlayer?: 'player' | 'opponent';
}

export const PlayerField: React.FC<PlayerFieldProps> = ({
  player,
  isOpponent = false,
  onCardClick,
  selectedCard,
  onToggleCardPosition,
  selectedAttacker,
  onSelectAttacker,
  onSelectTarget,
  currentPlayer = 'player',
}) => {
  // Debug: vérifier si les fonctions sont bien passées
  console.log('PlayerField - onSelectAttacker:', !!onSelectAttacker);
  console.log('PlayerField - onSelectTarget:', !!onSelectTarget);
  console.log('PlayerField - selectedAttacker:', selectedAttacker);
  console.log('PlayerField - isOpponent:', isOpponent);
  return (
    <div className={`flex flex-col gap-8 w-full ${isOpponent ? 'rotate-180 self-end opponent-field' : 'player-field'} p-4`}>
      {/* Info joueur */}
      <div className={`flex justify-between items-center w-full px-4 ${isOpponent ? '-rotate-180' : ''}`}>
        <span className="text-white font-bold text-lg">
          {isOpponent ? 'Adversaire' : 'Joueur'}
        </span>
        <span className="text-white">
          Points de vie: {player.lifePoints}
        </span>
      </div>

      {/* CHARACTER AREA */}
      <div className="w-full px-4">
        <div className={`text-white text-sm mb-2 text-center bg-gray-800 py-1 rounded-t-lg ${isOpponent ? '-rotate-180' : ''}`}>CHARACTER AREA</div>
        <div className="grid grid-cols-6 gap-4">
          {/* LIFE */}
          <div className="col-span-1">
            <div className={`text-white text-sm mb-2 text-center ${isOpponent ? '-rotate-180' : ''}`}>LIFE</div>
            <div className="h-80 border-2 border-dashed border-red-600 rounded-lg flex items-center justify-center bg-red-900/20">
              <span className={`text-red-500 font-bold text-xl ${isOpponent ? '-rotate-180' : ''}`}>{player.lifePoints}</span>
            </div>
          </div>

          {/* Game Field (5 slots) */}
          <div className="col-span-5">
            <div className={`text-white text-sm mb-2 text-center ${isOpponent ? '-rotate-180' : ''}`}>Zone de Combat</div>
            <div className="grid grid-cols-5 gap-4">
              {Array.isArray(player.field) && player.field.slice(0, 5).map((card) => (
                <div 
                  key={card.id} 
                  className={`${isOpponent ? '-rotate-180' : ''} ${
                    selectedAttacker === card.id ? 'ring-4 ring-yellow-400 ring-opacity-75 rounded-lg' : ''
                  }`}
                >
                  <Card 
                    card={card} 
                    isOpponent={isOpponent}
                    onClick={() => onCardClick(card)}
                    isSelected={selectedCard?.id === card.id}
                    onTogglePosition={onToggleCardPosition ? () => onToggleCardPosition(card) : undefined}
                    currentPlayer={currentPlayer}
                    canTogglePosition={!isOpponent} // Seulement le joueur peut changer les positions
                    isOnField={true} // Cette carte est sur le terrain
                  />
                  
                  {/* Boutons d'action en phase BATTLE */}
                  {((!isOpponent && currentPlayer === 'player') || (isOpponent && currentPlayer === 'opponent')) && (
                    <div className="flex gap-1 mt-2 justify-center">
                      {/* Bouton de test pour voir si les boutons s'affichent */}
                      <button
                        onClick={() => console.log('Bouton test cliqué pour:', card.name)}
                        className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                      >
                        Test
                      </button>
                      
                      {onSelectAttacker && (
                        <button
                          onClick={() => {
                            console.log('🔥 Bouton Attaquer cliqué pour:', card.name, card.id);
                            console.log('🔥 onSelectAttacker function:', typeof onSelectAttacker);
                            console.log('🔥 card.canAttack:', card.canAttack, 'card.hasAttacked:', card.hasAttacked);
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
                  className={`h-80 border-2 border-dashed border-gray-600 rounded-lg bg-gray-900/20 ${isOpponent ? '-rotate-180' : ''}`}
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
            <div className={`text-white text-sm mb-2 text-center ${isOpponent ? '-rotate-180' : ''}`}>LEADER CARD</div>
            <div className={`relative ${isOpponent ? '-rotate-180' : ''}`}>
              {player.leader ? (
                <>
                  <Card 
                    card={player.leader} 
                    isOpponent={isOpponent}
                    onClick={() => onCardClick(player.leader!)}
                    isSelected={selectedCard?.id === player.leader?.id}
                    currentPlayer={currentPlayer}
                    onTogglePosition={onToggleCardPosition ? () => onToggleCardPosition(player.leader!) : undefined}
                    canTogglePosition={!isOpponent} // Seulement le joueur peut changer les positions
                  />
                  
                  {/* Bouton pour cibler le leader (peu importe lequel) */}
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
            <div className={`text-white text-sm mb-2 text-center ${isOpponent ? '-rotate-180' : ''}`}>STAGE CARD</div>
            <div className={`h-80 border-2 border-dashed border-yellow-600 rounded-lg flex items-center justify-center bg-yellow-900/20 ${isOpponent ? '-rotate-180' : ''}`}>
              <span className="text-yellow-500">Stage</span>
            </div>
          </div>

          {/* DECK */}
          <div className="w-56">
            <div className={`text-white text-sm mb-2 text-center ${isOpponent ? '-rotate-180' : ''}`}>DECK</div>
            <div className={`relative ${isOpponent ? '-rotate-180' : ''}`}>
              {Array.isArray(player.deck) && player.deck.length > 0 ? (
                <div className="relative">
                  {/* Afficher le dos de carte pour le deck */}
                  <div className="w-full h-80 border-2 border-dashed border-blue-600 rounded-lg bg-blue-900/20 flex items-center justify-center relative overflow-hidden">
                    <Image
                      src="/images/card-back.jpg"
                      alt="Dos de carte"
                      width={200}
                      height={280}
                      className="object-cover rounded-lg"
                    />
                    {/* Indicateur du nombre de cartes */}
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
        <div className={`text-white text-sm mb-2 text-center bg-gray-800 py-1 rounded-t-lg ${isOpponent ? '-rotate-180' : ''}`}>COST AREA</div>
        <div className="flex flex-col gap-4">
          {/* DON et TRASH */}
          <div className="grid grid-cols-4 gap-4">
            {/* DON Deck */}
            <div>
              <div className={`text-white text-sm mb-2 text-center ${isOpponent ? '-rotate-180' : ''}`}>DON DECK</div>
              <div className={`relative ${isOpponent ? '-rotate-180' : ''}`}>
                {Array.isArray(player.donDeck) && player.donDeck.length > 0 && (
                  <div className="relative">
                    <Card 
                      card={player.donDeck[0]} 
                      isOpponent={isOpponent}
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
                    isOpponent={isOpponent}
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
              <div className={`text-white text-sm mb-2 text-center ${isOpponent ? '-rotate-180' : ''}`}>DON Active</div>
              <div className={`relative ${isOpponent ? '-rotate-180' : ''}`}>
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
                    isOpponent={isOpponent}
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
              <div className={`text-white text-sm mb-2 text-center ${isOpponent ? '-rotate-180' : ''}`}>DON Épuisé</div>
              <div className={`relative ${isOpponent ? '-rotate-180' : ''}`}>
                {Array.isArray(player.usedDonDeck) && player.usedDonDeck.length > 0 ? (
                  <div className="relative border-2 border-dashed border-red-600 rounded-lg bg-red-900/20 p-2">
                    <Card 
                      card={player.usedDonDeck[0]} 
                      isOpponent={isOpponent}
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
                    isOpponent={isOpponent}
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
              <div className={`text-white text-sm mb-2 text-center ${isOpponent ? '-rotate-180' : ''}`}>TRASH</div>
              <div className={`relative ${isOpponent ? '-rotate-180' : ''}`}>
                {Array.isArray(player.discardPile) && player.discardPile.length > 0 ? (
                  <div className="relative border-2 border-dashed border-purple-600 rounded-lg bg-purple-900/20 p-2">
                    <Card 
                      card={player.discardPile[0]} 
                      isOpponent={isOpponent}
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
                    isOpponent={isOpponent}
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
            <div className={`text-white text-sm mb-2 text-center ${isOpponent ? '-rotate-180' : ''}`}>MAIN ({player.hand?.length || 0})</div>
            <div className="relative flex justify-center items-center" style={{ height: '330px', width: '100%' }}>
              {Array.isArray(player.hand) && player.hand.map((card, index) => {
                const totalCards = player.hand.length;
                const centerOffset = (totalCards - 1) * 30; // Ajuster l'offset pour centrer
                const cardPosition = (index * 60) - centerOffset;
                
                return (
                  <div
                    key={card.id}
                    className={`absolute transition-all duration-300 ease-in-out hover:scale-110 hover:translate-y-[-20px] ${isOpponent ? '-rotate-180' : ''}`}
                    style={{
                      left: `calc(50% + ${cardPosition}px)`,
                      top: isOpponent ? '80px' : 'auto',
                      bottom: isOpponent ? 'auto' : '80px',
                      transform: `translateX(-50%) rotate(${-12 + (index * (24 / Math.max(1, totalCards - 1)))}deg)`,
                      transformOrigin: isOpponent ? 'top center' : 'bottom center',
                      zIndex: index
                    }}
                    onMouseEnter={(e) => {
                      // Mettre la carte au-dessus de toutes les autres au survol
                      e.currentTarget.style.zIndex = '9999';
                    }}
                    onMouseLeave={(e) => {
                      // Remettre le z-index original
                      e.currentTarget.style.zIndex = index.toString();
                    }}
                  >
                    <div className="relative">
                      <Card
                        card={card}
                        isSelected={selectedCard?.id === card.id}
                        isOpponent={isOpponent}
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

export default PlayerField;