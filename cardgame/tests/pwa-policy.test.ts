import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
function worker() {
  const handlers:Record<string,(event:any)=>void>={}
  const deleted:string[]=[],precached:string[]=[],fetches:string[]=[]
  let skips=0,claims=0
  const cache={addAll:async(paths:string[])=>{precached.push(...paths)},match:async(request:{url?:string}|string)=>{const path=typeof request==='string'?request:new URL(request.url!).pathname;return path==='/offline.html'?new Response('Public offline fallback'):undefined}}
  vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{
    URL,Response,self:{location:{origin:'https://mugiwara.test'},addEventListener:(name:string,fn:(event:any)=>void)=>{handlers[name]=fn},skipWaiting:()=>{skips++},clients:{claim:async()=>{claims++}}},
    caches:{open:async()=>cache,match:()=>{throw Error('Cross-namespace lookup forbidden')},keys:async()=>['mugiwara-public-v1','mugiwara-public-v2-1','other-app-cache'],delete:async(name:string)=>{deleted.push(name);return true}},
    fetch:async(request:{url:string})=>{fetches.push(request.url);throw Error('offline')}
  })
  return {handlers,deleted,precached,fetches,skips:()=>skips,claims:()=>claims}
}
test('PWA install caches only explicit public files and never auto-activates updates',async()=>{
  const w=worker();let done:Promise<void>|undefined;w.handlers.install({waitUntil:(p:Promise<void>)=>{done=p}});await done
  assert.deepEqual(w.precached,['/offline.html','/images/icons/icon-192.png','/images/icons/icon-512.png','/images/icons/maskable-512.png']);assert.equal(w.skips(),0)
  w.handlers.message({data:{type:'unrelated'}});assert.equal(w.skips(),0)
  w.handlers.message({data:{type:'MUGIWARA_SKIP_WAITING'}});assert.equal(w.skips(),1)
})
test('PWA activation only removes its own outdated public namespace',async()=>{
  const w=worker();let done:Promise<void>|undefined;w.handlers.activate({waitUntil:(p:Promise<void>)=>{done=p}});await done
  assert.deepEqual(w.deleted,['mugiwara-public-v1']);assert.equal(w.claims(),1)
})
test('API sessions receipts private data mutations and foreign hosts bypass caching',()=>{
  const w=worker()
  for(const [path,method,origin] of [['/api/auth/session','GET','https://mugiwara.test'],['/api/booster/history','GET','https://mugiwara.test'],['/api/collection','GET','https://mugiwara.test'],['/api/booster/open','POST','https://mugiwara.test'],['/images/icons/icon-192.png','GET','https://external.test']]){
    let intercepted=false;w.handlers.fetch({request:{url:origin+path,method,mode:'cors'},respondWith:()=>{intercepted=true}});assert.equal(intercepted,false,path)
  }
})
test('Offline private navigations use generic public fallback without retaining the page',async()=>{
  const w=worker();let response:Promise<Response>|undefined
  w.handlers.fetch({request:{url:'https://mugiwara.test/profile',method:'GET',mode:'navigate'},respondWith:(p:Promise<Response>)=>{response=p}})
  assert.equal(await(await response)!.text(),'Public offline fallback');assert.deepEqual(w.fetches,['https://mugiwara.test/profile'])
})
