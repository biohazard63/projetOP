import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Turns a sheet of 5 badge medals (bronze, silver, gold, platinum, legend, left to right) drawn on a baked-in
// transparency checkerboard into 5 transparent WebP images: public/images/badges/<badge>-<rank>.webp.
// The background is removed by a flood fill from the sheet edges through light, colourless pixels only (the
// checkerboard), so light but coloured parts inside a medal (parchment banners) are kept.
// Usage: npx tsx scripts/badges/extract-badge-art.ts <sheet.png> <badgeId>
const [source, badge] = process.argv.slice(2)
if (!source || !/^[a-z0-9-]+$/.test(badge ?? '')) throw new Error('Usage: extract-badge-art.ts <sheet.png> <badgeId>')
const RANKS = ['bronze', 'silver', 'gold', 'platinum', 'legend']
const SIZE = 320

async function main() {
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const at = (x: number, y: number) => (y * w + x) * 3
  // Checkerboard squares, also when tinted by a medal's glow (light pixels of low or moderate saturation).
  const checker = (i: number) => { const r = data[i], g = data[i + 1], b = data[i + 2], lo = Math.min(r, g, b), chroma = Math.max(r, g, b) - lo; return (chroma < 16 && lo > 168) || (chroma < 70 && lo > 150) }
  // 1. Background mask: flood fill from every edge pixel through checkerboard pixels.
  const bg = new Uint8Array(w * h), stack: number[] = []
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
  while (stack.length) {
    const p = stack.pop()!
    if (bg[p] || !checker(p * 3)) continue
    bg[p] = 1
    const x = p % w, y = (p - x) / w
    if (x > 0) stack.push(p - 1); if (x < w - 1) stack.push(p + 1); if (y > 0) stack.push(p - w); if (y < h - 1) stack.push(p + w)
  }
  // 2. Alpha with a 1 px soft edge (pixels touching the background get half opacity) to hide the checkerboard fringe.
  const rgba = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, i = at(x, y), o = p * 4
    rgba[o] = data[i]; rgba[o + 1] = data[i + 1]; rgba[o + 2] = data[i + 2]
    const edge = !bg[p] && ((x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) || (y > 0 && bg[p - w]) || (y < h - 1 && bg[p + w]))
    rgba[o + 3] = bg[p] ? 0 : edge ? 128 : 255
  }
  // 3. Opaque connected blobs: each medal is one big blob (its spikes included); crumbs (< 400 px) are dropped.
  const label = new Int32Array(w * h).fill(-1), blobs: { size: number; minX: number; maxX: number; minY: number; maxY: number; sumX: number }[] = []
  for (let start = 0; start < w * h; start++) {
    if (label[start] !== -1 || rgba[start * 4 + 3] === 0) continue
    const id = blobs.length, blob = { size: 0, minX: w, maxX: 0, minY: h, maxY: 0, sumX: 0 }, queue = [start]
    label[start] = id
    while (queue.length) {
      const p = queue.pop()!, x = p % w, y = (p - x) / w
      blob.size++; blob.sumX += x; blob.minX = Math.min(blob.minX, x); blob.maxX = Math.max(blob.maxX, x); blob.minY = Math.min(blob.minY, y); blob.maxY = Math.max(blob.maxY, y)
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (q >= 0 && label[q] === -1 && rgba[q * 4 + 3] !== 0) { label[q] = id; queue.push(q) }
    }
    blobs.push(blob)
  }
  // Cuts between medals: the emptiest column near each fifth of the sheet (touching medals meet at a thin neck).
  const band = w / RANKS.length, column = new Array<number>(w).fill(0)
  for (let p = 0; p < w * h; p++) if (rgba[p * 4 + 3] === 255) column[p % w]++
  const cuts = [0, ...Array.from({ length: RANKS.length - 1 }, (_, i) => {
    let best = Math.round((i + 1) * band)
    for (let x = best - 90; x <= best + 90; x++) if (column[x] < column[best]) best = x
    return best
  }), w]
  const slot = (x: number) => cuts.findIndex((c, i) => x >= c && x < cuts[i + 1])
  // A blob belongs to the slot holding its centre; touching medals (one blob over 1.6 slots) are split at the cuts.
  const owner = blobs.map(b => b.size < 400 ? -1 : b.maxX - b.minX > band * 1.6 ? -2 : slot(Math.round(b.sumX / b.size)))
  const out = resolve('public/images/badges'); mkdirSync(out, { recursive: true })
  for (let k = 0; k < RANKS.length; k++) {
    const mine = (p: number) => { const o = owner[label[p]]; return o === k || (o === -2 && slot(p % w) === k) }
    let minX = w, maxX = 0, minY = h, maxY = 0
    for (let p = 0; p < w * h; p++) if (label[p] >= 0 && mine(p)) { const x = p % w, y = (p - x) / w; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y) }
    const side = Math.max(maxX - minX, maxY - minY) + 8, cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
    const left = Math.max(0, Math.round(cx - side / 2)), top = Math.max(0, Math.round(cy - side / 2))
    const width = Math.min(w - left, side), height = Math.min(h - top, side)
    const crop = Buffer.alloc(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = (top + y) * w + left + x, d = (y * width + x) * 4
      if (label[p] >= 0 && mine(p)) rgba.copy(crop, d, p * 4, p * 4 + 4)
    }
    const file = `${out}/${badge}-${RANKS[k]}.webp`
    await sharp(crop, { raw: { width, height, channels: 4 } }).resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 88, alphaQuality: 90 }).toFile(file)
    console.log(file, `${maxX - minX}×${maxY - minY}`)
  }
}
void main()
