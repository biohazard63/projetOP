import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const evidence = path.resolve(project, process.env.PLAY_LAYOUT_EVIDENCE_DIR ?? '../docs/game/evidence/play-layout/size-correction')
fs.mkdirSync(evidence, { recursive: true })
const css = fs.readFileSync(path.join(project, 'src/app/play/play.css'), 'utf8')
const data = (file, type) => `data:${type};base64,${fs.readFileSync(path.join(project, file)).toString('base64')}`
const mat = data('public/images/play/board-mat.png', 'image/png')
const don = data('public/images/play/don-custom.webp', 'image/webp')
const cards = [data('public/images/OP09-093.webp', 'image/webp'), data('public/images/OP05-119.webp', 'image/webp')]
const face = (image, size = 'sm') => `<div class="play-card ${size}"><img alt="" src="${image}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></div>`
const slot = (image, leader = false) => `<button class="play-slot${leader ? ' leader' : ''}">${face(image, leader ? 'md' : 'sm')}</button>`
const pile = (label, image) => `<div class="tbl-pile">${face(image, 'xs')}<small>${label}</small></div>`
const camp = (owner, top = false) => {
  const foe = owner === 'foe'
  const characters = Array.from({ length: 5 }, (_, i) => slot(cards[i % cards.length])).join('')
  const tokens = Array.from({ length: 10 }, (_, i) => `<span class="tbl-don-token ${i < 5 ? 'active' : 'rested'}"><span class="play-don-card${i >= 5 ? ' rested' : ''}"><img alt="" src="${don}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></span></span>`).join('')
  return `<section class="play-side ${foe ? 'foe' : 'me'} tbl-side">
    <div class="tbl-side-core">
      <div class="tbl-side-anchor"><div class="tbl-life"><div class="tbl-life-cards">${Array.from({ length: 5 }, (_, i) => `<span style="--i:${i}"></span>`).join('')}</div><strong>♥ 5</strong></div><div class="tbl-leader-zone"><small class="tbl-zone-label">Leader</small>${slot(cards[foe ? 0 : 1], true)}</div></div>
      <div class="tbl-character-area"><div class="tbl-character-heading"><span class="tbl-zone-label">Personnages</span><small>5/5</small></div><div class="tbl-character-grid">${characters}</div></div>
      <div class="tbl-side-utility"><div class="tbl-stage-zone"><small class="tbl-zone-label">Stage</small><span class="tbl-stage-empty">◇</span></div><div class="tbl-stack-col">${foe ? '<div class="tbl-hand-foe"><span></span><span></span><span></span><small>5</small></div>' : ''}<div class="tbl-piles">${pile('Deck', cards[0])}${pile('Trash', cards[1])}${pile('DON!!', don)}</div></div></div>
    </div>
    <div class="tbl-don"><div class="tbl-don-zone"><span class="tbl-zone-label">Cost Area · DON!!</span><div class="tbl-don-chips">${tokens}</div></div><small class="tbl-don-count"><strong>5</strong> actifs · <strong>5</strong> reposés <span>· 0 en réserve</span></small></div>
  </section>`
}
const hand = Array.from({ length: 15 }, (_, i) => `<button class="play-hand-card" style="--fan-angle:${(i - 7) * 2}deg;--fan-offset:${Math.abs(i - 7)}px;--fan-overlap:-38px">${face(cards[i % cards.length], 'md')}</button>`).join('')
const handForCount = count => {
  const midpoint = (count - 1) / 2
  const maxAngle = Math.min(20, Math.max(5, (count - 1) * 1.35))
  const overlap = count > 5 ? -Math.min(38, 10 + (count - 6) * 2.5) : 0
  return Array.from({ length:count }, (_, index) => {
    const distance = Math.abs(index - midpoint)
    const angle = midpoint === 0 || index === midpoint ? 0 : ((index - midpoint) / midpoint) * maxAngle
    const offset = distance === 0 ? 0 : -Math.round(distance * .75)
    return `<button class="play-hand-card" style="--fan-angle:${angle}deg;--fan-offset:${offset}px;--fan-overlap:${index ? overlap : 0}px">${face(cards[index % cards.length], 'md')}</button>`
  }).join('')
}
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#061120}*{box-sizing:border-box}.play-layer{position:fixed;inset:0;background:#061120}.play-card{isolation:isolate}body .tbl-field::before{background-image:linear-gradient(180deg,#07132135,#07132152),url('${mat}')}</style><style>${css}</style></head><body><div class="play-layer"><div class="play-board" data-visual-fixture="layout-only" data-motion="reduced"><header class="tbl-top"><button class="play-icon">‹</button><div class="play-turn"><strong>Votre tour</strong><span>Tour 4 · Phase principale</span></div><button class="play-icon">☰</button><button class="play-icon">⋯</button></header><main class="play-surface"><div class="tbl-main"><div class="tbl-field">${camp('foe', true)}<div class="tbl-center"><p class="play-hint">Disposition de test · cartes et DON!! de démonstration visuelle</p></div>${camp('me')}</div></div><section class="play-hand"><div class="play-hand-track"><div class="play-hand-fan">${hand}</div></div></section><footer class="play-dock"><button class="piece-button">Fin du tour</button></footer></main></div></div></body></html>`

