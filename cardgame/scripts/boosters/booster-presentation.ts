import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

// Presentation data of the booster selection (no rule, rate or catalogue change):
// - names: official product titles archived in data/onepiece/catalog/extensions.json (French print first, else English),
//   e.g. "Extension-SANG ROYAL- [OP-10]" → "SANG ROYAL"; a code without an archived title keeps its catalogue name;
// - frames: the packet's bounding box inside each artwork (Bandai thumbnails sit on a beige 247 px canvas, French visuals on a
//   transparent 670 px one), measured by trimming the uniform background, so every packet is shown at the same size.
// Reads the database read-only for the artwork URLs: npx tsx scripts/boosters/booster-presentation.ts
type Name = { original: string; language: string }
async function main() {
  const extensions = JSON.parse(readFileSync(resolve('data/onepiece/catalog/extensions.json'), 'utf8')) as { code: string; name: { fr: string | null; originals?: Name[] } }[]
  const clean = (title: string) => title.replace(/^Card Set\(s\)/, '').replace(/^Extension(BOOSTER)?\s*/, '').replace(/\s*\[[^\]]+\]\s*$/, '').replace(/^-\s*|\s*-$/g, '').trim()
  const names: Record<string, { title: string; language: 'fr' | 'en'; source: string }> = {}
  for (const e of extensions) {
    const fr = e.name.fr && !/^Set /.test(e.name.fr) ? e.name.fr : null
    const en = e.name.originals?.find(o => o.language === 'en' && /\[[^\]]+\]/.test(o.original))?.original ?? null
    const pick = fr ?? en
    if (pick) names[e.code] = { title: clean(pick), language: fr && e.name.originals?.some(o => o.original === fr && o.language === 'fr') ? 'fr' : 'en', source: 'data/onepiece/catalog/extensions.json' }
  }
  const { PrismaClient } = await import('@prisma/client'), { getBoosterCatalog } = await import('../../src/lib/boosters/service')
  const db = new PrismaClient(), sets = await getBoosterCatalog(db as never)
  await db.$disconnect()
  const frames: Record<string, { x: number; y: number; w: number; h: number; width: number; height: number }> = {}
  for (const url of [...new Set(sets.map(s => s.imageUrl).filter((u): u is string => !!u))]) {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!response.ok) { console.log('skipped', url, response.status); continue }
    const buffer = Buffer.from(await response.arrayBuffer()), meta = await sharp(buffer).metadata()
    const { info } = await sharp(buffer).trim({ threshold: 30 }).toBuffer({ resolveWithObject: true })
    const x = -(info.trimOffsetLeft ?? 0), y = -(info.trimOffsetTop ?? 0), round = (v: number) => Math.round(v * 10000) / 10000
    frames[url] = { x: round(x / meta.width!), y: round(y / meta.height!), w: round(info.width / meta.width!), h: round(info.height / meta.height!), width: meta.width!, height: meta.height! }
  }
  writeFileSync(resolve('src/lib/boosters/booster-presentation.json'), JSON.stringify({ names, frames }, null, 1) + '\n')
  console.log(Object.keys(names).length, 'names,', Object.keys(frames).length, 'artwork frames')
}
void main()
