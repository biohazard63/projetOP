import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { catalogById } from '@/lib/catalog/cache'
import { frenchText } from '@/lib/cards/frenchText'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// French texts of up to 60 cards (?ids=a,b,c): only the cards that have one are returned.
export async function GET(request: Request) {
  const ids = [...new Set((new URL(request.url).searchParams.get('ids') ?? '').split(',').map(id => id.trim()).filter(Boolean))].slice(0, 60)
  if (!ids.length) return NextResponse.json({ texts: {} })
  try {
    const byId = await catalogById(prisma), cards = ids.flatMap(id => byId.get(id) ?? [])
    return NextResponse.json({ texts: Object.fromEntries(cards.flatMap(card => { const fr = frenchText(card); return fr ? [[card.id, fr]] : [] })) })
  } catch {
    console.error('Erreur GET /api/cards/text')
    return NextResponse.json({ error: 'Textes indisponibles' }, { status: 500 })
  }
}
