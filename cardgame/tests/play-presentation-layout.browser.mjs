import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { config } from 'dotenv'
import { encode } from 'next-auth/jwt'

config({path:['.env.local','.env'],quiet:true})
if (!process.env.NEXTAUTH_SECRET) throw new Error('LOCAL_AUTH_SECRET_REQUIRED')
// Short-lived fixture identity: never written to evidence, no real user's session is read.
const sessionToken=await encode({secret:process.env.NEXTAUTH_SECRET,salt:'next-auth.session-token',maxAge:300,token:{id:'layout-preview',sub:'layout-preview',name:'Layout preview'}})

const evidence = path.resolve('../docs/game/evidence/play-game-feel/layout')
fs.mkdirSync(evidence, { recursive:true })
const view = JSON.parse(fs.readFileSync(path.resolve('../docs/game/evidence/play-game-feel/layout-source-view.json'), 'utf8'))
const browser = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true })
const results = []
try {
  for (const [width,height] of [[1920,1080],[1440,900],[1366,768],[844,390]]) {
    const page = await browser.newPage({ viewport:{width,height}, deviceScaleFactor:1, reducedMotion:'reduce', hasTouch:height===390, isMobile:height===390 })
    await page.context().addCookies([{name:'next-auth.session-token',value:sessionToken,domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}])
    const errors=[]
    page.on('pageerror', error => errors.push(String(error)))
    await page.route('**/api/**', route => route.fulfill({json:{}}))
    await page.route('**/api/play/**', route => {
      assert.equal(route.request().method(),'GET','capture must never send a game mutation')
      const pathname=new URL(route.request().url()).pathname
      const body=pathname.endsWith('/stats') ? {stats:{played:0,wins:0,losses:0,concessions:0,byDeck:{},byLevel:{}}} : pathname.endsWith('/decks') ? {reference:[],user:[]} : {game:view}
      return route.fulfill({json:body})
    })
    await page.route('**/api/auth/session', route => route.fulfill({json:{user:{id:'layout-preview',name:'Layout preview'},expires:'2099-01-01T00:00:00.000Z'}}))
    await page.goto('http://localhost:3000/play',{waitUntil:'domcontentloaded'})
    try { await page.locator('.play-surface').waitFor({timeout:20000}) } catch(error) {
      fs.writeFileSync(path.join(evidence,'load-error.json'),JSON.stringify({url:page.url(),text:await page.locator('body').innerText(),errors},null,2))
      await page.screenshot({path:path.join(evidence,'load-error.png')})
      throw error
    }
    const measure = () => page.evaluate(() => {
      const rect=selector=>document.querySelector(selector).getBoundingClientRect().toJSON()
      const surface=rect('.play-surface'),field=rect('.tbl-field'),hand=rect('.play-hand')
      const cards=[...document.querySelectorAll('.play-hand:not(.inline) .play-hand-card')].map(c=>c.getBoundingClientRect().toJSON())
      const track=rect('.play-hand-track')
      return {surface,field,hand,track,cards,documentHeight:document.documentElement.scrollHeight,viewportHeight:innerHeight,bodyOverflow:getComputedStyle(document.body).overflow,rootOverflow:getComputedStyle(document.documentElement).overflow,background:getComputedStyle(document.querySelector('.tbl-field'),'::before').backgroundSize}
    })
    const before=await measure()
    assert.ok(Math.abs(before.field.height/before.surface.height-.76)<.015)
    assert.ok(before.cards.every(c=>c.top>=before.track.top-1 && c.bottom<=before.track.bottom+1),'hand must stay visible in hydrated app')
    assert.equal(before.bodyOverflow,'hidden','underlying page must stop scrolling')
    assert.equal(before.rootOverflow,'hidden','root scrollbar must disappear')
    await page.mouse.wheel(0,250)
    assert.equal(await page.evaluate(()=>window.scrollY),0,'table must not scroll the underlying document')
    await page.getByRole('button',{name:'Journal de combat',exact:true}).click()
    await page.locator('.tbl-log-panel').waitFor()
    const open=await measure()
    assert.deepEqual(open.field,before.field,'journal must not resize the board')
    await page.locator('.tbl-log-panel').getByRole('button',{name:'Fermer le journal',exact:true}).click()
    await page.mouse.move(1,1)
    await page.locator('.play-hand-card').first().click()
    await page.locator('.play-sheet').waitFor()
    await page.locator('.play-sheet').getByRole('button',{name:'Fermer',exact:true}).click()
    await page.mouse.move(1,1)
    await page.screenshot({path:path.join(evidence,`${width}x${height}.png`)})
    assert.equal(errors.length,0,`runtime errors: ${errors.join(', ')}`)
    results.push({viewport:`${width}x${height}`,status:'PASS',geometry:before,journalStable:true,cardDialog:true,errors})
    await page.close()
  }
} finally {
  await browser.close()
  fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify({source:'Hydrated localhost /play, GET APIs intercepted with a memory-game PlayerView; no database writes',results},null,2))
  console.log(JSON.stringify(results.map(r=>({viewport:r.viewport,status:r.status,documentHeight:r.geometry.documentHeight,viewportHeight:r.geometry.viewportHeight,bodyOverflow:r.geometry.bodyOverflow,rootOverflow:r.geometry.rootOverflow,journalStable:r.journalStable,cardDialog:r.cardDialog})),null,2))
}
