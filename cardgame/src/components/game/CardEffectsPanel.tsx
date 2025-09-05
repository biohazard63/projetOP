import React, { useState } from 'react';
import { GameState, GameCard } from '@/types/game';
import { CardEffectsService, ComboEffect } from '@/lib/game/cardEffectsService';
import { StrategyService, StrategyAnalysis } from '@/lib/game/strategyService';
import { Zap, Target, Shield, Heart, CreditCard, TrendingUp, Lightbulb, Crown } from 'lucide-react';

interface CardEffectsPanelProps {
  gameState: GameState;
  onGameStateUpdate: (newState: GameState) => void;
  playerId: 'player' | 'opponent';
}

export default function CardEffectsPanel({ gameState, onGameStateUpdate, playerId }: CardEffectsPanelProps) {
  const [activeTab, setActiveTab] = useState<'effects' | 'combos' | 'strategy' | 'victory'>('effects');
  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<GameCard | null>(null);

  const player = gameState[playerId];
  const availableCombos = CardEffectsService.getAvailableCombos(gameState, playerId);
  const strategies = StrategyService.suggestStrategies(gameState, playerId);
  const victoryCheck = CardEffectsService.checkAdvancedVictoryConditions(gameState);

  const handleExecuteEffect = async (effect: any, sourceCard: GameCard, targetCard?: GameCard) => {
    try {
      const response = await fetch('/api/game/execute-effect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameState,
          effect,
          sourceCardId: sourceCard.id,
          targetCardId: targetCard?.id,
          playerId
        })
      });

      if (response.ok) {
        const result = await response.json();
        onGameStateUpdate(result.gameState);
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution de l\'effet:', error);
    }
  };

  const handleExecuteCombo = (combo: ComboEffect) => {
    const updatedState = CardEffectsService.executeCombo(gameState, combo, playerId);
    onGameStateUpdate(updatedState);
  };

  const getCardEffects = (card: GameCard) => {
    const effects = [];
    
    if (card.hasCounter) {
      effects.push({
        id: 'counter',
        type: 'COUNTER',
        description: 'Contre-attaque',
        cost: 1,
        icon: Shield
      });
    }
    
    if (card.hasBlocker) {
      effects.push({
        id: 'block',
        type: 'BLOCK',
        description: 'Blocage',
        cost: 0,
        icon: Target
      });
    }
    
    if (card.hasTrigger) {
      effects.push({
        id: 'trigger',
        type: 'TRIGGER',
        description: 'Déclencheur',
        cost: 0,
        icon: Zap
      });
    }
    
    return effects;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 text-white">
      {/* Onglets */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveTab('effects')}
          className={`px-3 py-2 rounded-lg flex items-center space-x-2 ${
            activeTab === 'effects' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <Zap size={16} />
          <span>Effets</span>
        </button>
        <button
          onClick={() => setActiveTab('combos')}
          className={`px-3 py-2 rounded-lg flex items-center space-x-2 ${
            activeTab === 'combos' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <CreditCard size={16} />
          <span>Combinaisons</span>
        </button>
        <button
          onClick={() => setActiveTab('strategy')}
          className={`px-3 py-2 rounded-lg flex items-center space-x-2 ${
            activeTab === 'strategy' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <Lightbulb size={16} />
          <span>Stratégie</span>
        </button>
        <button
          onClick={() => setActiveTab('victory')}
          className={`px-3 py-2 rounded-lg flex items-center space-x-2 ${
            activeTab === 'victory' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <Crown size={16} />
          <span>Victoire</span>
        </button>
      </div>

      {/* Contenu des onglets */}
      <div className="space-y-4">
        {/* Onglet Effets */}
        {activeTab === 'effects' && (
          <div>
            <h3 className="text-lg font-bold mb-3">🎴 Effets de cartes disponibles</h3>
            
            {/* Cartes avec effets */}
            <div className="space-y-3">
              {player.field.map(card => {
                const effects = getCardEffects(card);
                if (effects.length === 0) return null;
                
                return (
                  <div key={card.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{card.name}</span>
                      <span className="text-sm text-gray-400">Power: {card.power}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {effects.map(effect => (
                        <button
                          key={effect.id}
                          onClick={() => handleExecuteEffect(effect, card)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center space-x-1"
                        >
                          <effect.icon size={14} />
                          <span>{effect.description}</span>
                          {effect.cost > 0 && (
                            <span className="text-yellow-400">({effect.cost} DON)</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {player.leader && getCardEffects(player.leader).length > 0 && (
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{player.leader.name} (Leader)</span>
                    <span className="text-sm text-gray-400">Power: {player.leader.power}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {getCardEffects(player.leader).map(effect => (
                      <button
                        key={effect.id}
                        onClick={() => handleExecuteEffect(effect, player.leader!)}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm flex items-center space-x-1"
                      >
                        <effect.icon size={14} />
                        <span>{effect.description}</span>
                        {effect.cost > 0 && (
                          <span className="text-yellow-400">({effect.cost} DON)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Onglet Combinaisons */}
        {activeTab === 'combos' && (
          <div>
            <h3 className="text-lg font-bold mb-3">🎯 Combinaisons disponibles</h3>
            
            {availableCombos.length === 0 ? (
              <p className="text-gray-400">Aucune combinaison disponible actuellement</p>
            ) : (
              <div className="space-y-3">
                {availableCombos.map(combo => (
                  <div key={combo.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{combo.name}</h4>
                      <button
                        onClick={() => handleExecuteCombo(combo)}
                        className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm"
                      >
                        Exécuter
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-300 mb-2">{combo.description}</p>
                    
                    {combo.bonus && (
                      <div className="flex items-center space-x-4 text-sm">
                        {combo.bonus.power && (
                          <span className="flex items-center space-x-1">
                            <TrendingUp size={14} />
                            <span>+{combo.bonus.power} Power</span>
                          </span>
                        )}
                        {combo.bonus.lifePoints && (
                          <span className="flex items-center space-x-1">
                            <Heart size={14} />
                            <span>+{combo.bonus.lifePoints} PV</span>
                          </span>
                        )}
                        {combo.bonus.drawCards && (
                                                   <span className="flex items-center space-x-1">
                           <CreditCard size={14} />
                           <span>+{combo.bonus.drawCards} carte(s)</span>
                         </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Onglet Stratégie */}
        {activeTab === 'strategy' && (
          <div>
            <h3 className="text-lg font-bold mb-3">🧠 Analyse stratégique</h3>
            
            {/* Analyse de l'état */}
            <div className="bg-gray-700 rounded-lg p-3 mb-4">
              <h4 className="font-semibold mb-2">📊 État actuel</h4>
              {(() => {
                const analysis = StrategyService.analyzeGameState(gameState, playerId);
                const position = StrategyService.evaluatePosition(gameState, playerId);
                
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Force du terrain:</span>
                      <span className="text-blue-400">{analysis.fieldStrength}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Qualité de la main:</span>
                      <span className="text-green-400">{analysis.handQuality}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Efficacité du deck:</span>
                      <span className="text-yellow-400">{analysis.deckEfficiency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Position:</span>
                      <span className={`${
                        position.position === 'WINNING' ? 'text-green-400' :
                        position.position === 'LOSING' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {position.position} ({position.confidence}%)
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* Stratégies suggérées */}
            <div className="space-y-3">
              <h4 className="font-semibold">💡 Stratégies suggérées</h4>
              {strategies.map((strategy, index) => (
                <div key={strategy.strategy.id} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold">{strategy.strategy.name}</h5>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">
                        {strategy.feasibility}% faisable
                      </span>
                      <span className="text-sm text-gray-400">
                        {strategy.currentProgress}% progrès
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-2">{strategy.strategy.description}</p>
                  
                  {strategy.missingCards.length > 0 && (
                    <div className="text-sm text-red-400 mb-2">
                      ❌ Cartes manquantes: {strategy.missingCards.length}
                    </div>
                  )}
                  
                  {strategy.nextSteps.length > 0 && (
                    <div className="text-sm text-blue-400">
                      📝 Prochaines étapes:
                      <ul className="list-disc list-inside mt-1">
                        {strategy.nextSteps.map((step, stepIndex) => (
                          <li key={stepIndex}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Onglet Conditions de victoire */}
        {activeTab === 'victory' && (
          <div>
            <h3 className="text-lg font-bold mb-3">🏆 Conditions de victoire</h3>
            
            {/* État actuel */}
            <div className="bg-gray-700 rounded-lg p-3 mb-4">
              <h4 className="font-semibold mb-2">📊 État de la partie</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Fin de partie:</span>
                  <span className={victoryCheck.gameOver ? 'text-red-400' : 'text-green-400'}>
                    {victoryCheck.gameOver ? 'OUI' : 'NON'}
                  </span>
                </div>
                
                {victoryCheck.gameOver ? (
                  <>
                    <div className="flex justify-between">
                      <span>Vainqueur:</span>
                      <span className="text-yellow-400">{victoryCheck.winner}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Raison:</span>
                      <span className="text-red-400">{victoryCheck.reason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Condition:</span>
                      <span className="text-blue-400">{victoryCheck.condition}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>Condition actuelle:</span>
                    <span className="text-gray-400">{victoryCheck.condition}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Points de vie */}
            <div className="bg-gray-700 rounded-lg p-3 mb-4">
              <h4 className="font-semibold mb-2">❤️ Points de vie</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Joueur:</span>
                  <span className="text-green-400">{player.lifePoints} PV</span>
                </div>
                <div className="flex justify-between">
                  <span>Adversaire:</span>
                  <span className="text-red-400">{gameState[playerId === 'player' ? 'opponent' : 'player'].lifePoints} PV</span>
                </div>
              </div>
            </div>
            
            {/* Autres conditions */}
            <div className="bg-gray-700 rounded-lg p-3">
              <h4 className="font-semibold mb-2">🎯 Autres conditions</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Deck joueur:</span>
                  <span className={player.deck.length === 0 ? 'text-red-400' : 'text-green-400'}>
                    {player.deck.length} cartes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Deck adversaire:</span>
                  <span className={gameState[playerId === 'player' ? 'opponent' : 'player'].deck.length === 0 ? 'text-red-400' : 'text-green-400'}>
                    {gameState[playerId === 'player' ? 'opponent' : 'player'].deck.length} cartes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Terrain joueur:</span>
                  <span className={player.field.length === 0 ? 'text-yellow-400' : 'text-green-400'}>
                    {player.field.length} cartes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Terrain adversaire:</span>
                  <span className={gameState[playerId === 'player' ? 'opponent' : 'player'].field.length === 0 ? 'text-yellow-400' : 'text-green-400'}>
                    {gameState[playerId === 'player' ? 'opponent' : 'player'].field.length} cartes
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
