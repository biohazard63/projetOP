import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const evidence = path.resolve(project, process.env.PLAY_LAYOUT_EVIDENCE_DIR ?? '../docs/game/evidence/play-layout/size-correction')
const html = fs.readFileSync(path.join(evidence, 'actual-board.html'), 'utf8')
const viewports = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: 'phone-landscape-844x390', width: 844, height: 390, isMobile: true, hasTouch: true },
]
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const measurements = []
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: viewport.isMobile, hasTouch: viewport.hasTouch })
    await page.setContent(html, { waitUntil: 'load' })
    const layout = await page.evaluate(() => {
      const rect = selector => {
        const element = document.querySelector(selector)
        const box = element.getBoundingClientRect()
        return { x:box.x, y:box.y, width:box.width, height:box.height, right:box.right, bottom:box.bottom }
      }
      const surface = rect('.play-surface'), field = rect('.tbl-field'), separator = rect('.tbl-center'), hand = rect('.play-hand'), track = rect('.play-hand-track')
      const zones = [...document.querySelectorAll('.tbl-side')].map(camp => {
        const core = camp.querySelector('.tbl-side-core').getBoundingClientRect()
        const don = camp.querySelector('.tbl-don').getBoundingClientRect()
        const grid = camp.querySelector('.tbl-character-grid').getBoundingClientRect()
        const anchor = camp.querySelector('.tbl-side-anchor').getBoundingClientRect()
        const utility = camp.querySelector('.tbl-side-utility').getBoundingClientRect()
        const character = camp.querySelector('.tbl-character-area').getBoundingClientRect()
        const slots = [...camp.querySelectorAll('.tbl-character-grid > *')]
        const cards = slots.map(slot => slot.getBoundingClientRect())
        const player = camp.classList.contains('me')
        const lanesDoNotOverlap = player ? anchor.right <= character.left + 1 && character.right <= utility.left + 1 : utility.right <= character.left + 1 && character.right <= anchor.left + 1
        return { camp:player ? 'player' : 'opponent', coreBottom:core.bottom, costAreaTop:don.top, costAreaHeight:don.height, characterGrid:grid.toJSON(), characterSlots:slots.length, slotsInsideGrid:cards.every(card => card.left >= grid.left - 1 && card.right <= grid.right + 1 && card.top >= grid.top - 1 && card.bottom <= grid.bottom + 1), lanesDoNotOverlap }
      })
      const handCards = [...document.querySelectorAll('.play-hand-card')].map(card => card.getBoundingClientRect())
      const handCardContainment = handCards.map(card => ({ top:card.top >= track.y - 1, bottom:card.bottom <= track.bottom + 1, inside:card.top >= track.y - 1 && card.bottom <= track.bottom + 1 }))
      const dock = rect('.play-dock')
      const dockOverlap = handCards.some(card => card.left < dock.right && card.right > dock.x && card.top < dock.bottom && card.bottom > dock.y)
      const backgroundSize = getComputedStyle(document.querySelector('.tbl-field'),'::before').backgroundSize
      const metrics = {
        viewport:{width:innerWidth,height:innerHeight}, document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},
        surface, field, separator, hand, track, dock, handCardCount:handCards.length, backgroundSize,
        fan:rect('.play-hand-fan'), handCards, handCentered:Math.abs((rect('.play-hand-fan').x + rect('.play-hand-fan').right) / 2 - (track.x + track.right) / 2) <= 2,
        handCardsInsideTrack:handCardContainment.every(card => card.inside), handCardContainment, dockOverlap,
        zones,
      }
      return metrics
    })
    assert.deepEqual(layout.document, layout.viewport, `global overflow ${viewport.name}`)
    assert.ok(Math.abs(layout.field.height / layout.surface.height - .76) <= .015, `field ratio ${viewport.name}`)
    assert.ok(Math.abs(layout.separator.height / layout.surface.height - .04) <= .015, `separator ratio ${viewport.name}`)
    assert.ok(Math.abs(layout.hand.height / layout.surface.height - .24) <= .015, `hand ratio ${viewport.name}`)
    assert.equal(layout.zones.length, 2)
    assert.ok(layout.zones.every(zone => zone.characterSlots === 5 && zone.slotsInsideGrid && zone.lanesDoNotOverlap && zone.coreBottom <= zone.costAreaTop + 1), `camp geometry ${viewport.name}`)
    await page.screenshot({ path:path.join(evidence, `real-board-${viewport.name}.png`) })
    assert.ok(layout.handCentered && layout.handCardsInsideTrack && !layout.dockOverlap, `hand geometry ${viewport.name}`)
    assert.ok(layout.backgroundSize.endsWith('cover'), `background ratio ${viewport.name}`)
    measurements.push({ viewport:viewport.name, status:'PASS', layout })
    await page.close()
  }
  fs.writeFileSync(path.join(evidence, 'actual-board-measurements.json'), JSON.stringify({ status:'PASS', source:JSON.parse(fs.readFileSync(path.join(evidence, 'actual-board-source.json'), 'utf8')), measurements }, null, 2) + '\n')
  console.log(JSON.stringify(measurements.map(({ viewport,status,layout }) => ({ viewport,status,surface:layout.surface,field:layout.field,separator:layout.separator,hand:layout.hand,handCentered:layout.handCentered,handCardsInsideTrack:layout.handCardsInsideTrack,zones:layout.zones.map(({ camp,coreBottom,costAreaTop,costAreaHeight,characterGrid,characterSlots,slotsInsideGrid })=>({camp,coreBottom,costAreaTop,costAreaHeight,characterGrid,characterSlots,slotsInsideGrid})) })), null, 2))
} finally {
  await browser.close()
}
