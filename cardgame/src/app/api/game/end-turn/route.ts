import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ManualGameService } from '@/lib/game/manualGameService'
import { GamePersistenceService } from '@/lib/game/gamePersistenceService'

export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
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

    // Vérifier que l'action est valide pour le joueur actif
    const currentPlayer = currentGameState.currentPlayer;
    if (!ManualGameService.canPerformAction(currentGameState, 'endTurn', currentPlayer)) {
      return NextResponse.json(
        { error: 'Action non autorisée' },
        { status: 400 }
      )
    }

    // Terminer le tour
    const updatedGameState = ManualGameService.endTurn(currentGameState);
    
    // Sauvegarder l'état mis à jour
    await GamePersistenceService.saveGameState(
      updatedGameState,
      session.user.id,
      session.user.id
    );

    return NextResponse.json(updatedGameState)
    
  } catch (error) {
    console.error('❌ Erreur lors de la fin de tour:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 