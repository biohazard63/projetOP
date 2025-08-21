import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type AnyCard = {
  id: string
  code?: string
  rarity?: string
  type?: string
  name?: string
  cost?: string | number
  attribute?: string
  power?: string | number | null
  counter?: string | number | null
  color?: string
  types?: string
  effect?: string | null
  trigger?: string | null
  image?: string
  imageUrl?: string
  set?: string | null
}

type Args = { dir: string; reset?: boolean }

function parseArgs(): Args {
  const args = process.argv.slice(2)
  let dir = 'exports/sets'
  let reset = false
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if ((a === '--dir' || a === '-d') && args[i + 1]) dir = args[++i]
    if (a === '--reset') reset = true
  }
  return { dir, reset }
}

function readJson(file: string): unknown {
  const raw = fs.readFileSync(file, 'utf-8')
  return JSON.parse(raw)
}

function parseIntOrNull(v: unknown): number | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  if (s === '' || s === '-' || s.toLowerCase() === 'null') return null
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

function parseIntOrZero(v: unknown): number { return parseIntOrNull(v) ?? 0 }

function normalizeSetCode(input: string): string {
  // Accept filenames like OP-07.json, OP07.json, EB-01.json, PRB-01.json
  let code = input.toUpperCase().replace(/\.JSON$/i, '')
  code = code.replace(/[^A-Z0-9-]/g, '')
  // Insert dash if missing for OP/EB/PRB patterns
  code = code.replace(/^OP(\d{2})$/, 'OP-$1')
  code = code.replace(/^EB(\d{2})$/, 'EB-$1')
  code = code.replace(/^PRB(\d{2})$/, 'PRB-$1')
  return code
}

function buildSetName(nameFromFile: string | undefined, setCode: string): string {
  const clean = (nameFromFile || '').trim()
  if (clean) return `${clean} [${setCode}]`
  return `Set ${setCode}`
}

async function upsertSet(setCode: string, setName: string) {
  await prisma.cardSet.upsert({
    where: { code: setCode },
    update: { name: setName },
    create: { code: setCode, name: setName, releaseDate: new Date() },
  })
}

async function upsertRarity(name: string) {
  const colorMap: Record<string, string> = {
    C: '#A0A0A0', UC: '#0000FF', R: '#FF0000', SR: '#FF00FF', SEC: '#FFD700', L: '#00FF00', TR: '#AA8800', 'SP CARD': '#FF8800'
  }
  const dropMap: Record<string, number> = {
    C: 0.7, UC: 0.2, R: 0.07, SR: 0.02, SEC: 0.01, L: 0.05, TR: 0.005, 'SP CARD': 0.01
  }
  await prisma.cardRarity.upsert({
    where: { name },
    update: { color: colorMap[name] || '#FFFFFF', dropRate: dropMap[name] ?? 0.01 },
    create: { name, color: colorMap[name] || '#FFFFFF', dropRate: dropMap[name] ?? 0.01 },
  })
}

