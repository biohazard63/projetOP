import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mainSets = [
  '-ROMANCE DAWN- [OP01]',
  '-PARAMOUNT WAR- [OP02]',
  '-PILLARS OF STRENGTH- [OP03]',
  '-KINGDOMS OF INTRIGUE- [OP04]',
  'OP-05',
  '-WINGS OF THE CAPTAIN-[OP06]',
  '-500 YEARS IN THE FUTURE- [OP-07]',
  '-TWO LEGENDS- [OP-08]',
  '-EMPERORS IN THE NEW WORLD- [OP-09]',
  '-Memorial Collection- [EB-01]',
  '-ONE PIECE CARD THE BEST- [PRB-01]',
  // 'Anime Expo 2023',
  // 'Event Pack Vol.3',
  // 'GIFT COLLECTION 2023 [GC-01]',
  // 'Included in Event Pack Vol.1',
  // 'Included in Event Pack Vol.2',
  // 'Included in Online Regional Participation Pack Vol.1',
  // 'Pre-Release OP03',
  // 'Premium Card Collection -25th Edition-',
  // 'Premium Card Collection -FILM RED Edition-',
];

export async function GET() {
  try {
    const sets = await prisma.card.findMany({
      select: {
        set: true
      },
      where: {
        set: {
          in: mainSets
        }
      },
      distinct: ['set'],
      orderBy: {
        set: 'asc'
      }
    });

    return NextResponse.json({ sets: sets.map(s => s.set) });
  } catch (error) {
    console.error('Erreur lors de la récupération des sets:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des sets' },
      { status: 500 }
    );
  }
} 