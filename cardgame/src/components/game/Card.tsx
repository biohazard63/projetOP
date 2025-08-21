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
  const handleMouseEnter = () => {
    console.log('=== Informations détaillées de la carte ===');
    console.log('Nom:', card.name);
    console.log('Type:', card.type);
    console.log('Couleur:', card.color);
    console.log('Coût:', card.cost);
    console.log('Puissance:', card.power);
    console.log('Effet:', card.effect);
    console.log('Trigger:', card.trigger);
    console.log('Propriétés spéciales:', {
      hasTrigger: card.hasTrigger,
      hasRush: card.hasRush,
      hasBlocker: card.hasBlocker,
      hasDoubleAttack: card.hasDoubleAttack,
      hasCounter: card.hasCounter,
      counterValue: card.counterValue
    });
    console.log('Face visible:', card.isFaceUp);
    console.log('Carte complète:', JSON.stringify(card, null, 2));
  };

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

  // Déterminer si la carte doit être affichée face verso
  const shouldShowFaceDown = () => {
    // Le leader adverse est toujours visible
    if (card.type === 'LEADER' && isOpponent) return false;
    
    // Les cartes de l'adversaire sont toujours face cachée (sauf le leader)
    if (isOpponent) return true;
    
    // Les cartes DON sont toujours face cachée
    if (card.type === 'DON') return true;
    
    // Pour toutes les autres cartes, on utilise la propriété isFaceUp
    return !card.isFaceUp;
  };

  const isFaceDown = shouldShowFaceDown();
  console.log(`Carte ${card.name} (${card.type}): ${isFaceDown ? 'face cachée' : 'face visible'}`);

  // Déterminer l'image à afficher
  const getImageUrl = () => {
    if (isFaceDown) {
      return card.type === 'DON' ? '/don.png' : '/card-back.jpg';
    }
    return card.imageUrl;
  };

  const formatEffect = (effect: string) => {
    if (!effect) return null;
    return effect.split('[').map((part, index) => {
      if (part.includes(']')) {
        const [keyword, ...rest] = part.split(']');
        return (
          <React.Fragment key={index}>
            <span className="text-yellow-400">[{keyword}]</span>
            {rest}
          </React.Fragment>
        );
      }
      return part;
    });
  };

  const getSpecialProperties = () => {
    const properties = [];
    if (card.hasTrigger) properties.push({ text: 'Trigger', color: 'bg-purple-500' });
    if (card.hasRush) properties.push({ text: 'Rush', color: 'bg-red-500' });
    if (card.hasBlocker) properties.push({ text: 'Bloqueur', color: 'bg-blue-500' });
    if (card.hasDoubleAttack) properties.push({ text: 'Double Attaque', color: 'bg-yellow-500' });
    if (card.hasCounter) properties.push({ text: `Contre (${card.counterValue})`, color: 'bg-green-500' });
    return properties;
  };

  const [imageError, setImageError] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="relative group">
      <div
        className={`relative w-56 h-80 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-150 hover:z-[60] ${
          isSelected ? 'ring-4 ring-yellow-400' : ''
        } ${getBackgroundColor()}`}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
      >
        <div className="relative aspect-[63/88] rounded-lg overflow-hidden shadow-lg">
          {getImageUrl() && !imageError ? (
            <Image
              src={getImageUrl()}
              alt={isFaceDown ? 'Carte face verso' : (typeof card.name === 'string' ? card.name : 'Carte')}
              fill
              sizes="(max-width: 768px) 100vw, 224px"
              className="object-contain"
              onError={() => setImageError(true)}
              priority={false}
            />
          ) : (
            <div className="w-full h-full bg-gray-700 flex flex-col items-center justify-center p-2">
              <span className="text-gray-400 text-xs text-center">Image non disponible</span>
              <h3 className="text-sm font-bold truncate text-white mt-2">
                {isFaceDown ? 'Carte face verso' : (typeof card.name === 'string' ? card.name : 'Carte sans nom')}
              </h3>
            </div>
          )}
        </div>
        {card.type === 'LEADER' && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-xs">
            Leader
          </div>
        )}
        {card.type === 'DON' && (
          <div className="absolute top-2 left-2 bg-red-400 text-white px-2 py-1 rounded-full text-xs">
            Don
          </div>
        )}
      </div>

      {!isFaceDown && (
        <div className="absolute left-[calc(100%+7rem)] top-1/2 -translate-y-1/2 w-64 bg-black/90 text-white rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[70]">
          <div className="text-sm">
            <div className="flex justify-between mb-2">
              <span className="font-bold">{card.name}</span>
              <div className="flex gap-2">
                <span>💪 {card.power}</span>
                <span>💰 {card.cost}</span>
                
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {getSpecialProperties().map((prop, index) => (
                <span key={index} className={`text-xs ${prop.color} text-white px-2 py-1 rounded-full`}>
                  {prop.text}
                </span>
              ))}
            </div>
            {card.effect ? (
              <p className="text-xs leading-relaxed">
                {formatEffect(card.effect)}
              </p>
            ) : (
              <p className="text-xs leading-relaxed text-gray-400">
                Aucun effet
              </p>
            )}
            {card.trigger && (
              <p className="text-xs leading-relaxed text-purple-400 mt-2">
                <span className="font-bold">Trigger:</span> {formatEffect(card.trigger)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Card; 