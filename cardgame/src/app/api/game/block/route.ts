import { NextRequest, NextResponse } from 'next/server';
import { CombatService } from '@/lib/game/combatService';
import { auth } from '@/lib/auth';
import { GamePersistenceService } from '@/lib/game/gamePersistenceService';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { blockerId, attackActionId, playerId } = await request.json();
    if (playerId !== 'player' && playerId !== 'opponent') return NextResponse.json({ error: 'Joueur invalide' }, { status: 400 });
    const gameState = await GamePersistenceService.getActiveGameState(session.user.id);

    if (!gameState || !blockerId || !attackActionId || !playerId) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    console.log('🛡️ Exécution du blocage...');
    console.log('📍 Bloqueur:', blockerId);
    console.log('📍 Action bloquée:', attackActionId);
    console.log('📍 Joueur:', playerId);

    // Vérifier que le blocage est valide
    if (!CombatService.canBlock(gameState, blockerId, attackActionId, playerId)) {
      return NextResponse.json(
        { error: 'Blocage invalide' },
        { status: 400 }
      );
    }

    // Exécuter le blocage
    const updatedState = CombatService.executeBlock(gameState, blockerId, attackActionId, playerId);

    await GamePersistenceService.saveGameState(updatedState, session.user.id, session.user.id);

    return NextResponse.json({
      success: true,
      gameState: updatedState,
      message: 'Blocage exécuté avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur lors du blocage:', error);
    return NextResponse.json(
      { error: 'Erreur lors du blocage' },
      { status: 500 }
    );
  }
}
