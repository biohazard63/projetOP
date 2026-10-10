import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const baseURL = process.env.UI_BASE_URL || 'http://127.0.0.1:3000';
if (!['127.0.0.1','localhost'].includes(new URL(baseURL).hostname)) throw new Error('Local UI target required');
const evidence = new URL('../../docs/design/evidence/phase-1/', import.meta.url);
fs.mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const results = [];
try {
 const context = await browser.newContext({ colorScheme: 'dark' });
 const page = await context.newPage();
 for (const [width,height] of [[360,800],[375,667],[390,844],[430,932],[768,1024],[1280,800],[1440,900]]) {
  await page.setViewportSize({width,height});
  await page.goto(`${baseURL}/opening-demo`);
  await page.locator('.piece-topbar').waitFor();
  for (const theme of ['light','dark']) {
   if(width<=950) await page.getByRole('button',{name:'Ouvrir le menu',exact:true}).click();
   const selector = page.locator(width<=950 ? '.piece-mobile-menu .piece-theme-selector' : '.piece-sidebar-theme .piece-theme-selector');
   await selector.getByRole('button',{name:theme==='light'?'Clair':'Sombre',exact:true}).click();
   await page.waitForFunction(t=>document.documentElement.classList.contains(t),theme);
   if(width<=950) await page.getByRole('button',{name:'Fermer le menu',exact:true}).click();
   assert.equal(await page.locator('.piece-bottom-nav').isVisible(),width<=950);
   assert.equal(await page.locator('.piece-sidebar').isVisible(),width>950);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'No horizontal overflow');
   if(width<=950) {
    const links=page.locator('.piece-bottom-nav a'); assert.equal(await links.count(),5);
    for(const link of await links.all()) {const box=await link.boundingBox(); assert.ok(box.width>=44 && box.height>=44);}
   }
   await page.screenshot({path:new URL(`${width}-${theme}.png`,evidence).pathname,fullPage:true});
   results.push({test:`${width}x${height} ${theme}: theme/navigation/overflow/touch targets`,status:'PASS'});
  }
 }
 await page.reload(); await page.locator('.piece-topbar').waitFor();
 assert.ok(await page.locator('html').evaluate(el=>el.classList.contains('dark')));
 results.push({test:'Explicit theme retained after reload',status:'PASS'});
 await page.locator('.piece-sidebar-theme').getByRole('button',{name:'Système',exact:true}).click();
 await page.emulateMedia({colorScheme:'light'});
 await page.waitForFunction(()=>document.documentElement.classList.contains('light'));
 await page.emulateMedia({colorScheme:'dark'});
 await page.waitForFunction(()=>document.documentElement.classList.contains('dark'));
 results.push({test:'System theme reacts without reload',status:'PASS'});
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Lancer la démonstration',exact:true}).click();
 await page.locator('[data-testid="pack-animation"]').waitFor();
 await page.waitForFunction(()=>!document.querySelector('.piece-bottom-nav'));
 await page.getByRole('button',{name:'Passer l’animation',exact:true}).click();
 await page.locator('.piece-bottom-nav').waitFor();
 results.push({test:'Navigation hidden during cinematic and restored after skip',status:'PASS'});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'Rejouer la cinématique',exact:true}).click();
 await page.getByRole('button',{name:'Tout révéler',exact:true}).waitFor();
 await page.locator('.piece-bottom-nav').waitFor();
 results.push({test:'Reduced motion returns to result with navigation',status:'PASS'});
 await context.close();
} catch(error) {results.push({test:'UI foundation verification',status:'FAIL',detail:error.message});process.exitCode=1;}
finally {await browser.close();fs.writeFileSync(new URL('results.json',evidence),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}
