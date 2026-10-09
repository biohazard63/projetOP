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

    // Récupérer l'état actuel du jeu depuis la base de données
    const currentGameState = await GamePersistenceService.getActiveGameState(session.user.id);
    
    if (!currentGameState) {
      return NextResponse.json(
        { error: 'Aucune partie en cours. Initialisez d\'abord le jeu.' },
        { status: 404 }
      )
    }

    // Vérifier que nous sommes en phase SETUP
    if (currentGameState.currentPhase !== 'SETUP') {
      return NextResponse.json(
        { error: 'Action non autorisée. Vous devez être en phase SETUP pour faire un mulligan.' },
        { status: 400 }
      )
    }

    // Vérifier que la main n'a pas encore été gardée
    if (currentGameState.hasKeptHand) {
      return NextResponse.json(
        { error: 'Vous avez déjà gardé votre main.' },
        { status: 400 }
      )
    }

    // Effectuer le mulligan
    const updatedGameState = ManualGameService.mulligan(currentGameState, 'player');
    
    // Sauvegarder l'état mis à jour
    await GamePersistenceService.saveGameState(
      updatedGameState,
      session.user.id,
      session.user.id
    );

    return NextResponse.json(updatedGameState)
    
  } catch (error) {
    console.error('❌ Erreur lors du mulligan:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 