const viewports = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: 'phone-landscape-844x390', width: 844, height: 390, isMobile: true, hasTouch: true },
]
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const results = []
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: viewport.isMobile, hasTouch: viewport.hasTouch })
    await page.setContent(html, { waitUntil: 'load' })
    await page.waitForTimeout(100)
    const geometry = await page.evaluate(() => {
      const box = selector => { const e = document.querySelector(selector), r = e.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom } }
      const board = box('.play-board'), surface = box('.play-surface'), field = box('.tbl-field'), separator = box('.tbl-center'), hand = box('.play-hand'), track = box('.play-hand-track'), fan = box('.play-hand-fan'), dock = box('.play-dock')
      const grids = [...document.querySelectorAll('.tbl-character-grid')].map(e => ({ box:e.getBoundingClientRect().toJSON(), slots:e.children.length, cardRects:[...e.children].map(c => c.getBoundingClientRect().toJSON()), faceRects:[...e.querySelectorAll('.play-slot .play-card')].map(c => c.getBoundingClientRect().toJSON()) }))
      const costs = [...document.querySelectorAll('.tbl-don')].map(e => ({ box:e.getBoundingClientRect().toJSON(), tokens:e.querySelectorAll('.tbl-don-token').length, tokenRects:[...e.querySelectorAll('.tbl-don-token')].map(t => t.getBoundingClientRect().toJSON()) }))
      const handCards = [...document.querySelectorAll('.play-hand-card')].map(c => c.getBoundingClientRect().toJSON())
      const camps=[...document.querySelectorAll('.tbl-side')].map(e=>({box:e.getBoundingClientRect().toJSON(),core:e.querySelector('.tbl-side-core').getBoundingClientRect().toJSON(),don:e.querySelector('.tbl-don').getBoundingClientRect().toJSON()}))
      const leaders = [...document.querySelectorAll('.play-slot.leader .play-card')].map(e => e.getBoundingClientRect().toJSON())
      return { viewport:{width:innerWidth,height:innerHeight}, document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}, board,surface,field,separator,fieldScrollHeight:document.querySelector('.tbl-field').scrollHeight,hand,track,fan,dock,camps,grids,leaders,costs,handCount:handCards.length,handCards,background:getComputedStyle(document.querySelector('.tbl-field'),'::before').backgroundSize }
    })
    assert.deepEqual(geometry.document, geometry.viewport, `global overflow at ${viewport.name}`)
    assert.ok(Math.abs(geometry.field.y - geometry.surface.y) <= 1 && Math.abs(geometry.field.height / geometry.surface.height - .76) <= .015, `field must occupy 76% of the single reference surface at ${viewport.name}`)
    assert.ok(Math.abs(geometry.separator.height / geometry.surface.height - .04) <= .015, `separator must occupy 4% of the reference surface at ${viewport.name}`)
    assert.ok(Math.abs(geometry.hand.height / geometry.surface.height - .24) <= .015, `hand must occupy 24% of the reference surface at ${viewport.name}`)
    assert.equal(geometry.grids.length, 2)
    assert.ok(geometry.grids.every((grid,index) => grid.faceRects.every(card => card.width >= geometry.leaders[index].width * .8)), `Characters must use the camp card size, not shrink inside a nested query container at ${viewport.name}: ${JSON.stringify({characters:geometry.grids.map(g=>g.faceRects.map(c=>c.width)),leaders:geometry.leaders.map(c=>c.width)})}`)
    assert.ok(geometry.grids.every(grid => grid.slots === 5 && grid.cardRects.every(rect => rect.x >= grid.box.x && rect.right <= grid.box.right + 1) && grid.faceRects.length === 5 && grid.faceRects.every(rect => rect.x >= grid.box.x - 1 && rect.right <= grid.box.right + 1 && rect.y >= grid.box.y - 1 && rect.bottom <= grid.box.bottom + 1)), `five-card row overflow at ${viewport.name}`)
    assert.ok(geometry.costs.every(cost => cost.tokens === 10 && cost.tokenRects.every(rect => rect.width > 0 && rect.height > 0)), `DON!! cost area at ${viewport.name}`)
    assert.equal(geometry.handCount, 15)
    assert.ok(geometry.fieldScrollHeight <= geometry.field.height + 1, `terrain clipped vertically at ${viewport.name}: ${JSON.stringify({ field:geometry.field,fieldScrollHeight:geometry.fieldScrollHeight,grids:geometry.grids.map(grid=>grid.box),costs:geometry.costs.map(cost=>cost.box) })}`)
    assert.ok(geometry.camps.every(camp => camp.core.bottom <= camp.don.y + 1), `zone and Cost Area overlap at ${viewport.name}`)
    assert.ok(geometry.hand.y >= geometry.field.bottom - 1 && geometry.hand.y - geometry.field.bottom <= 5, `large gap before hand at ${viewport.name}: ${JSON.stringify({field:geometry.field,hand:geometry.hand,camps:geometry.camps,grids:geometry.grids.map(g=>g.box),costs:geometry.costs.map(c=>c.box)})}`)
    assert.ok(Math.abs((geometry.fan.x + geometry.fan.right) / 2 - (geometry.track.x + geometry.track.right) / 2) <= 2, `hand is not centered at ${viewport.name}`)
    assert.ok(geometry.handCards.every(card => card.y >= geometry.track.y - 1 && card.bottom <= geometry.track.bottom + 1), `hand card clipped at ${viewport.name}: ${JSON.stringify({ hand:geometry.hand,track:geometry.track,fan:geometry.fan,first:geometry.handCards[0],center:geometry.handCards[Math.floor(geometry.handCards.length/2)] })}`)
    const handCounts=[]
    for (const count of [1,5,10,15]) {
      await page.locator('.play-hand-fan').evaluate((element, markup) => { element.innerHTML = markup }, handForCount(count))
      const handCheck = await page.evaluate(() => {
        const track = document.querySelector('.play-hand-track').getBoundingClientRect()
        const fan = document.querySelector('.play-hand-fan').getBoundingClientRect()
        const elements = [...document.querySelectorAll('.play-hand-card')]
        const cards = elements.map(card => card.getBoundingClientRect())
        const steps = elements.slice(1).map((card,index) => card.offsetLeft - elements[index].offsetLeft)
        const exposure = steps.map((step,index) => step / elements[index].offsetWidth)
        return { count:cards.length,centerDelta:Math.abs((fan.left + fan.right) / 2 - (track.left + track.right) / 2),inside:cards.every(card => card.top >= track.top - 1 && card.bottom <= track.bottom + 1),minimumExposedFraction:exposure.length ? Math.min(...exposure) : 1 }
      })
      assert.equal(handCheck.count,count,`hand size ${count} at ${viewport.name}`)
      assert.ok(handCheck.centerDelta <= 2 && handCheck.inside && handCheck.minimumExposedFraction >= .35, `hand size ${count} misaligned, clipped or overlapped at ${viewport.name}: ${JSON.stringify(handCheck)}`)
      handCounts.push({ count,centerDelta:Number(handCheck.centerDelta.toFixed(2)),inside:handCheck.inside,minimumExposedFraction:Number(handCheck.minimumExposedFraction.toFixed(2)) })
    }
    await page.locator('.play-hand-fan').evaluate((element, markup) => { element.innerHTML = markup }, handForCount(15))
    await page.locator('.play-hand-card').first().evaluate(element => element.classList.add('selected'))
    const selectedCard = await page.locator('.play-hand-card').first().boundingBox()
    assert.ok(selectedCard && selectedCard.y >= geometry.track.y - 1 && selectedCard.y + selectedCard.height <= geometry.track.y + geometry.track.height + 1, `expanded hand card clipped at ${viewport.name}`)
    await page.locator('.play-hand-card').first().evaluate(element => element.classList.remove('selected'))
    assert.ok(geometry.dock.bottom <= geometry.viewport.height + 1)
    await page.screenshot({ path:path.join(evidence, `after-${viewport.name}.png`) })
    results.push({ viewport:viewport.name,status:'PASS',surface:geometry.surface,field:geometry.field,separator:geometry.separator,hand:geometry.hand,dock:geometry.dock,camps:geometry.camps.map(camp=>({box:camp.box,coreBottom:camp.core.bottom,costArea:camp.don})),characterGridRects:geometry.grids.map(grid=>grid.box),characterWidths:geometry.grids.map(grid=>grid.faceRects.map(c=>c.width)),leaderWidths:geometry.leaders.map(c=>c.width),costAreaTokenCounts:geometry.costs.map(cost=>cost.tokens),handCounts,background:geometry.background })
    await page.close()
  }
} catch (error) {
  results.push({ status:'FAIL',error:String(error) })
  throw error
} finally {
  await browser.close()
  fs.writeFileSync(path.join(evidence,'results.json'), JSON.stringify({ kind:'CSS/geometry fixture only; no game, rules, database or interactions executed', results },null,2)+'\n')
  console.log(JSON.stringify(results,null,2))
}
