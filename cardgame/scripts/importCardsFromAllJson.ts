import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

type AllCard = {
  id: string
  code: string
  rarity: string
  type: string
  name: string
  cost?: string
  attribute?: string
  power?: string
  counter?: string
  color?: string
  types?: string
  effect?: string
  trigger?: string
  extension?: string
  image?: string
  image_local?: string
}

function parseIntOrNull(value?: string): number | null {
  if (!value) return null
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === '-' || trimmed.toLowerCase() === 'null') return null
  const n = parseInt(trimmed, 10)
  return Number.isFinite(n) ? n : null
}

function parseIntOrZero(value?: string): number {
  const n = parseIntOrNull(value)
  return n ?? 0
}

function extractSetCode(extension?: string): string | null {
  if (!extension) return null
  const match = /\[(.*?)\]/.exec(extension)
  return match?.[1] ?? null
}

function normalizeSetName(extension?: string): string | null {
  if (!extension) return null
  // Retirer préfixes comme "Card Set(s)-" et espaces superflus
  let name = extension.replace(/^Card Set\(s\)-/i, '')
  name = name.replace(/\s+/g, ' ').trim()
  return name
}

function normalizeColor(value?: string): string {
  return (value ?? '').trim()
}

async function main() {
  try {
    const jsonPath = path.join(process.cwd(), 'exports', 'all-cards.json')
    const raw = fs.readFileSync(jsonPath, 'utf-8')
    const cards: AllCard[] = JSON.parse(raw)

    console.log(`Import de ${cards.length} cartes depuis all-cards.json`)

    // Sets uniques
    const setMap = new Map<string, { name: string; code: string | null }>()
    const rarityMap = new Map<string, { name: string; color: string; dropRate: number }>()

    const getRarityColor = (rarity: string): string => {
      switch (rarity) {
        case 'C': return '#A0A0A0'
        case 'UC': return '#0000FF'
        case 'R': return '#FF0000'
        case 'SR': return '#FF00FF'
        case 'SEC': return '#FFD700'
        case 'L': return '#00FF00'
        case 'TR': return '#AA8800'
        default: return '#FFFFFF'
      }
    }

    const getRarityDropRate = (rarity: string): number => {
      switch (rarity) {
        case 'C': return 0.70
        case 'UC': return 0.20
        case 'R': return 0.07
        case 'SR': return 0.02
        case 'SEC': return 0.01
        case 'L': return 0.05
        case 'TR': return 0.005
        default: return 0.01
      }
    }

    for (const c of cards) {
      const setName = normalizeSetName(c.extension ?? undefined)
      const setCode = extractSetCode(c.extension ?? undefined)
      if (setName && !setMap.has(setName)) {
        setMap.set(setName, { name: setName, code: setCode })
      }
      if (c.rarity && !rarityMap.has(c.rarity)) {
        rarityMap.set(c.rarity, { name: c.rarity, color: getRarityColor(c.rarity), dropRate: getRarityDropRate(c.rarity) })
      }
    }

    console.log(`Sets uniques: ${setMap.size}, Raretés uniques: ${rarityMap.size}`)

    // Upsert sets
    for (const { name, code } of setMap.values()) {
      await prisma.cardSet.upsert({
        where: { code: code ?? name },
        update: { name },
        create: {
          code: code ?? name,
          name,
          releaseDate: new Date(),
          description: `Set ${name}`,
        },
      })
    }

    // Upsert rarities
    for (const { name, color, dropRate } of rarityMap.values()) {
      await prisma.cardRarity.upsert({
        where: { name },
        update: { color, dropRate },
        create: { name, color, dropRate },
      })
    }

    let imported = 0
    for (const c of cards) {
      try {
        const cost = parseIntOrZero(c.cost)
        const power = parseIntOrNull(c.power)
        const counterStr = (c.counter && c.counter.trim() !== '-' && c.counter.trim() !== '') ? c.counter.trim() : null
        const setCode = extractSetCode(c.extension ?? undefined)
        const setName = normalizeSetName(c.extension ?? undefined)
        const imageUrl = c.image ?? ''
        const family = c.types ?? null
        const color = normalizeColor(c.color)

        await prisma.card.upsert({
          where: { id: c.id },
          update: {
            code: c.code,
            name: c.name,
            type: c.type,
            color,
            cost,
            power: power ?? undefined,
            counter: counterStr,
            effect: c.effect ?? null,
            rarity: c.rarity,
            imageUrl,
            set: setName,
            attribute: c.attribute ?? null,
            attributeImage: null,
            family,
            ability: c.effect ?? null,
            trigger: c.trigger ?? null,
            notes: null,
            setCode: setCode ?? undefined,
            rarityName: c.rarity,
            isAltArt: c.id.includes('_p') || c.id.toLowerCase().includes('alt'),
            isParallel: c.id.includes('_p'),
            isSpecial: false,
          },
          create: {
            id: c.id,
            code: c.code,
            name: c.name,
            type: c.type,
            color,
            cost,
            power: power ?? undefined,
            counter: counterStr,
            effect: c.effect ?? null,
            rarity: c.rarity,
            imageUrl,
            set: setName,
            attribute: c.attribute ?? null,
            attributeImage: null,
            family,
            ability: c.effect ?? null,
            trigger: c.trigger ?? null,
            notes: null,
            setCode: setCode ?? undefined,
            rarityName: c.rarity,
            isAltArt: c.id.includes('_p') || c.id.toLowerCase().includes('alt'),
            isParallel: c.id.includes('_p'),
            isSpecial: false,
          },
        })
        imported++
        if (imported % 200 === 0) console.log(`${imported} cartes traitées...`)
      } catch (e) {
        console.error(`Erreur sur la carte ${c.id}`, e)
      }
    }

    console.log(`Terminé: ${imported} cartes importées/mises à jour.`)
  } catch (e) {
    console.error('Erreur import:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()


