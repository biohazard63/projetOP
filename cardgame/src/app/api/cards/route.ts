import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
;
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Cache en mémoire pour stocker les cartes
let cachedCards: any[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures en millisecondes

export async function GET() {
  const startTime = Date.now();
  console.log('Début de la requête GET /api/cards');
  
  try {
    // Vérifier si le cache est valide
    const now = Date.now();
    if (cachedCards && (now - lastFetchTime) < CACHE_DURATION) {
      const cacheTime = Date.now() - startTime;
      console.log(`Utilisation du cache pour les cartes (${cacheTime}ms)`);
      return NextResponse.json(cachedCards);
    }

    console.log('Début de la récupération des cartes depuis la base de données...');
    
    // Récupérer toutes les cartes de la base de données
    const cards = await prisma.card.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        color: true,
        cost: true,
        power: true,
        counter: true,
        effect: true,
        rarity: true,
        imageUrl: true,
        set: true,
        attribute: true,
        family: true,
        ability: true,
        trigger: true,
        isParallel: true,
        isAltArt: true,
        isSpecial: true
      }
    });

    const totalTime = Date.now() - startTime;
    console.log('Récupération terminée:');
    console.log(`- Temps total: ${totalTime}ms`);
    console.log(`- Nombre total de cartes: ${cards.length}`);
    
    // Mettre à jour le cache
    cachedCards = cards;
    lastFetchTime = now;

    return NextResponse.json(cards);
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`Erreur après ${errorTime}ms:`, error);
    return NextResponse.json(
      { success: false, error: 'Échec de la récupération des cartes' },
      { status: 500 }
    );
  }
} 