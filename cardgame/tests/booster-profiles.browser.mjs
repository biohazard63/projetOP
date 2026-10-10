import {chromium,request} from '@playwright/test';
import {PrismaClient} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import bcrypt from 'bcryptjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const url=new URL(process.env.DATABASE_URL||'');
if(url.hostname!=='127.0.0.1'||url.port!=='55432'||url.pathname!=='/op_boosters_test')throw new Error('Base isolée requise');
const baseURL='http://localhost:3011';const db=new PrismaClient();let browser;
const results=[];const tag=randomUUID();const code=`OP-3${Date.now()}`;
const evidence=new URL('../../docs/boosters/evidence/',import.meta.url);
const api=await request.newContext({baseURL});const anon=await request.newContext({baseURL});
try{
 const password='Managed-Profile-Test-9!';const email=`managed-browser-${tag}@example.test`;
 const user=await db.user.create({data:{email,password:await bcrypt.hash(password,10),name:'Managed profiles browser fixture',hasStarterDecks:true}});
 await db.cardSet.create({data:{code,name:'Profils de test',releaseDate:new Date()}});
 const slot=(rarity,variant)=>({choices:[{rarity,variant,weight:1}]});const common=slot('C','standard');
 const profiles=[{label:'SR standard',weight:80,slots:[common,slot('SR','standard')]},{label:'ALT SR',weight:20,slots:[common,slot('SR','alt')]}];
 await db.setRules.create({data:{code,rarityCounts:{},typeCounts:{},boosterRules:{version:1,label:'Profils de test',source:'Fixture synthétique non officielle',selection:'number',variantPolicy:'metadata',slots:profiles[0].slots,packProfiles:profiles,specialPacks:[]}}});
 for(const [suffix,rarity,isAltArt]of[['C','C',false],['SR','SR',false],['SR_p1','SR',true]])await db.card.create({data:{id:`browser-managed-${tag}-${suffix}`,code:`browser-managed-${tag}-${suffix}`,name:suffix,rarity,isAltArt,type:'CHARACTER',color:'RED',cost:1,imageUrl:'/images/card-back.jpg',setCode:code}});
 assert.equal((await anon.post('/api/booster/open',{data:{setCode:code,idempotencyKey:randomUUID()}})).status(),401);
 results.push({test:'Authentication required',status:'PASS'});
 const csrf=await(await api.get('/api/auth/csrf')).json();
 const login=await api.post('/api/auth/callback/credentials',{form:{email,password,csrfToken:csrf.csrfToken,callbackUrl:baseURL},maxRedirects:0});
 assert.ok(login.status()<400);assert.equal((await(await api.get('/api/auth/session')).json()).user?.id,user.id);
 results.push({test:'Credentials login and session',status:'PASS'});
 const forged=await api.post('/api/booster/open',{data:{setCode:code,idempotencyKey:randomUUID(),packProfiles:profiles}});
 assert.equal(forged.status(),400);results.push({test:'Client profile injection rejected',status:'PASS'});
 const body={setCode:code,idempotencyKey:randomUUID()};
 const responses=await Promise.all(Array.from({length:5},()=>api.post('/api/booster/open',{data:body})));
 assert.equal(responses.filter(r=>r.status()===201).length,1);assert.ok(responses.every(r=>[200,201].includes(r.status())));
 const receipts=await Promise.all(responses.map(r=>r.json()));assert.equal(new Set(receipts.map(r=>r.opening.id)).size,1);assert.ok(receipts[0].opening.cards.every(c=>['standard','alt'].includes(c.drawVariant)));
 assert.equal((await db.userCard.aggregate({where:{userId:user.id},_sum:{quantity:true}}))._sum.quantity,2);
 results.push({test:'Real HTTP concurrency credits exactly one two-card result',status:'PASS'});
 assert.equal((await anon.get(`/api/booster/openings/${receipts[0].opening.id}`)).status(),401);
 results.push({test:'Private receipt',status:'PASS'});
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const context=await browser.newContext({storageState:await api.storageState(),viewport:{width:390,height:844}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  await page.setViewportSize(viewport);await page.goto(`${baseURL}/booster-opening?set=${code}`);
  const summary=page.getByText('Composition et probabilités',{exact:true});await summary.waitFor();await summary.click();
  await page.getByText('SR standard : 80.00 % des boosters',{exact:true}).waitFor();
  await page.getByText('ALT SR : 20.00 % des boosters',{exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:new URL(viewport.width<500?'managed-profiles-mobile.png':'managed-profiles-desktop.png',evidence).pathname,fullPage:true});
  results.push({test:`Actual odds displayed without overflow at ${viewport.width}×${viewport.height}`,status:'PASS'});
 }
 assert.deepEqual(errors,[]);results.push({test:'No browser JavaScript error',status:'PASS'});
}catch(e){results.push({test:'Managed profiles browser scenario',status:'FAIL',error:e instanceof Error?e.message:'Failed'});process.exitCode=1}
finally{
 await fs.writeFile(new URL('managed-profiles-browser.json',evidence),JSON.stringify({baseURL,isolatedDatabase:true,productionModified:false,results},null,2));
 console.log(JSON.stringify(results,null,2));await browser?.close();await api.dispose();await anon.dispose();await db.$disconnect();
}
