import {chromium,request} from '@playwright/test';
import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const target=new URL(process.env.DATABASE_URL||'');
if(target.hostname!=='127.0.0.1'||target.port!=='55432'||target.pathname!=='/op_boosters_test')throw Error('Isolated database required');
const baseURL='http://localhost:3007',db=new PrismaClient(),results=[];
const evidence=new URL('../../docs/design/evidence/phase-4-5/',import.meta.url);fs.mkdirSync(evidence,{recursive:true});
let browser;const tag=randomUUID();
async function check(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',detail:e.message});}console.log(results.at(-1));}
try{
 const password='Mobile-Collection-9!';const user=await db.user.create({data:{name:'Mobile collection fixture',email:`mobile-collection-${tag}@example.test`,password:await bcrypt.hash(password,10),hasStarterDecks:true}});
 const setCode=`OP-${Date.now()}`;await db.cardSet.create({data:{code:setCode,name:'Collection mobile test',releaseDate:new Date()}});
 const cards=[];
 for(let i=0;i<14;i++){const card=await db.card.create({data:{id:`mobile-${tag}-${i}`,code:`MOBILE-${String(i).padStart(3,'0')}`,name:i===0?'Mobile Leader':`Mobile Card ${String(i).padStart(2,'0')}`,setCode,set:setCode,type:i===0?'LEADER':'CHARACTER',color:'RED',cost:i%8,power:5000,rarity:i===0?'L':i===1?'SR':'C',isAltArt:i===1,imageUrl:'/images/OP05-119.webp'}});cards.push(card);await db.userCard.create({data:{userId:user.id,cardId:card.id,quantity:i===0?1:4}});}
 const api=await request.newContext({baseURL});const csrf=await(await api.get('/api/auth/csrf')).json();await api.post('/api/auth/callback/credentials',{form:{email:user.email,password,csrfToken:csrf.csrfToken,callbackUrl:baseURL},maxRedirects:0});assert.equal((await(await api.get('/api/auth/session')).json()).user.id,user.id);
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({storageState:await api.storageState(),viewport:{width:390,height:844},colorScheme:'dark'});const page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await check('Mobile sheet combines family and rarity, resets and returns focus',async()=>{
  await page.goto(baseURL+'/collection');await page.locator('.piece-card').first().waitFor();assert.equal(await page.locator('.piece-card').count(),14);
  await page.getByRole('button',{name:'Filtres',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('combobox',{name:'Famille',exact:true}).selectOption('OP');await dialog.locator('input[name="filter-Rareté"]').locator('..').filter({hasText:/^SR/}).click();await dialog.getByRole('button',{name:'Voir 1 cartes',exact:true}).click();assert.equal(await page.locator('.piece-card').count(),1);assert.equal(await page.getByRole('button',{name:'Filtres',exact:true}).evaluate(el=>el===document.activeElement),true);
  await page.getByRole('button',{name:'Filtres',exact:true}).click();await dialog.getByRole('button',{name:'Réinitialiser',exact:true}).click();await dialog.getByRole('button',{name:'Voir 14 cartes',exact:true}).click();assert.equal(await page.locator('.piece-card').count(),14);
 });
 await check('Card zoom, accessible next/previous, swipe and favorite persistence',async()=>{
  await page.getByRole('button',{name:/Carte Mobile Card 01/}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Agrandir l’illustration',exact:true}).click();assert.equal(await dialog.locator('.piece-card-zoom.is-zoomed').count(),1);await dialog.getByRole('button',{name:'Réduire l’illustration',exact:true}).click();await page.screenshot({path:new URL('card-mobile-detail.png',evidence).pathname,animations:'disabled'});await dialog.getByRole('button',{name:'Ajouter aux favoris',exact:true}).click();await dialog.getByRole('button',{name:'Retirer des favoris',exact:true}).waitFor();await dialog.getByRole('button',{name:'Carte suivante',exact:true}).click();await dialog.getByRole('heading',{name:'Mobile Card 02',exact:true}).waitFor();await dialog.getByRole('button',{name:'Carte précédente',exact:true}).click();await dialog.getByRole('heading',{name:'Mobile Card 01',exact:true}).waitFor();
  await dialog.locator('.piece-card-zoom').dispatchEvent('pointerdown',{clientX:220,clientY:150,isPrimary:true});await dialog.locator('.piece-card-zoom').dispatchEvent('pointerup',{clientX:100,clientY:160,isPrimary:true});await dialog.getByRole('heading',{name:'Mobile Card 02',exact:true}).waitFor();await page.keyboard.press('Escape');await page.reload();await page.locator('.piece-card').first().waitFor();await page.getByRole('button',{name:'Filtres',exact:true}).click();await page.getByLabel('Mes favoris',{exact:true}).check();await page.getByRole('button',{name:'Voir 1 cartes',exact:true}).click();assert.equal(await page.locator('.piece-card').count(),1);
  assert.equal(await db.favoriteCard.count({where:{userId:user.id,cardId:cards[1].id}}),1);
 });
 await check('Collection and builder remain usable at all seven viewports',async()=>{
  for(const [width,height] of [[360,800],[375,667],[390,844],[430,932],[768,1024],[1280,800],[1440,900]]){await page.setViewportSize({width,height});for(const route of ['collection','deck-builder']){await page.goto(`${baseURL}/${route}`);await page.locator('.piece-card').first().waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} ${width}`);if(route==='collection')assert.equal(await page.getByRole('button',{name:'Filtres',exact:true}).isVisible().catch(()=>false),width<=950);else{assert.equal(await page.getByRole('tablist',{name:'Éditeur de deck'}).isVisible(),width<=950);assert.equal(await page.locator('.piece-builder-deck-panel').isVisible(),width>950);}await page.screenshot({path:new URL(`${route}-${width}.png`,evidence).pathname,fullPage:true,animations:'disabled'});}}
 });
 let deckId;
 await check('Mobile builder tabs preserve entries, validate quantities and save 50 cards',async()=>{
  await page.setViewportSize({width:390,height:844});await page.goto(baseURL+'/deck-builder');await page.getByRole('searchbox',{name:'Recherche',exact:true}).fill('MOBILE-000');await page.getByRole('button',{name:'Choisir',exact:true}).click();
  for(let i=1;i<=13;i++){await page.getByRole('searchbox',{name:'Recherche',exact:true}).fill(cards[i].code);const count=i<=12?4:2;for(let n=0;n<count;n++)await page.getByRole('button',{name:'Ajouter',exact:true}).click();}
  await page.getByRole('tab',{name:/Mon deck/}).click();assert.equal(await page.locator('.piece-builder-catalogue-panel').isVisible(),false);await page.getByLabel('Nom du deck',{exact:true}).fill('Deck mobile fixture');assert.equal(await page.locator('.piece-deck-entry').count(),14);
  const plus=page.getByRole('button',{name:'Ajouter Mobile Card 01',exact:true});await plus.click();await page.locator('.piece-error[role=alert]').waitFor();assert.ok((await page.locator('.piece-error[role=alert]').textContent()).length>0);
  await page.getByRole('button',{name:'Statistiques et validation',exact:true}).click();assert.equal(await page.locator('#builder-statistics').isVisible(),true);await page.getByRole('button',{name:'Sauvegarder le deck',exact:true}).click();await page.waitForURL('**/decks');const deck=await db.deck.findFirst({where:{userId:user.id,name:'Deck mobile fixture'},include:{versions:{include:{cards:true}}}});assert.ok(deck);deckId=deck.id;assert.equal(deck.versions[0].cards.reduce((sum,c)=>sum+c.quantity,0),51);
 });
 await check('Saved deck loads with 50 cards and keyboard switches mobile tabs',async()=>{
  assert.ok(deckId);await page.goto(`${baseURL}/deck-builder?deckId=${deckId}`);await page.getByRole('tab',{name:'Mon deck · 50/50',exact:true}).waitFor();await page.getByRole('tab',{name:'Catalogue',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'Mon deck · 50/50',exact:true}).getAttribute('aria-selected'),'true');assert.equal(await page.getByLabel('Nom du deck',{exact:true}).inputValue(),'Deck mobile fixture');await page.screenshot({path:new URL('deck-mobile-loaded.png',evidence).pathname,fullPage:true,animations:'disabled'});
 });
 await check('Light theme collection, filter sheet and deck remain readable without overflow',async()=>{
  await page.getByRole('button',{name:'Ouvrir le menu',exact:true}).click();await page.locator('.piece-mobile-menu').getByRole('button',{name:'Clair',exact:true}).click();await page.getByRole('button',{name:'Fermer le menu',exact:true}).click();
  for(const route of ['collection',`deck-builder?deckId=${deckId}`]){await page.goto(`${baseURL}/${route}`);await page.locator('.piece-card').first().waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:new URL(route.startsWith('collection')?'collection-mobile-light.png':'deck-mobile-light.png',evidence).pathname,fullPage:true,animations:'disabled'});}
  await page.goto(baseURL+'/collection');await page.getByRole('button',{name:'Filtres',exact:true}).click();await page.getByRole('dialog').waitFor();await page.screenshot({path:new URL('filters-mobile-light.png',evidence).pathname,animations:'disabled'});await page.keyboard.press('Escape');
 });
 await check('No rewards or collection quantities modified by UI operations',async()=>{
  assert.equal((await db.userCard.aggregate({where:{userId:user.id},_sum:{quantity:true}}))._sum.quantity,53);assert.equal(await db.boosterOpening.count({where:{userId:user.id}}),0);assert.deepEqual(errors,[]);
 });
 await context.close();await api.dispose();
}catch(e){results.push({name:'Mobile collection/deck setup',status:'FAIL',detail:e.message});}
finally{if(browser)await browser.close();await db.$disconnect();fs.writeFileSync(new URL('results.json',evidence),JSON.stringify(results,null,2));}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
