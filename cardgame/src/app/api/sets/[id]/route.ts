import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const API_KEY = "a5efebe9adc836a0d6d3798bf21658b03cda8e322ba5d7e57fa4e2cc12f84179";
    
    // Récupérer tous les sets
    const setsResponse = await fetch('https://apitcg.com/api/one-piece/sets', {
      headers: {
        'X-Api-Key': API_KEY
      }
    });
    const setsData = await setsResponse.json();
    
    console.log('Nombre total de sets:', setsData.data.length);
    console.log('Sets disponibles:', setsData.data.map((set: any) => set.id));

    // Récupérer les cartes du set spécifique
    const cardsResponse = await fetch(`https://apitcg.com/api/one-piece/cards?q=set.id:${params.id}`, {
      headers: {
        'X-Api-Key': API_KEY
      }
    });
    const cardsData = await cardsResponse.json();

    if (!cardsData.data) {
      throw new Error('Aucune donnée reçue de l\'API')
    }

    const cards = cardsData.data.map((card: any) => ({
      id: card.id,
      name: card.name,
      number: card.number,
      rarity: card.rarity,
      images: {
        small: card.images.small,
        large: card.images.large
      },
      set: {
        id: card.set.id,
        name: card.set.name,
        series: card.set.series
      }
    }))

    return NextResponse.json({ 
      success: true, 
      totalSets: setsData.data.length,
      sets: setsData.data,
      cards 
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error)
    return NextResponse.json(
      { success: false, error: 'Échec de la récupération des données' },
      { status: 500 }
    )
  }
} 