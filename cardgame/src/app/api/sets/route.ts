import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const sets = await prisma.card.findMany({
      select: {
        set: true
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