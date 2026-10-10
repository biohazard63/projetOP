import { chromium, request } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const url=new URL(process.env.DATABASE_URL || '');
if(url.hostname!=='127.0.0.1'||url.port!=='55432'||url.pathname!=='/op_boosters_test')throw Error('Isolated booster test database required');
const baseURL='http://localhost:3007';
const db=new PrismaClient();
const evidence=new URL('../../docs/maintenance/evidence/ui/',import.meta.url);
fs.mkdirSync(evidence,{recursive:true});
const results=[];
const tag=randomUUID();
const contexts=[];
let browser;
async function check(name, fn){try{const detail=await fn();results.push({name,status:'PASS',detail:detail||'Assertions passed'})}catch(e){results.push({name,status:'FAIL',detail:e.message})}console.log(results.at(-1));}
const alice=await request.newContext({baseURL});const bob=await request.newContext({baseURL});const anon=await request.newContext({baseURL});contexts.push(alice,bob,anon);
const users=[];
const password='Collector-UI-Test-9!';
try{
 for(const context of [alice,bob]){
  const user=await db.user.create({data:{email:`collector-ui-${randomUUID()}@example.test`,name:'Collectionneur test',password:await bcrypt.hash(password,10),hasStarterDecks:true}});users.push(user);
  const csrf=await(await context.get('/api/auth/csrf')).json();await context.post('/api/auth/callback/credentials',{form:{email:user.email,password,csrfToken:csrf.csrfToken,callbackUrl:baseURL},maxRedirects:0});
  assert.equal((await(await context.get('/api/auth/session')).json()).user?.id,user.id);
 }
 const code=`UI-${tag}`;
 await db.cardSet.create({data:{code,name:'Équipage de test UI',releaseDate:new Date('2026-01-01')}});
 const fixtureCards=[];
 for(let i=0;i<14;i++){
  const card=await db.card.create({data:{id:`ui-${tag}-${i}`,name:i===0?'UI Leader Luffy':`UI Character ${String(i).padStart(2,'0')}`,code:`UI-${String(i).padStart(3,'0')}`,type:i===0?'LEADER':'CHARACTER',color:'RED',cost:i%10,power:5000,rarity:i===0?'L':i===1?'SEC':i===2?'SR':'C',isAltArt:i===1,imageUrl:'/images/OP05-119.webp',setCode:code,set:code,effect:'Texte de démonstration de catalogue.'}});
  fixtureCards.push(card);await db.userCard.create({data:{userId:users[0].id,cardId:card.id,quantity:i===0?1:4}});
 }
 await check('Credentials login, persistent session and private overview ownership',async()=>{
  assert.equal((await anon.get('/api/collector')).status(),401);
  const r=await alice.get(`/api/collector?userId=${users[1].id}`);assert.match(r.headers()['cache-control'],/no-store/);
  const stats=await r.json();assert.equal(stats.profile.email,users[0].email);assert.equal(stats.total,53);assert.equal(stats.unique,14);assert.equal(stats.decks,0);
  const catalogue=await(await alice.get('/api/cards')).json();assert.ok(catalogue.some(card=>card.id===fixtureCards[0].id),'Fresh imported cards must be visible');
  const other=await(await bob.get('/api/collector')).json();assert.equal(other.total,0);assert.equal(other.unique,0);assert.equal(other.profile.email,users[1].email);
 });
 for(const route of ['/home','/collection','/boosters','/boosters/OP-999992','/deck-builder','/decks','/history','/profile','/opening-demo','/login'])await alice.get(route);
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const context=await browser.newContext({storageState:await alice.storageState(),viewport:{width:1440,height:1000}});contexts.push(context);
 const page=await context.newPage();page.setDefaultTimeout(20000);
 const jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
 await check('Reference sidebar dashboard uses real statistics and no placeholder figures',async()=>{
  await page.goto(baseURL+'/home');await page.getByRole('region',{name:'Statistiques de collection'}).waitFor();
  assert.equal(await page.locator('.piece-stat').count(),4);assert.ok((await page.locator('.piece-stat').first().textContent()).includes('14'));assert.equal(await page.locator('.piece-sidebar').isVisible(),true);
  await page.waitForFunction(()=>{const image=document.querySelector('.piece-hero-art img');return image?.complete&&image.naturalWidth>0});await page.locator('.piece-set').first().waitFor();
  await page.screenshot({path:new URL('dashboard-desktop.png',evidence).pathname,fullPage:true});
 });
 await check('Global card code search, binder filters, list toggle, reset and favorites persistence',async()=>{
  await page.getByRole('searchbox',{name:'Recherche globale de cartes'}).fill('UI-001');await page.getByRole('button',{name:'Rechercher',exact:true}).click();
  await page.getByRole('button',{name:/Carte UI Character 01/}).waitFor();assert.equal(await page.locator('.piece-card').count(),1);
  await page.getByRole('button',{name:'Liste',exact:true}).click();assert.equal(await page.locator('.piece-card-grid.list').count(),1);
  await page.getByRole('button',{name:'Réinitialiser'}).click();await page.waitForFunction(()=>document.querySelectorAll('.piece-card').length===14);
  await page.getByRole('button',{name:/Carte UI Character 01/}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Ajouter aux favoris'}).click();await page.getByRole('button',{name:'Retirer des favoris'}).waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByLabel('Mes favoris',{exact:true}).check();await page.waitForFunction(()=>document.querySelectorAll('.piece-card').length===1);
  await page.reload();await page.getByLabel('Mes favoris',{exact:true}).check();await page.waitForFunction(()=>document.querySelectorAll('.piece-card').length===1);
 });
 await check('Missing cards, rarity/color facets, variants and immersive card details',async()=>{
  await page.getByRole('button',{name:'Réinitialiser'}).click();await page.getByLabel('Afficher',{exact:true}).selectOption('missing');await page.locator('.piece-card-image.missing').first().waitFor();
  await page.getByRole('button',{name:'Réinitialiser'}).click();await page.locator('input[name="filter-Rareté"]').evaluateAll(inputs=>{const i=inputs.find(input=>input.parentElement.textContent.startsWith('SEC'));i.click()});await page.waitForFunction(()=>document.querySelectorAll('.piece-card').length===1);
  await page.getByRole('button',{name:/Carte UI Character 01/}).click();await page.getByRole('dialog').waitFor();await page.getByText('Illustration alternative',{exact:true}).waitFor();await page.getByRole('link',{name:'Ajouter à un deck'}).waitFor();await page.keyboard.press('Escape');
 });
 await check('Booster carousel selection and empty extension remain explicit',async()=>{
  await page.goto(baseURL+'/boosters');await page.locator('.piece-carousel-active').waitFor();const initial=await page.getByTestId('selected-booster-artwork').getAttribute('alt');await page.getByRole('button',{name:'Extension suivante',exact:true}).click();await page.waitForFunction(alt=>document.querySelector('[data-testid=selected-booster-artwork]')?.alt!==alt,initial);assert.notEqual(await page.getByTestId('selected-booster-artwork').getAttribute('alt'),initial);
  await page.goto(baseURL+'/boosters/OP-999992');await page.getByRole('heading',{name:'Catalogue encore vide'}).waitFor();assert.equal(await page.getByRole('link',{name:'Ouvrir ce booster',exact:true}).count(),0);
 });
 let deckId;
 await check('Deck builder leader, quantity limit, 50 cards, chart and real server save',async()=>{
  await page.goto(baseURL+'/deck-builder');await page.getByLabel('Recherche',{exact:true}).fill('UI Leader Luffy');await page.getByRole('button',{name:'Choisir',exact:true}).first().click();
  await page.getByLabel('Nom du deck',{exact:true}).fill('Équipage UI validé');
  for(let i=1;i<=13;i++){
   await page.getByLabel('Recherche',{exact:true}).fill(`UI Character ${String(i).padStart(2,'0')}`);const add=page.locator('.piece-builder-catalog').getByRole('button',{name:'Ajouter',exact:true});await add.waitFor();
   for(let j=0;j<(i===13?2:4);j++)await add.click();
  }
  await page.getByText('50/50 cartes',{exact:true}).waitFor();assert.equal(await page.locator('.piece-cost-column').count(),11);
  await page.getByRole('button',{name:'Sauvegarder',exact:true}).click();await page.waitForURL('**/decks',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Équipage UI validé',exact:true}).waitFor();
  const list=await(await alice.get('/api/decks')).json();deckId=list.decks.find(d=>d.name==='Équipage UI validé').id;assert.equal(list.decks[0].cards.reduce((n,c)=>n+(c.type==='LEADER'?0:c.quantity),0),50);
 });
 await check('Saved deck loads, updates version, activates and remains private',async()=>{
  assert.equal((await bob.get(`/api/decks/${deckId}`)).status(),404);
  await page.goto(baseURL+`/deck-builder?deckId=${deckId}`);await page.getByText('50/50 cartes',{exact:true}).waitFor();await page.getByLabel('Nom du deck',{exact:true}).fill('Équipage UI modifié');const updated=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().endsWith(deckId));await page.getByRole('button',{name:'Sauvegarder',exact:true}).click();const updateResponse=await updated;assert.equal(updateResponse.status(),200,await updateResponse.text());await page.waitForURL('**/decks',{waitUntil:'domcontentloaded'});const activated=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/activate'));await page.getByRole('button',{name:'Activer',exact:true}).click();assert.equal((await activated).status(),200);await page.waitForFunction(()=>document.cookie!==undefined);assert.equal((await context.cookies()).some(cookie=>cookie.name==='activeDeckId' && cookie.value===deckId),true);
  assert.equal((await db.deck.findUnique({where:{id:deckId},include:{versions:true}})).versions.length,2);
 });
 let opening;
 await check('Concurrent replay on secure opening is credited exactly once',async()=>{
  const before=(await db.userCard.aggregate({where:{userId:users[0].id},_sum:{quantity:true}}))._sum.quantity;
  const body={setCode:'OP-999991',idempotencyKey:randomUUID()};const responses=await Promise.all(Array.from({length:5},()=>alice.post('/api/booster/open',{data:body})));const data=await Promise.all(responses.map(r=>r.json()));opening=data[0].opening;
  assert.equal(new Set(data.map(d=>d.opening.id)).size,1);assert.equal((await db.userCard.aggregate({where:{userId:users[0].id},_sum:{quantity:true}}))._sum.quantity,before+12);
  assert.equal((await bob.get(`/api/booster/openings/${opening.id}`)).status(),404);
 });
 await check('Dedicated history receipt and new/duplicate cards are read only',async()=>{
  const before=(await db.userCard.aggregate({where:{userId:users[0].id},_sum:{quantity:true}}))._sum.quantity;
  let posts=0;const listener=r=>{if(r.method()==='POST'&&r.url().includes('/api/booster'))posts++};page.on('request',listener);
  await page.goto(baseURL+`/history?opening=${opening.id}`);await page.getByRole('button',{name:/Carte /}).first().waitFor();assert.equal(await page.locator('.piece-card').count(),12);await page.reload();await page.getByRole('button',{name:/Carte /}).first().waitFor();assert.equal(posts,0);page.off('request',listener);
  assert.equal((await db.userCard.aggregate({where:{userId:users[0].id},_sum:{quantity:true}}))._sum.quantity,before);
  await page.screenshot({path:new URL('history-desktop.png',evidence).pathname,fullPage:true});
 });
 await check('Profile display settings persist and session remains active',async()=>{
  await page.goto(baseURL+'/profile');await page.getByLabel('Cinématiques d’ouverture').uncheck();await page.getByLabel('Réduire les effets visuels').check();await page.getByLabel('Affichage du classeur').selectOption('compact');await page.reload();assert.equal(await page.getByLabel('Cinématiques d’ouverture').isChecked(),false);assert.equal(await page.getByLabel('Réduire les effets visuels').isChecked(),true);assert.equal(await page.getByLabel('Affichage du classeur').inputValue(),'compact');
  await page.getByLabel('Cinématiques d’ouverture').check();await page.getByLabel('Réduire les effets visuels').uncheck();
 });
 await check('Cinematic skips, resumes a receipt after refresh and never credits via animation',async()=>{
  await page.goto(baseURL+'/booster-opening?set=OP-999991');await page.locator('#booster-set').selectOption('OP-999991');const before=(await db.boosterOpening.count({where:{userId:users[0].id}}));let posts=0;const listener=r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/booster/open')posts++};page.on('request',listener);
  await page.getByRole('button',{name:'Ouvrir le booster',exact:true}).click();await page.getByTestId('pack-animation').waitFor();await page.reload();await page.getByTestId('draw-slot').first().waitFor();await page.getByRole('button',{name:'Tout révéler',exact:true}).click();assert.equal(posts,1);assert.equal(await db.boosterOpening.count({where:{userId:users[0].id}}),before+1);page.off('request',listener);
  await page.screenshot({path:new URL('opening-result-desktop.png',evidence).pathname,fullPage:true});
 });
 await check('A completed receipt allows selection of another extension without attribution',async()=>{
  const before=await db.boosterOpening.count({where:{userId:users[0].id}});await page.goto(baseURL+'/booster-opening?set=OP-999994');await page.getByTestId('draw-slot').first().waitFor();await page.waitForFunction(()=>document.querySelector('#booster-set')?.value==='OP-999994');assert.equal(await db.boosterOpening.count({where:{userId:users[0].id}}),before);
 });
 for(const viewport of [{width:1440,height:1000},{width:820,height:1180},{width:390,height:844}]){
  await check(`Responsive navigation, card grid and scroll ${viewport.width}px`,async()=>{
   await page.setViewportSize(viewport);for(const route of ['/home','/boosters','/collection','/deck-builder','/history','/profile']){
    await page.goto(baseURL+route);await page.locator('.piece-page h1').waitFor();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,route);
   }
   await page.goto(baseURL+'/collection');await page.locator('.piece-card').first().waitFor();const before=await page.evaluate(()=>window.scrollY);await page.mouse.wheel(0,650);await page.waitForTimeout(300);assert.ok(await page.evaluate(y=>window.scrollY>y,before));
   if(viewport.width===390){await page.getByRole('button',{name:'Ouvrir le menu'}).click();await page.getByRole('navigation',{name:'Navigation mobile'}).getByRole('link',{name:'Accueil',exact:true}).click();await page.waitForURL('**/home');}
   await page.screenshot({path:new URL(`responsive-${viewport.width}.png`,evidence).pathname,fullPage:true});
  });
 }
 await check('Reduced motion demo and visual keyboard controls require no WebGL',async()=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(baseURL+'/opening-demo');await page.getByRole('button',{name:'Lancer la démonstration'}).click();await page.getByRole('button',{name:'Tout révéler',exact:true}).waitFor();assert.equal(await page.getByTestId('pack-animation').count(),0);
  await page.getByRole('button',{name:'Tout révéler',exact:true}).click();await page.getByRole('button',{name:/Carte Carte de démonstration/}).first().click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await page.getByRole('dialog').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await check('Deck deletion requires explicit confirmation and preserves owned cards',async()=>{
  const before=(await db.userCard.aggregate({where:{userId:users[0].id},_sum:{quantity:true}}))._sum.quantity;await page.goto(baseURL+'/decks');await page.getByRole('button',{name:'Supprimer',exact:true}).first().click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Annuler',exact:true}).click();assert.ok(await db.deck.findUnique({where:{id:deckId}}));await page.getByRole('button',{name:'Supprimer',exact:true}).first().click();await page.getByRole('button',{name:'Supprimer le deck',exact:true}).click();await page.getByText('Deck supprimé.',{exact:true}).waitFor();assert.equal(await db.deck.findUnique({where:{id:deckId}}),null);assert.equal((await db.userCard.aggregate({where:{userId:users[0].id},_sum:{quantity:true}}))._sum.quantity,before);
 });
 const guest=await browser.newContext({viewport:{width:390,height:844}});contexts.push(guest);const empty=await browser.newContext({storageState:await bob.storageState(),viewport:{width:1280,height:900}});contexts.push(empty);
 await check('Private pages redirect unauthenticated visitors and empty collection is explicit',async()=>{
  const visitor=await guest.newPage();for(const route of ['/collection','/history','/profile','/deck-builder','/boosters']){await visitor.goto(baseURL+route);await visitor.waitForURL('**/login');}
  const emptyPage=await empty.newPage();await emptyPage.goto(baseURL+'/collection');await emptyPage.getByRole('heading',{name:'Aucune carte à cet horizon'}).waitFor();
 });
 await check('Network error state can retry safely',async()=>{
  const failure=await guest.newPage();await failure.route('**/api/collector',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Collection temporairement indisponible'})}));await failure.context().addCookies((await alice.storageState()).cookies);await failure.goto(baseURL+'/profile');await failure.getByRole('alert').getByText('Collection temporairement indisponible').waitFor();await failure.unroute('**/api/collector');await failure.getByRole('button',{name:'Réessayer',exact:true}).click();await failure.getByText('Adresse email',{exact:true}).waitFor();
 });
 await check('Logout clears the session and protects private pages',async()=>{await page.goto(baseURL+'/profile');await page.getByRole('button',{name:'Se déconnecter',exact:true}).click();await page.waitForURL('**/login');assert.equal((await(await context.request.get(baseURL+'/api/auth/session')).json())?.user,undefined);});
 await check('No browser JavaScript errors across collector routes',async()=>assert.deepEqual(jsErrors,[]));
} finally {
 fs.writeFileSync(new URL('functional-results.json',evidence),JSON.stringify(results,null,2)+'\n');
 for(const context of contexts)await (context.dispose?context.dispose():context.close());
 if(browser)await browser.close();await db.$disconnect();
}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
