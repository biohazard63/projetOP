import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

// M6 — snapshot of an official English card list page (en.onepiece-cardgame.com/cardlist/?series=<id>), used only when the
// local cardJson has no English text for a card of an audited Starter Deck (the certification references the English page).
// The raw HTML is archived under docs/game/evidence/m6/sources/cardlist-en/ (an existing different snapshot is never
// overwritten) and parsed into rows of the local cardJson format under data/official-en/. A Leader's Life is stored
// in `cost`, as in carteJson. No card text is invented: every field comes from the page.
// npx tsx scripts/game/official-cardlist-en.ts <seriesId> <label> [en|fr]    e.g. 569016 ST-16, 622016 ST-16 fr
// The French site (fr.onepiece-cardgame.com) is used only for display (names, texts, images); rules stay on the English text.
const [series, label, langArg] = process.argv.slice(2)
const lang = langArg === 'fr' ? 'fr' : 'en'
if (!/^\d{6}$/.test(series ?? '') || !/^[A-Z0-9-]+$/.test(label ?? '')) throw new Error('usage: official-cardlist-en.ts <seriesId> <label>')
const url = `https://${lang}.onepiece-cardgame.com/cardlist/?series=${series}`
const evidenceDir = resolve(`../docs/game/evidence/m6/sources/cardlist-${lang}`), dataDir = resolve(`data/official-${lang}`)
mkdirSync(evidenceDir, { recursive: true }); mkdirSync(dataDir, { recursive: true })
const htmlFile = resolve(evidenceDir, `${label}.html`)
async function main() {
let page: string
if (existsSync(htmlFile)) page = readFileSync(htmlFile, 'utf8')
else {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Mugiwara TCG card review)' } })
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  page = await res.text()
  writeFileSync(htmlFile, page)
}
// Attribute icons are written as literal <Slash>, <Strike>... in the card text: keep them, strip only HTML tags.
const decode = (s: string) => s.replace(/<br\s*\/?>/gi, '\n').replace(/<(?!(?:Slash|Strike|Ranged|Special|Wisdom)>)[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').trim()
const field = (block: string, cls: string) => {
  const m = block.match(new RegExp(`<div class="${cls}">([\\s\\S]*?)</div>`))
  return m ? decode(m[1].replace(/<h3>[\s\S]*?<\/h3>/, '')) : ''
}
const rows = [...page.matchAll(/<dl class="modalCol" id="([^"]+)">([\s\S]*?)<\/dl>/g)].map(([, id, block]) => {
  const info = [...block.matchAll(/<span>([^<]*)<\/span>/g)].map(m => decode(m[1]))
  const code = id.replace(/(?:_[pr]\d+)+$/i, '')
  const type = info.find(v => /^(LEADER|CHARACTER|EVENT|STAGE|PERSONNAGE|ÉVÉNEMENTS?|EVENEMENTS?|LIEU)$/i.test(v)) ?? ''
  const name = decode(block.match(/<div class="cardName">([\s\S]*?)<\/div>/)?.[1] ?? '')
  const costOrLife = field(block, 'cost'), trigger = field(block, 'trigger')
  return { id, code, rarity: info.find(v => /^(L|C|UC|R|SR|SEC|P|SP|TR)$/.test(v)) ?? '', type, name,
    cost: costOrLife.replace(/^(Cost|Life)\s*/i, ''), attribute: field(block, 'attribute').replace(/^Attribute\s*/i, '') || '-',
    power: field(block, 'power').replace(/^Power\s*/i, ''), counter: field(block, 'counter').replace(/^Counter\s*/i, ''),
    color: field(block, 'color').replace(/^Color\s*/i, ''), types: field(block, 'feature').replace(/^Type\s*/i, ''),
    effect: field(block, 'text').replace(/^Effect\s*/i, '') || '-', trigger: trigger.replace(/^Trigger\s*/i, '') || '-',
    extension: field(block, 'getInfo').replace(/^Card Set\(s\)\s*/i, ''),
    image: (() => { const src = block.match(/data-src="\.\.\/(images\/cardlist\/card\/[^"?]+)/)?.[1]; return src ? `https://${lang}.onepiece-cardgame.com/${src}` : `https://${lang}.onepiece-cardgame.com/images/cardlist/card/${id}.png` })(), url: `${url}#${code}`, image_local: '' }
})
if (!rows.length) throw new Error('NO_CARD_ON_PAGE')
for (const r of rows) if (!r.code || !r.type || !r.name || !r.color) throw new Error(`UNPARSED_CARD:${r.id}`)
const out = resolve(dataDir, `cards-${label}.json`)
writeFileSync(out, JSON.stringify(rows, null, 1) + '\n')
console.log(label, rows.length, 'rows', 'sha256', createHash('sha256').update(page).digest('hex').slice(0, 16))
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
