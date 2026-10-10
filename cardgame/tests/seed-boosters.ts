import { PrismaClient } from '@prisma/client'
export function isolatedBoosterDb() {
 const url = new URL(process.env.DATABASE_URL || '')
 if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/op_boosters_test') throw new Error('Only isolated op_boosters_test on 127.0.0.1:55432 is permitted')
 return new PrismaClient()
}
export async function seedBoosters(db: PrismaClient) {
 for (const code of ['OP-999991', 'OP-999992', 'OP-999993', 'OP-999994']) await db.cardSet.upsert({ where: { code }, update: {}, create: { code, name: code === 'OP-999991' ? 'Trésors de test' : code, releaseDate: new Date('2026-01-01') } })
 for (const code of ['OP-999991', 'OP-999992', 'OP-999993', 'OP-999994']) await db.setRules.upsert({ where: { code }, update: {}, create: { code, name: code, rarityCounts: {}, typeCounts: {}, boosterRules: { commonCount: 6, uncommonCount: 3, rareCount: 2, superRareCount: 1, leaderCount: 0 } } })
 for (const code of ['OP-999991', 'OP-999993', 'OP-999994']) for (const rarity of code === 'OP-999993' ? ['C'] : ['C', 'UC', 'R', 'SR']) for (let i = 0; i < 3; i++) {
  const id = `booster-test-${code}-${rarity}-${i}`
  await db.card.upsert({ where: { id }, update: {}, create: { id, name: `${rarity} · Carte ${i + 1}`, code: id, type: 'CHARACTER', color: 'RED', cost: 1, power: 2000, rarity, imageUrl: '/images/card-back.jpg', setCode: code, set: code } })
 }
}
if (process.argv[1]?.endsWith('seed-boosters.ts')) { const db = isolatedBoosterDb(); seedBoosters(db).then(() => console.log('Synthetic booster fixtures seeded in op_boosters_test')).finally(() => db.$disconnect()) }
