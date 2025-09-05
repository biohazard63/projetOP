import React, { useState, useEffect } from 'react';
import { GameState } from '@/types/game';
import { StrategyService } from '@/lib/game/strategyService';
import { TrendingUp, TrendingDown, Minus, Target, Zap, Shield, Heart, AlertTriangle } from 'lucide-react';

interface StrategyAnalyzerProps {
  gameState: GameState;
  playerId: 'player' | 'opponent';
}

export default function StrategyAnalyzer({ gameState, playerId }: StrategyAnalyzerProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [position, setPosition] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Analyser l'état du jeu
    const currentAnalysis = StrategyService.analyzeGameState(gameState, playerId);
    const currentPosition = StrategyService.evaluatePosition(gameState, playerId);
    
    setAnalysis(currentAnalysis);
    setPosition(currentPosition);
    setRecommendations(currentPosition.recommendations);
    setLastUpdate(new Date());
  }, [gameState, playerId]);

  if (!analysis || !position) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-white">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const getPositionIcon = () => {
    switch (position.position) {
      case 'WINNING':
        return <TrendingUp className="text-green-400" size={20} />;
      case 'LOSING':
        return <TrendingDown className="text-red-400" size={20} />;
      default:
        return <Minus className="text-yellow-400" size={20} />;
    }
  };

  const getPositionColor = () => {
    switch (position.position) {
      case 'WINNING':
        return 'text-green-400';
      case 'LOSING':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getFieldStrengthColor = (strength: number) => {
    if (strength >= 5000) return 'text-green-400';
    if (strength >= 3000) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHandQualityColor = (quality: number) => {
    if (quality >= 1000) return 'text-green-400';
    if (quality >= 500) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getDeckEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 50) return 'text-green-400';
    if (efficiency >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 text-white">
      {/* En-tête avec position */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">🧠 Analyseur stratégique</h3>
        <div className="flex items-center space-x-2">
          {getPositionIcon()}
          <span className={`font-semibold ${getPositionColor()}`}>
            {position.position}
          </span>
          <span className="text-sm text-gray-400">
            {position.confidence}%
          </span>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Force du terrain */}
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Target size={16} className="text-blue-400" />
            <span className="text-sm font-medium">Force du terrain</span>
          </div>
          <div className={`text-2xl font-bold ${getFieldStrengthColor(analysis.fieldStrength)}`}>
            {analysis.fieldStrength.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {analysis.fieldStrength >= 5000 ? 'Excellent' : 
             analysis.fieldStrength >= 3000 ? 'Bon' : 'Faible'}
          </div>
        </div>

        {/* Qualité de la main */}
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Zap size={16} className="text-green-400" />
            <span className="text-sm font-medium">Qualité de la main</span>
          </div>
          <div className={`text-2xl font-bold ${getHandQualityColor(analysis.handQuality)}`}>
            {analysis.handQuality.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {analysis.handQuality >= 1000 ? 'Excellente' : 
             analysis.handQuality >= 500 ? 'Bonne' : 'Moyenne'}
          </div>
        </div>

        {/* Efficacité du deck */}
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Shield size={16} className="text-yellow-400" />
            <span className="text-sm font-medium">Efficacité du deck</span>
          </div>
          <div className={`text-2xl font-bold ${getDeckEfficiencyColor(analysis.deckEfficiency)}`}>
            {analysis.deckEfficiency}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {analysis.deckEfficiency >= 50 ? 'Excellente' : 
             analysis.deckEfficiency >= 25 ? 'Bonne' : 'Moyenne'}
          </div>
        </div>
      </div>

      {/* Score global et avantage en PV */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp size={16} className="text-purple-400" />
            <span className="text-sm font-medium">Score global</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {analysis.overallScore.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Score basé sur tous les critères
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Heart size={16} className="text-red-400" />
            <span className="text-sm font-medium">Avantage en PV</span>
          </div>
          <div className={`text-2xl font-bold ${
            analysis.lifeAdvantage > 0 ? 'text-green-400' : 
            analysis.lifeAdvantage < 0 ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {analysis.lifeAdvantage > 0 ? '+' : ''}{analysis.lifeAdvantage}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {analysis.lifeAdvantage > 0 ? 'Avantage' : 
             analysis.lifeAdvantage < 0 ? 'Désavantage' : 'Équilibre'}
          </div>
        </div>
      </div>

      {/* Recommandations */}
      {recommendations.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle size={16} className="text-yellow-400" />
            <span className="text-sm font-medium">💡 Recommandations</span>
          </div>
          <ul className="space-y-1">
            {recommendations.map((recommendation, index) => (
              <li key={index} className="text-sm text-gray-300 flex items-start space-x-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dernière mise à jour */}
      <div className="text-xs text-gray-500 text-center mt-4">
        Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
}