async function importFile(filePath: string, hintedSetCode?: string) {
  const fileName = path.basename(filePath)
  const setCode = normalizeSetCode(hintedSetCode || fileName)
  const data = readJson(filePath)

  if (!Array.isArray(data)) {
    console.warn(`[SKIP] ${fileName}: JSON racine non-array`)
    return
  }

  // Déduire un nom lisible si présent dans un champ commun (ex: extension)
  const first = data[0] as AnyCard | undefined
  const nameFromFile = (first?.set as string | undefined) || undefined
  const setName = buildSetName(nameFromFile, setCode)

  await upsertSet(setCode, setName)

  let count = 0
  for (const raw of data as AnyCard[]) {
    try {
      const id = String(raw.id)
      const rarity = (raw.rarity || '').toString()
      if (rarity) await upsertRarity(rarity)

      const cost = parseIntOrZero(raw.cost)
      const power = parseIntOrNull(raw.power) ?? undefined
      const counterStr = (() => {
        const c = raw.counter
        if (c === null || c === undefined) return null
        const s = String(c).trim()
        return s === '' || s === '-' ? null : s
      })()

      const imageUrl = raw.imageUrl || raw.image || ''
      const color = (raw.color || '').toString().trim()
      const family = raw.types || null

      await prisma.card.upsert({
        where: { id },
        update: {
          code: raw.code || id,
          name: raw.name || id,
          type: raw.type || 'CHARACTER',
          color,
          cost,
          power,
          counter: counterStr,
          effect: (raw.effect ?? null) as string | null,
          rarity,
          imageUrl,
          set: setName,
          attribute: raw.attribute ?? null,
          attributeImage: null,
          family,
          ability: (raw.effect ?? null) as string | null,
          trigger: (raw.trigger ?? null) as string | null,
          notes: null,
          setCode,
          rarityName: rarity,
          isAltArt: id.includes('_p') || id.toLowerCase().includes('alt'),
          isParallel: id.includes('_p'),
          isSpecial: false,
        },
        create: {
          id,
          code: raw.code || id,
          name: raw.name || id,
          type: raw.type || 'CHARACTER',
          color,
          cost,
          power,
          counter: counterStr,
          effect: (raw.effect ?? null) as string | null,
          rarity,
          imageUrl,
          set: setName,
          attribute: raw.attribute ?? null,
          attributeImage: null,
          family,
          ability: (raw.effect ?? null) as string | null,
          trigger: (raw.trigger ?? null) as string | null,
          notes: null,
          setCode,
          rarityName: rarity,
          isAltArt: id.includes('_p') || id.toLowerCase().includes('alt'),
          isParallel: id.includes('_p'),
          isSpecial: false,
        },
      })
      count++
    } catch (e) {
      console.error(`[ERROR] Carte invalide dans ${fileName}`, e)
    }
  }

  console.log(`[OK] ${fileName} → ${setCode} : ${count} cartes`)
}

function isLikelySetDirName(name: string): boolean {
  return /^(OP|EB|PRB|ST)-?\d+/i.test(name)
}

function collectJsonFiles(root: string): Array<{ file: string; setCode?: string }> {
  const out: Array<{ file: string; setCode?: string }> = []
  const entries = fs.readdirSync(root, { withFileTypes: true })
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = path.join(root, e.name)
      const hinted = isLikelySetDirName(e.name) ? normalizeSetCode(e.name) : undefined
      const files = fs.readdirSync(sub, { withFileTypes: true })
      for (const f of files) {
        if (f.isFile() && f.name.toLowerCase().endsWith('.json')) {
          out.push({ file: path.join(sub, f.name), setCode: hinted })
        }
      }
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.json')) {
      out.push({ file: path.join(root, e.name) })
    }
  }
  return out
}

async function main() {
  const { dir, reset } = parseArgs()
  const abs = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir)
  if (!fs.existsSync(abs)) {
    console.error(`Dossier introuvable: ${abs}`)
    process.exit(1)
  }

  const items = collectJsonFiles(abs)
  if (items.length === 0) {
    console.warn('Aucun fichier .json trouvé dans', abs)
    return
  }

  console.log(`Import depuis ${abs} (${items.length} fichiers) | reset=${reset}`)

  if (reset) {
    // Supprimer les cartes pour les sets présents
    const codes = Array.from(new Set(items.map((i) => normalizeSetCode(i.setCode || path.basename(i.file)))))
    console.log('Reset des sets:', codes.join(', '))
    await prisma.boosterOpeningCard.deleteMany({})
    await prisma.boosterOpening.deleteMany({})
    await prisma.boosterCard.deleteMany({})
    await prisma.deckCard.deleteMany({})
    await prisma.card.deleteMany({ where: { setCode: { in: codes } } })
    await prisma.cardSet.deleteMany({ where: { code: { in: codes } } })
  }

  for (const it of items) {
    await importFile(it.file, it.setCode)
  }

  console.log('Import terminé.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })


