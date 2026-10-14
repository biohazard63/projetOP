import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { config } from 'dotenv'
import { encode } from 'next-auth/jwt'
import { REFERENCE_DECKS, deckEligibility } from '../src/lib/engine/decks'
import { MemoryGameRepository } from '../src/lib/engine/repository'
import { PlayService } from '../src/lib/engine/service'

async function main() {
  config({ path:['.env.local','.env'],quiet:true })
  if (!process.env.NEXTAUTH_SECRET) throw new Error('LOCAL_AUTH_SECRET_REQUIRED')
  const token = await encode({secret:process.env.NEXTAUTH_SECRET,salt:'next-auth.session-token',maxAge:600,token:{id:'picker-preview',sub:'picker-preview'}})
  const reference = REFERENCE_DECKS.map(deck => ({id:deck.id,name:deck.name,leader:deck.leader,description:deck.description,...deckEligibility(deck.entries)}))
  const first = reference.find(deck=>deck.id==='starter-st01')!
  assert.ok(first?.ok)
  const out = path.resolve('../docs/game/evidence/play-game-feel/picker'); fs.mkdirSync(out,{recursive:true})
  const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
  const results:unknown[]=[]
  try {
    for (const [width,height] of [[1440,900],[390,844]]) {
      const play = new PlayService(new MemoryGameRepository(),()=>777)
      const page = await browser.newPage({viewport:{width,height},isMobile:width===390,hasTouch:width===390})
      const errors:string[]=[], starts:unknown[]=[]
      page.on('pageerror', error=>errors.push(String(error)))
      await page.context().addCookies([{name:'next-auth.session-token',value:token,domain:'localhost',path:'/',httpOnly:true,sameSite:'Lax'}])
      await page.route('**/api/**',route=>route.fulfill({json:{}}))
      await page.route('**/api/play/**',async route=>{
        const url=new URL(route.request().url())
        if(route.request().method()==='POST' && url.pathname==='/api/play/games') {
          const body=route.request().postDataJSON(); starts.push(body)
          const deck=REFERENCE_DECKS.find(deck=>deck.id===body.deck.id)!
          const game=await play.start(`picker-${width}`,{ref:deck.id,entries:structuredClone(deck.entries)},body.botLevel)
          return route.fulfill({status:201,json:{game}})
        }
        return route.fulfill({json:url.pathname.endsWith('/decks') ? {reference,user:[{id:'personal',name:'Personnel masqué',ok:true,errors:[]}]} : url.pathname.endsWith('/stats') ? {stats:{played:0,wins:0,losses:0,concessions:0,byDeck:{},byLevel:{}}} : {game:null}})
      })
      await page.route('**/api/auth/session',route=>route.fulfill({json:{user:{id:'picker-preview'},expires:'2099-01-01T00:00:00Z'}}))
      await page.goto('http://localhost:3000/play',{waitUntil:'domcontentloaded'})
      await page.locator('.starter-deck-card').first().waitFor({timeout:30000})
      assert.equal(await page.locator('.starter-deck-card').count(),reference.filter(deck=>deck.id.startsWith('starter-')).length)
      assert.equal(await page.getByText('Personnel masqué').count(),0)
      assert.equal(await page.getByText('Luffy — Interséries',{exact:true}).count(),0)
      const portraits = page.locator('.starter-leader-portrait img')
      for (let index=0; index<await portraits.count(); index++) {
        const image = portraits.nth(index)
        await image.scrollIntoViewIfNeeded()
        await page.waitForFunction(index => {
          const image = document.querySelectorAll('.starter-leader-portrait img')[index]
          return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
        }, index)
        assert.ok((await image.getAttribute('alt'))?.includes('Leader du deck'), 'every Starter displays its actual Leader')
        assert.ok(decodeURIComponent(await image.getAttribute('src') ?? '').includes('/images/play/leaders/'))
      }
      await page.screenshot({path:path.join(out,`all-leaders-${width}x${height}.png`),fullPage:true})
      await page.getByRole('searchbox',{name:'Rechercher un deck'}).fill('ST-01')
      assert.equal(await page.locator('.starter-deck-card').count(),1)
      const portrait=page.locator('.starter-leader-portrait img')
      await portrait.waitFor()
      assert.ok((await portrait.getAttribute('alt'))?.includes('Leader du deck'))
      assert.ok(decodeURIComponent(await portrait.getAttribute('src') ?? '').includes('/images/play/leaders/'))
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('.starter-leader-portrait img')).every(image=>image instanceof HTMLImageElement && image.complete && image.naturalWidth>0))
      await page.locator('.starter-deck-card').click()
      assert.equal(starts.length,0,'selecting a deck is not a game command')
      assert.equal(await page.getByRole('button',{name:'Prendre la mer',exact:true}).isEnabled(),true)
      await page.screenshot({path:path.join(out,`${width}x${height}.png`)})
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'picker has no horizontal overflow')
      await page.getByRole('button',{name:'Prendre la mer',exact:true}).click()
      await page.locator('.play-surface').waitFor()
      assert.deepEqual(starts,[{deck:{kind:'reference',id:first.id},botLevel:'normal'}])
      assert.equal(errors.length,0,errors.join('\n'))
      results.push({viewport:`${width}x${height}`,starterCount:reference.filter(deck=>deck.id.startsWith('starter-')).length,leader:first.leader,onlyStarters:true,allLeaderImagesLoaded:true,search:true,explicitStart:true,realMemoryGame:true,status:'PASS'})
      await page.close()
    }
  } finally {await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2))}
  console.log(JSON.stringify(results,null,2))
}
main().catch(error=>{console.error(error);process.exitCode=1})
