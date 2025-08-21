import 'dotenv/config'
import { PrismaClient, Card } from '@prisma/client'

const prisma = new PrismaClient()

type CliArgs = {
  set?: string
  runs: number
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  const out: CliArgs = { runs: 100 }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if ((a === '--set' || a === '-s') && args[i + 1]) {
      out.set = args[++i]
    } else if ((a === '--runs' || a === '-n') && args[i + 1]) {
      out.runs = Number(args[++i]) || 100
    }
  }
  return out
}

function normalizeSetCode(code: string): string {
  return code.replace(/[-\s]/g, '').toUpperCase()
}

async function listAvailableSetCodes(): Promise<string[]> {
  const sets = await prisma.cardSet.findMany({ select: { code: true, name: true } })
  const codes = new Set<string>()
  for (const s of sets) if (s.code) codes.add(s.code)
  return Array.from(codes).sort()
}

type MinimalSetRules = { code: string }

async function generateBooster(setRules: MinimalSetRules): Promise<Card[]> {
  const normalizedSetCode = normalizeSetCode(setRules.code)

  // même distribution que l'API
  const distribution = [
    { rarity: 'C', count: 5, positions: [1, 2, 3, 4, 5] },
    { rarity: 'UC', count: 3, positions: [6, 7, 8] },
    { rarity: 'R', count: 2, positions: [9, 10] },
    { rarity: 'SR', count: 0.5, positions: [11] },
    { rarity: 'R', count: 0.5, positions: [11] },
    { rarity: 'R', count: 0.4, positions: [12] },
    { rarity: 'SR', count: 0.2, positions: [12] },
    { rarity: 'L', count: 0.2, positions: [12] },
    { rarity: 'SEC', count: 0.10, positions: [12] },
    { rarity: 'SP CARD', count: 0.1, positions: [12] },
    { rarity: 'TR', count: 0.05, positions: [12] },
  ]

  const allCards = await prisma.card.findMany({
    where: {
      OR: [
        { setCode: normalizedSetCode },
        { setCode: `OP-${normalizedSetCode.replace('OP', '')}` },
        { setCode: normalizedSetCode.replace('-', '') },
        { set: { contains: normalizedSetCode } },
        { setCode: `EB-${normalizedSetCode.replace('EB', '')}` },
        { setCode: `PRB-${normalizedSetCode.replace('PRB', '')}` },
        { setCode: normalizedSetCode.replace('EB', 'EB-') },
        { setCode: normalizedSetCode.replace('PRB', 'PRB-') },
      ],
    },
  })

  const getAltLevel = (cardId: string): number => {
    const m = /_p(\d+)$/.exec(cardId)
    return m ? parseInt(m[1]!, 10) : 0
  }

  const shouldIncludeAlt = (cardId: string): boolean => {
    const alt = getAltLevel(cardId)
    if (alt === 0) return true
    const r = Math.random()
    if (alt === 1) return r < 0.15
    if (alt === 2) return r < 0.05
    if (alt === 3) return r < 0.01
    return r < 0.005
  }

  const filteredCards = allCards.filter((c) => shouldIncludeAlt(c.id))

  const cardsByRarity: Record<string, Card[]> = {}
  for (const c of filteredCards) {
    const key = c.rarity
    if (!cardsByRarity[key]) cardsByRarity[key] = []
    cardsByRarity[key].push(c)
  }

  const booster: Array<Card | null> = new Array(12).fill(null)

  // Pos 1-6: C (fallback UC)
  for (let i = 0; i < 6; i++) {
    if (cardsByRarity['C']?.length) {
      const idx = Math.floor(Math.random() * cardsByRarity['C'].length)
      booster[i] = cardsByRarity['C'].splice(idx, 1)[0]
    } else if (cardsByRarity['UC']?.length) {
      const idx = Math.floor(Math.random() * cardsByRarity['UC'].length)
      booster[i] = cardsByRarity['UC'].splice(idx, 1)[0]
    }
  }

  // Pos 7-9: UC (fallback C)
  for (let i = 0; i < 3; i++) {
    const pos = i + 6
    if (cardsByRarity['UC']?.length) {
      const idx = Math.floor(Math.random() * cardsByRarity['UC'].length)
      booster[pos] = cardsByRarity['UC'].splice(idx, 1)[0]
    } else if (cardsByRarity['C']?.length) {
      const idx = Math.floor(Math.random() * cardsByRarity['C'].length)
      booster[pos] = cardsByRarity['C'].splice(idx, 1)[0]
    }
  }

  // Pos 10-11: R ou SR 50/50 (avec fallbacks)
  for (const pos of [9, 10]) {
    const sr = Math.random() < 0.5
    if (sr && cardsByRarity['SR']?.length) {
      const idx = Math.floor(Math.random() * cardsByRarity['SR'].length)
      booster[pos] = cardsByRarity['SR'].splice(idx, 1)[0]
    } else if (cardsByRarity['R']?.length) {
      const idx = Math.floor(Math.random() * cardsByRarity['R'].length)
      booster[pos] = cardsByRarity['R'].splice(idx, 1)[0]
    } else if (cardsByRarity['UC']?.length) {
      const idx = Math.floor(Math.random() * cardsByRarity['UC'].length)
      booster[pos] = cardsByRarity['UC'].splice(idx, 1)[0]
    }
  }

  // Pos 12: mix pondéré
  const r = Math.random()
  const place = (rarity: string) => {
    if (cardsByRarity[rarity]?.length) {
      const idx = Math.floor(Math.random() * cardsByRarity[rarity].length)
      booster[11] = cardsByRarity[rarity].splice(idx, 1)[0]
    }
  }
  if (r < 0.3) place('R')
  else if (r < 0.5) place('SR')
  else if (r < 0.7) place('L')
  else if (r < 0.85) place('SEC')
  else if (r < 0.95) place('SP CARD')
  else if (cardsByRarity['TR']?.length) place('TR')
  else if (cardsByRarity['R']?.length) place('R')

  // Remplissage des vides jusqu'à 12 cartes (avec doublons si nécessaire)
  for (let i = 0; i < booster.length; i++) {
    if (!booster[i]) {
      const pickFromPool = (rarity: string): Card | null => {
        const pool = cardsByRarity[rarity]
        if (pool?.length) {
          const idx = Math.floor(Math.random() * pool.length)
          return pool.splice(idx, 1)[0]!
        }
        return null
      }

      let chosen: Card | null =
        pickFromPool('C') ??
        pickFromPool('UC') ??
        pickFromPool('R') ??
        pickFromPool('SR') ??
        pickFromPool('L') ??
        pickFromPool('SEC') ??
        pickFromPool('SP CARD') ??
        pickFromPool('TR')

      if (!chosen) {
        // Aucun pool restant: autoriser les doublons depuis l'ensemble des cartes filtrées
        const source = filteredCards.length ? filteredCards : allCards
        if (source.length) {
          const idx = Math.floor(Math.random() * source.length)
          chosen = source[idx]!
        } else {
          // Dernier recours: dupliquer une carte déjà placée dans le booster
          const existing = booster.filter((c): c is Card => c !== null)
          if (existing.length) {
            const idx = Math.floor(Math.random() * existing.length)
            chosen = existing[idx]!
          }
        }
      }

      booster[i] = chosen
    }
  }

  return booster.filter((c): c is Card => c !== null)
}

