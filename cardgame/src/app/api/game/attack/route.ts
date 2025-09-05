import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ManualGameService } from '@/lib/game/manualGameService'
import { GamePersistenceService } from '@/lib/game/gamePersistenceService'

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { attackerId, targetId, playerId = 'player' } = await request.json()
    
    if (!attackerId || !targetId) {
      return NextResponse.json(
        { error: 'ID de l\'attaquant et de la cible requis' },
        { status: 400 }
      )
    }

    // Récupérer l'état actuel du jeu depuis la base de données
    const currentGameState = await GamePersistenceService.getActiveGameState(session.user.id);
    
    if (!currentGameState) {
      return NextResponse.json(
        { error: 'Aucune partie en cours. Initialisez d\'abord le jeu.' },
        { status: 404 }
      )
    }

    // Vérifier que nous sommes en phase BATTLE
    if (currentGameState.currentPhase !== 'BATTLE') {
      return NextResponse.json(
        { error: 'Action non autorisée. Vous devez être en phase BATTLE pour attaquer.' },
        { status: 400 }
      )
    }

    // Vérifier que l'action est valide
    if (!ManualGameService.canPerformAction(currentGameState, 'attack', playerId, attackerId)) {
      return NextResponse.json(
        { error: 'Action non autorisée' },
        { status: 400 }
      )
    }

    // Exécuter l'attaque
    const updatedGameState = ManualGameService.attack(currentGameState, attackerId, targetId, playerId);
    
    // Vérifier si la partie est terminée
    if (updatedGameState.opponent.lifePoints <= 0) {
      console.log('🏆 Partie terminée ! Le joueur a gagné !');
      // Marquer la partie comme terminée
      const gameEndState = {
        ...updatedGameState,
        gameOver: true,
        winner: 'player'
      };
      
      // Sauvegarder l'état final
      await GamePersistenceService.saveGameState(
        gameEndState,
        session.user.id,
        session.user.id
      );
      
      return NextResponse.json(gameEndState);
    }
    
    if (updatedGameState.player.lifePoints <= 0) {
      console.log('💀 Partie terminée ! L\'adversaire a gagné !');
      // Marquer la partie comme terminée
      const gameEndState = {
        ...updatedGameState,
        gameOver: true,
        winner: 'opponent'
      };
      
      // Sauvegarder l'état final
      await GamePersistenceService.saveGameState(
        gameEndState,
        session.user.id,
        session.user.id
      );
      
      return NextResponse.json(gameEndState);
    }
    
    // Sauvegarder l'état mis à jour
    await GamePersistenceService.saveGameState(
      updatedGameState,
      session.user.id,
      session.user.id
    );

    return NextResponse.json(updatedGameState)
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'attaque:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
