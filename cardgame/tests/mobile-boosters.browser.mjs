import {chromium,request} from '@playwright/test';
import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const target=new URL(process.env.DATABASE_URL||'');
if(target.hostname!=='127.0.0.1'||target.port!=='55432'||target.pathname!=='/op_boosters_test') throw Error('Isolated database required');
const baseURL='http://localhost:3007';const db=new PrismaClient();const results=[];let browser;
const evidence=new URL('../../docs/design/evidence/phase-2/',import.meta.url);fs.mkdirSync(evidence,{recursive:true});
try{
 const password='Mobile-Test-9!';const user=await db.user.create({data:{name:'Mobile fixture',email:`mobile-${randomUUID()}@example.test`,password:await bcrypt.hash(password,10),hasStarterDecks:true}});
 const suffix=String(Date.now());const codes=['OP','EB','ST'].map(f=>`${f}-${suffix}`);
 for(const code of codes) await db.cardSet.create({data:{code,name:`Mobile ${code}`,releaseDate:new Date()}});
 const api=await request.newContext({baseURL});const csrf=await(await api.get('/api/auth/csrf')).json();await api.post('/api/auth/callback/credentials',{form:{email:user.email,password,csrfToken:csrf.csrfToken,callbackUrl:baseURL},maxRedirects:0});assert.equal((await(await api.get('/api/auth/session')).json()).user.id,user.id);
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({storageState:await api.storageState(),viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let posts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/booster'))posts++;});
 await page.goto(`${baseURL}/boosters?set=${codes[1]}`);await page.getByTestId('selected-booster-artwork').waitFor();assert.ok((await page.getByTestId('selected-booster-artwork').getAttribute('alt')).includes(codes[1]));results.push({test:'Explicit extension URL determines selected booster',status:'PASS'});
 for(const family of ['OP','EB','ST']){
  await page.getByRole('group',{name:'Familles d’extensions'}).getByRole('button',{name:family,exact:true}).click();
  const labels=await page.locator('.piece-carousel-tabs button').allTextContents();assert.ok(labels.length>0);assert.ok(labels.every(label=>label.startsWith(family)));
 }
 results.push({test:'Real OP/EB/ST family tabs restrict extensions',status:'PASS'});
 await page.getByRole('group',{name:'Familles d’extensions'}).getByRole('button',{name:'Toutes',exact:true}).click();await page.getByRole('searchbox',{name:'Rechercher une extension'}).fill(codes[0]);await page.waitForFunction(code=>document.querySelectorAll('.piece-carousel-tabs button').length===1&&document.querySelector('.piece-carousel-tabs button').textContent===code,codes[0]);await page.locator('.piece-carousel-tabs button').click();await page.waitForURL(url=>url.searchParams.get('set')===codes[0]);await page.reload();await page.waitForFunction(code=>document.querySelector('[data-testid=selected-booster-artwork]')?.alt.includes(code),codes[0]);results.push({test:'Search and selected extension persist through reload',status:'PASS'});
 await page.getByRole('searchbox',{name:'Rechercher une extension'}).fill('NO-SUCH-MOBILE-SET');await page.getByRole('heading',{name:'Aucune extension trouvée'}).waitFor();results.push({test:'Empty search state is explicit',status:'PASS'});
 await page.getByRole('searchbox',{name:'Rechercher une extension'}).fill(codes[0]);await page.getByTestId('selected-booster-artwork').waitFor();assert.equal(await page.getByRole('link',{name:'Ouvrir ce booster',exact:true}).count(),0);results.push({test:'Empty fixture extension cannot be opened',status:'PASS'});
 await page.getByRole('button',{name:'Ouvrir le menu',exact:true}).click();await page.locator('.piece-mobile-menu').getByRole('button',{name:'Clair',exact:true}).click();await page.getByRole('button',{name:'Fermer le menu',exact:true}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:new URL('boosters-mobile-light.png',evidence).pathname,fullPage:true});
 await page.setViewportSize({width:1440,height:900});await page.screenshot({path:new URL('boosters-desktop-light.png',evidence).pathname,fullPage:true});assert.ok(await page.locator('.piece-sidebar').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(posts,0);assert.equal(await db.boosterOpening.count({where:{userId:user.id}}),0);assert.deepEqual(errors,[]);results.push({test:'Mobile/desktop layout, no JavaScript errors and no opening attribution',status:'PASS'});
 await context.close();await api.dispose();
}catch(e){results.push({test:'Mobile boosters browser verification',status:'FAIL',detail:e.message});process.exitCode=1;}
finally{if(browser)await browser.close();await db.$disconnect();fs.writeFileSync(new URL('results.json',evidence),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}
