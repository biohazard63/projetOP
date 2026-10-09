import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { inspectBoosterDatabase } from '../src/lib/boosters/database-check'
import { describeBoosterFailure } from '../src/lib/boosters/failure'

const db = new PrismaClient()
function targetCategory() {
  try {
    const host = new URL(process.env.DATABASE_URL || '').hostname
    return ['localhost', '127.0.0.1', '[::1]'].includes(host) ? 'local' : 'remote'
  } catch { return 'unknown' }
}
async function main() {
  try {
    const result = await inspectBoosterDatabase(db)
    console.log(JSON.stringify({ readOnly: true, target: targetCategory(), ...result }, null, 2))
    if (result.status !== 'PASS') process.exitCode = 1
  } catch (error) {
    const result = describeBoosterFailure(error)
    console.error(JSON.stringify({ status: 'FAIL', readOnly: true, target: targetCategory(), code: result.code, databaseCode: result.databaseCode }))
    process.exitCode = 1
  } finally { await db.$disconnect() }
}
void main()