async function run() {
  const args = parseArgs()
  const available = await listAvailableSetCodes()
  const targets = args.set ? [args.set] : available

  console.log(`Sets ciblés: ${targets.join(', ')}`)
  console.log(`Itérations par set: ${args.runs}`)

  for (const set of targets) {
    const packSize = 12
    const stats = {
      totalBoosters: 0,
      totalCards: 0,
      rarity: new Map<string, number>(),
      position: new Map<number, Map<string, number>>(),
      invalidCount: 0,
    }

    for (let i = 0; i < args.runs; i++) {
      const booster = await generateBooster({ code: set })
      stats.totalBoosters++
      stats.totalCards += booster.length
      if (booster.length !== packSize) stats.invalidCount++
      booster.forEach((card, idx) => {
        const r = card.rarity
        stats.rarity.set(r, (stats.rarity.get(r) || 0) + 1)
        const p = idx + 1
        if (!stats.position.has(p)) stats.position.set(p, new Map())
        const posMap = stats.position.get(p)!
        posMap.set(r, (posMap.get(r) || 0) + 1)
      })
    }

    console.log(`\n=== Résultats pour ${set} ===`)
    console.log(`Boosters: ${stats.totalBoosters}  | Cartes: ${stats.totalCards}  | Boosters invalides (≠${packSize} cartes): ${stats.invalidCount}`)
    console.log(`Par rareté:`)
    for (const [r, c] of Array.from(stats.rarity.entries()).sort()) {
      const pct = ((c / stats.totalCards) * 100).toFixed(2)
      console.log(`  ${r.padEnd(7)}: ${String(c).padStart(5)} (${pct}%)`)
    }
    console.log(`Par position (1-12):`)
    for (let p = 1; p <= packSize; p++) {
      const m = stats.position.get(p) || new Map()
      const totalAtPos = Array.from(m.values()).reduce((a, b) => a + b, 0) || 1
      const line = Array.from(m.entries())
        .sort()
        .map(([r, c]) => `${r}:${c}(${((c / totalAtPos) * 100).toFixed(1)}%)`)
        .join('  ')
      console.log(`  ${String(p).padStart(2)} → ${line}`)
    }
  }
}

run()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


