import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Récupérer tous les sets depuis la base de données
    const sets = await prisma.cardSet.findMany({
      orderBy: {
        releaseDate: 'desc'
      }
    });

    console.log('Nombre total de sets:', sets.length);
    console.log('Sets disponibles:', sets.map(set => set.name));

    return NextResponse.json({ 
      success: true, 
      totalSets: sets.length,
      sets: sets
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des sets:', error);
    return NextResponse.json(
      { success: false, error: 'Échec de la récupération des sets' },
      { status: 500 }
    );
  }
} 