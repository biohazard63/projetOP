import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { mkdirSync, writeFileSync } from 'node:fs'
const app=resolve(__dirname,'../..')
const directory=resolve(app,'../docs/game/evidence/m1_5d/traces')
mkdirSync(directory,{recursive:true})
const run=spawnSync(process.execPath,['--import','tsx','--test','tests/game-m1-5d.test.ts'],{cwd:app,env:{...process.env,M15D_TRACE_DIR:directory},encoding:'utf8'})
writeFileSync(resolve(directory,'generation.log'),run.stdout+run.stderr)
process.stdout.write(run.stdout);process.stderr.write(run.stderr)
process.exit(run.status??1)
