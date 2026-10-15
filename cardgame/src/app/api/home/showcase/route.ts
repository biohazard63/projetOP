import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBoosterCatalog } from '@/lib/boosters/service'
import { isBoosterProduct } from '@/lib/boosters/products'
import { boosterTitle, compareCodes } from '@/lib/boosters/catalogPresentation'
import { REFERENCE_DECKS } from '@/lib/engine/decks'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Public showcase of the home page for visitors: no personal data. Boosters in their natural order with their official
// titles, a rotation of rare cards from the catalogue and a few key figures. Computed at most every 10 minutes per instance.
type Showcase = { boosters: { code: string; title: string; imageUrl: string | null; cardCount: number; available: boolean }[]; rares: { id: string; code: string; name: string; rarity: string; imageUrl: string }[]
  stats: { cards: number; boosters: number; starterDecks: number } }
let cached: { at: number; value: Showcase } | null = null
const RARE = ['SEC', 'SP CARD', 'SP', 'TR', 'SR']

export async function GET() {
  try {
    if (!cached || Date.now() - cached.at > 600_000) {
      const [sets, cards, rareRows] = await Promise.all([
        getBoosterCatalog(prisma),
        prisma.card.count(),
        prisma.card.findMany({ where: { OR: [{ rarity: { in: RARE } }, { isAltArt: true }] }, select: { id: true, code: true, name: true, rarity: true, imageUrl: true }, take: 400 }),
      ])
      const boosters = sets.filter(s => isBoosterProduct(s.code)).sort((a, b) => compareCodes(a.code, b.code))
        .map(s => ({ code: s.code, title: boosterTitle(s), imageUrl: s.imageUrl, cardCount: s.cardCount, available: s.available }))
      // A different selection each day, stable within the day.
      const day = Math.floor(Date.now() / 86_400_000), withImage = rareRows.filter(r => r.imageUrl)
      const rares = withImage.map((r, i) => ({ r, k: ((i + 1) * 2654435761 + day * 40503) % 4294967296 })).sort((a, b) => a.k - b.k).slice(0, 18).map(x => x.r)
      const starterDecks = new Set(REFERENCE_DECKS.filter(d => d.id.startsWith('starter-')).map(d => d.id.match(/^starter-st(\d+)/)?.[1])).size
      cached = { at: Date.now(), value: { boosters, rares, stats: { cards, boosters: boosters.length, starterDecks } } }
    }
    return NextResponse.json(cached.value, { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } })
  } catch {
    console.error('Erreur GET /api/home/showcase')
    return NextResponse.json({ error: 'Vitrine indisponible' }, { status: 500 })
  }
}
