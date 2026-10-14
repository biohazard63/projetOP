/** Presentation assets only: no database, no card text, rules or definitions are modified. */
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { REFERENCE_DECKS } from '../../src/lib/engine/decks'
import { frenchImage, officialImage } from '../../src/lib/engine/catalog'

async function main() {
  const directory = path.resolve('public/images/play/leaders')
  await fs.mkdir(directory,{recursive:true})
  const numbers = [...new Set(REFERENCE_DECKS.filter(deck=>deck.id.startsWith('starter-')).map(deck=>deck.leader))]
  const assets: Record<string,{path:string;source:string;sha256:string}> = {}
  const failures: {number:string;error:string}[]=[]
  async function cache(number:string) {
    for (const source of [...new Set([frenchImage(number),officialImage(number)].filter((url):url is string=>!!url))]) {
      try {
        const response = await fetch(source,{signal:AbortSignal.timeout(20000)})
        if(!response.ok) throw new Error(`HTTP_${response.status}`)
        const bytes = Buffer.from(await response.arrayBuffer())
        const extension = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : bytes[0]===255 && bytes[1]===216 ? 'jpg' : bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP' ? 'webp' : null
        if(!extension) throw new Error('NOT_AN_IMAGE')
        const file = `${number}.${extension}`
        await fs.writeFile(path.join(directory,file),bytes)
        assets[number]={path:`/images/play/leaders/${file}`,source,sha256:createHash('sha256').update(bytes).digest('hex')}
        console.log(`${number}: cached ${extension}`)
        return
      } catch(error) { console.log(`${number}: ${error instanceof Error ? error.message : 'DOWNLOAD_FAILED'}`) }
    }
    failures.push({number,error:'No referenced artwork could be downloaded'})
  }
  // Bounded parallel downloads, only URLs already used by the current catalogue.
  let cursor=0
  await Promise.all(Array.from({length:3},async()=>{while(cursor<numbers.length) await cache(numbers[cursor++])}))
  const ordered = Object.fromEntries(Object.entries(assets).sort(([a],[b])=>a.localeCompare(b)))
  await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify({generatedAt:new Date().toISOString(),purpose:'Public Starter Leader presentation artwork; not a card catalogue',assets:ordered,failures},null,2)+'\n')
  console.log(JSON.stringify({expected:numbers.length,cached:Object.keys(assets).length,failures},null,2))
  if(failures.length) process.exitCode=1
}
main().catch(error=>{console.error(error);process.exitCode=1})
