import { chromium, request } from '@playwright/test';
import fs from 'node:fs';
const db = new URL(process.env.DATABASE_URL || '');
if (db.hostname !== '127.0.0.1' || db.port !== '55432' || db.pathname !== '/op_recovery_test') throw new Error('Isolated recovery database required');
const baseURL = 'http://localhost:3007';
const results = [];
async function check(name, fn) { try { const detail = await fn(); results.push({ name, status: 'PASS', detail }); } catch(e) { results.push({ name, status: 'FAIL', detail: e.message }); } console.log(results.at(-1)); }
function expect(ok, msg) { if (!ok) throw new Error(msg); }
const anon = await request.newContext({ baseURL });
const alice = await request.newContext({ baseURL });
const bob = await request.newContext({ baseURL });
const tag = Date.now();
const email = `recovery-${tag}@example.test`, other = `other-${tag}@example.test`;
const password = 'Recovery-Test-9!';
async function login(ctx, address) {
 const csrf = await (await ctx.get('/api/auth/csrf')).json();
 const res = await ctx.post('/api/auth/callback/credentials', { form: { csrfToken: csrf.csrfToken, email: address, password, callbackUrl: baseURL }, maxRedirects: 0 });
 expect(res.status() < 400, `login HTTP ${res.status()}`);
 const session = await (await ctx.get('/api/auth/session')).json();
 expect(session.user?.email === address, 'Session absent');
}
await check('Public cards and sets', async () => { expect((await anon.get('/api/cards')).status() === 200, 'cards'); expect((await anon.get('/api/sets')).status() === 200, 'sets'); });
await check('Unauthenticated API protection', async () => { for (const route of ['/api/decks','/api/user/collection']) expect((await anon.get(route)).status() === 401, route); for (const route of ['/api/game/block','/api/game/execute-effect','/api/booster/open']) expect((await anon.post(route,{data:{}})).status() === 401,route); });
await check('Private pages redirect metadata', async () => { for (const route of ['/collection','/decks','/deck-builder','/booster-opening','/game']) { const r=await anon.get(route,{maxRedirects:0}); expect([307,308].includes(r.status()) || (r.status() === 200 && (await r.text()).includes('NEXT_REDIRECT')), `${route}: ${r.status()}`); } });
await check('Registration and normalized email', async () => { for (const address of [email,other]) { const r=await anon.post('/api/auth/register',{data:{name:'Recovery test',email:` ${address.toUpperCase()} `,password}}); expect(r.status()===201, `registration ${r.status()}`); expect(!(await r.json()).user.password, 'password exposure'); } });
await check('Invalid registration types', async () => { expect((await anon.post('/api/auth/register',{data:{name:{},email:[],password:17}})).status()===400,'types'); });
await check('Login and session persistence', async () => { await login(alice,email); await login(bob,other); expect((await (await alice.get('/api/auth/session')).json()).user.email===email,'persistence'); });
await check('Collection server opening and quantities persist', async () => { const r=await alice.post('/api/booster/open',{data:{setCode:'OP-999991',idempotencyKey:crypto.randomUUID()}}); expect(r.status()===201,`opening ${r.status()}`); const receipt=(await r.json()).opening; const data=await (await alice.get('/api/user/collection')).json(); const counts=new Map(); for(const c of receipt.cards) counts.set(c.id,(counts.get(c.id)||0)+1); for(const [id,quantity] of counts) expect(data.cards.find(c=>c.id===id)?.quantity===quantity,'quantity'); });
await check('Collection invalid payload', async()=>{ expect((await alice.post('/api/collection/add-cards',{data:{cardIds:[{}]}})).status()===400,'payload'); });
let deckId;
const cards=[{id:'recovery-leader',quantity:1},...Array.from({length:13},(_,i)=>({id:`recovery-card-${i}`,quantity:i===12?2:4}))];
await check('Deck creation and load',async()=>{const r=await alice.post('/api/decks',{data:{name:'Recovery deck',cards}});expect(r.status()===200,`create ${r.status()} ${await r.text()}`);deckId=(await r.json()).id;const d=await (await alice.get(`/api/decks/${deckId}`)).json();expect(d.cards.reduce((n,c)=>n+c.quantity,0)===51,'load quantities');});
await check('Deck ownership GET PUT DELETE',async()=>{expect(deckId,'no deck');for(const method of ['get','put','delete']){const r=await bob[method](`/api/decks/${deckId}`,{data:{name:'forged',cards}});expect(r.status()===404,`${method} ${r.status()}`);} });
await check('Deck rejects forged types and quantities',async()=>{const forged=cards.map(c=>({...c,type:'LEADER',quantity:c.quantity}));forged[0].id='missing-card';expect((await alice.post('/api/decks',{data:{name:'Forged',cards:forged}})).status()===400,'unknown');expect((await alice.post('/api/decks',{data:{name:'Forged',cards:[{id:'recovery-leader',quantity:-1}]}})).status()===400,'quantity');});
await check('Deck update and activation',async()=>{expect((await alice.put(`/api/decks/${deckId}`,{data:{name:'Renamed',cards}})).status()===200,'update');expect((await alice.post('/api/decks/active',{data:{deckId}})).status()===200,'activate');expect((await (await alice.get('/api/decks/active')).json()).deck.name==='Renamed','active');});
await check('Booster generation and receipt acknowledgement',async()=>{const body={setCode:'OP-999991',idempotencyKey:crypto.randomUUID()};const r=await alice.post('/api/booster/open',{data:body});expect(r.status()===201,`open ${r.status()}`);const data=await r.json();expect(data.cards.length===12,`pack length ${data.cards.length}`);expect(data.cards.every(c=>c.setCode==='OP-999991'),'cross-set card');expect((await alice.post('/api/booster/add-to-collection',{data:{openingId:data.opening.id}})).status()===200,'receipt');const replay=await alice.post('/api/booster/open',{data:body});expect(replay.status()===200,'replay');expect((await replay.json()).opening.id===data.opening.id,'same receipt');});
await check('Missing booster set is explicit',async()=>{expect((await alice.post('/api/booster/open',{data:{setCode:'UNKNOWN',idempotencyKey:crypto.randomUUID()}})).status()===403,'empty pack');});
await check('Solo game initialization and isolated IDs',async()=>{const r=await alice.post('/api/game/initialize');expect(r.status()===200,`game ${r.status()}`);const first=await r.json();expect(first.player.hand.length===5,'hand size');expect(first.player.deck.length===45,'deck quantities');expect(new Set([...first.player.hand,...first.player.deck].map(c=>c.id)).size===50,'unique instances');const second=await (await alice.post('/api/game/initialize')).json();expect(first.id!==second.id,'shared game ID');expect((await alice.post('/api/game/keep-hand')).status()===200,'keep hand');expect((await alice.post('/api/game/end-turn')).status()===200,'end turn');});
await check('Unsupported effects explicit',async()=>{expect((await alice.post('/api/game/execute-effect',{data:{}})).status()===501,'effect');});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
await check('Private pages redirect in browser', async()=>{ const privateContext=await browser.newContext(); const privatePage=await privateContext.newPage(); await privatePage.goto(baseURL+'/collection'); await privatePage.waitForURL('**/login'); await privateContext.close(); });
const errors=[];
const context=await browser.newContext({storageState:await alice.storageState()});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await check('Desktop navigation and JavaScript',async()=>{for(const route of ['/home','/collection','/decks','/deck-builder','/booster-opening','/game']){const r=await page.goto(baseURL+route);expect(r.status()===200,`${route} ${r.status()}`);await page.waitForTimeout(700);}expect(!errors.length,errors.join('; '));});
await check('Collection search and type/color filters',async()=>{await page.goto(baseURL+'/collection');await page.getByPlaceholder('Rechercher un prisonnier...').waitFor();const cards=page.locator('img[alt^="recovery-"]');expect(await cards.count()>0,'cards not displayed');await page.getByPlaceholder('Rechercher un prisonnier...').fill('no-card-matches-this');await page.waitForTimeout(250);expect(await cards.count()===0,'search filter');await page.getByPlaceholder('Rechercher un prisonnier...').fill('');await page.getByRole('combobox').nth(1).click();await page.getByRole('option',{name:'Rouge',exact:true}).click();await page.waitForTimeout(250);expect(await cards.count()>0,'RED/Red color mismatch');await page.getByRole('combobox').nth(0).click();await page.getByRole('option',{name:'Événement',exact:true}).click();await page.waitForTimeout(250);expect(await cards.count()===0,'type filter');});
await check('Mobile collection layout and images',async()=>{await page.setViewportSize({width:390,height:844});await page.goto(baseURL+'/collection');await page.waitForTimeout(1000);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'horizontal overflow');expect(await page.evaluate(()=>Array.from(document.images).filter(i=>i.complete&&i.naturalWidth===0).length)===0,'broken loaded image');await page.screenshot({path:'/tmp/op-mobile.png'});});
await check('Deck delete',async()=>{expect((await alice.delete(`/api/decks/${deckId}`)).status()===200,'delete');expect((await alice.get(`/api/decks/${deckId}`)).status()===404,'deleted load');});
await check('Logout clears session',async()=>{const csrf=await(await alice.get('/api/auth/csrf')).json();await alice.post('/api/auth/signout',{form:{csrfToken:csrf.csrfToken,callbackUrl:baseURL},maxRedirects:0});expect(!(await(await alice.get('/api/auth/session')).json())?.user,'logout');});
await browser.close();fs.writeFileSync('/tmp/op-functional.json',JSON.stringify(results,null,2));

if (results.some(r => r.status === 'FAIL')) process.exitCode = 1;
