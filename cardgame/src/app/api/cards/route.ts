import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    console.log('Début de la requête GET /api/cards');
    
    const session = await getServerSession(authOptions);
    console.log('Session:', session);

    if (!session?.user?.email) {
      console.log('Utilisateur non authentifié');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('Recherche des cartes pour:', session.user.email);
    const cards = await prisma.card.findMany({
      where: {
        users: {
          some: {
            email: session.user.email
          }
        }
      }
    });
    console.log('Cartes trouvées:', cards.length);

    return NextResponse.json(cards);
  } catch (error) {
    console.error('Erreur lors de la récupération des cartes:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
} 