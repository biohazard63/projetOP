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

    const { cardId, playerId = 'player' } = await request.json()
    
    if (!cardId) {
      return NextResponse.json(
        { error: 'ID de carte manquant' },
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

    // Vérifier que l'action est valide
    if (!ManualGameService.canPerformAction(currentGameState, 'playCard', playerId, cardId)) {
      return NextResponse.json(
        { error: 'Action non autorisée' },
        { status: 400 }
      )
    }

    // Jouer la carte
    const updatedGameState = ManualGameService.playCard(currentGameState, playerId, cardId);
    
    console.log('🎮 API playCard - updatedGameState.player.field:', updatedGameState.player.field);
    
    // Sauvegarder l'état mis à jour
    await GamePersistenceService.saveGameState(
      updatedGameState,
      session.user.id,
      session.user.id
    );

    return NextResponse.json(updatedGameState)
    
  } catch (error) {
    console.error('❌ Erreur lors du jeu de carte:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
} 