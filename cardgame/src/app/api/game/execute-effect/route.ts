import { NextRequest, NextResponse } from 'next/server';
import { CardEffectsService, CardEffect } from '@/lib/game/cardEffectsService';
import { GameState } from '@/types/game';

export async function POST(request: NextRequest) {
  try {
    const { gameState, effect, sourceCardId, targetCardId, playerId } = await request.json();

    if (!gameState || !effect || !sourceCardId || !playerId) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    console.log('✨ Exécution d\'un effet de carte...');
    console.log('📍 Effet:', effect.description);
    console.log('📍 Carte source:', sourceCardId);
    console.log('📍 Carte cible:', targetCardId || 'Aucune');
    console.log('📍 Joueur:', playerId);

    // Trouver la carte source
    const sourceCard = findCardInGameState(gameState, sourceCardId);
    if (!sourceCard) {
      return NextResponse.json(
        { error: 'Carte source non trouvée' },
        { status: 400 }
      );
    }

    // Trouver la carte cible si spécifiée
    let targetCard = undefined;
    if (targetCardId) {
      targetCard = findCardInGameState(gameState, targetCardId);
      if (!targetCard) {
        return NextResponse.json(
          { error: 'Carte cible non trouvée' },
          { status: 400 }
        );
      }
    }

    // Exécuter l'effet
    const updatedState = CardEffectsService.executeEffect(
      gameState,
      effect,
      sourceCard,
      targetCard,
      playerId
    );

    console.log('✅ Effet exécuté avec succès !');

    return NextResponse.json({
      success: true,
      gameState: updatedState,
      message: 'Effet exécuté avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution de l\'effet:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'exécution de l\'effet' },
      { status: 500 }
    );
  }
}

/**
 * Trouve une carte dans l'état du jeu
 */
function findCardInGameState(gameState: GameState, cardId: string) {
  // Chercher dans le terrain du joueur
  const playerFieldCard = gameState.player.field.find(card => card.id === cardId);
  if (playerFieldCard) return playerFieldCard;
  
  // Chercher dans le Leader du joueur
  if (gameState.player.leader && gameState.player.leader.id === cardId) {
    return gameState.player.leader;
  }
  
  // Chercher dans la main du joueur
  const playerHandCard = gameState.player.hand.find(card => card.id === cardId);
  if (playerHandCard) return playerHandCard;
  
  // Chercher dans le terrain de l'adversaire
  const opponentFieldCard = gameState.opponent.field.find(card => card.id === cardId);
  if (opponentFieldCard) return opponentFieldCard;
  
  // Chercher dans le Leader de l'adversaire
  if (gameState.opponent.leader && gameState.opponent.leader.id === cardId) {
    return gameState.opponent.leader;
  }
  
  // Chercher dans la main de l'adversaire
  const opponentHandCard = gameState.opponent.hand.find(card => card.id === cardId);
  if (opponentHandCard) return opponentHandCard;
  
  return null;
}
