import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface CardInfo {
  id: string;
  name: string;
  number: string;
  rarity: string;
  type: string;
  cost: number;
  power: number;
  counter: string;
  color: string;
  family: string;
  ability: string;
  trigger: string;
  images: {
    small: string;
    large: string;
  };
  set: {
    id: string;
    name: string;
    series: string;
  };
}

export async function GET() {
  try {
    const API_KEY = "a5efebe9adc836a0d6d3798bf21658b03cda8e322ba5d7e57fa4e2cc12f84179";
    
    const response = await fetch('https://apitcg.com/api/one-piece/cards', {
      headers: {
        'X-Api-Key': API_KEY
      }
    });
    const data = await response.json();
    
    const cards = data.data.map((card: any) => ({
      id: card.id,
      name: card.name,
      number: card.number,
      rarity: card.rarity,
      type: card.type,
      cost: card.cost,
      power: card.power,
      counter: card.counter,
      color: card.color,
      family: card.family,
      ability: card.ability,
      trigger: card.trigger,
      images: {
        small: card.images.small,
        large: card.images.large
      },
      set: {
        id: card.set.id,
        name: card.set.name,
        series: card.set.series
      }
    }));

    console.log('Nombre total de cartes:', cards.length);
    console.log('Exemple de carte:', cards[0]);

    return NextResponse.json({ 
      success: true, 
      totalCards: cards.length,
      cards: cards
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des cartes:', error);
    return NextResponse.json(
      { success: false, error: 'Échec de la récupération des cartes' },
      { status: 500 }
    );
  }
} 