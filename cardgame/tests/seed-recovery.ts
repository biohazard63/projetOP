import { PrismaClient } from '@prisma/client'
const url = new URL(process.env.DATABASE_URL || '')
if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/op_recovery_test') throw new Error('Isolated recovery database required')
const prisma = new PrismaClient()
async function seed() {
 await prisma.cardSet.upsert({ where: { code: 'OP-TEST' }, update: {}, create: { code: 'OP-TEST', name: 'Synthetic recovery fixtures', releaseDate: new Date('2026-01-01') } })
 await prisma.setRules.upsert({ where: { code: 'OP-TEST' }, update: {}, create: { code: 'OP-TEST', name: 'Synthetic recovery fixtures', rarityCounts: {}, typeCounts: {}, boosterRules: { commonCount: 6, uncommonCount: 3, rareCount: 2, superRareCount: 1, leaderCount: 0 } } })
 const cards = [{ id: 'recovery-leader', code: 'TEST-L', type: 'LEADER', rarity: 'L', color: 'RED' }, ...Array.from({ length: 13 }, (_, i) => ({ id: `recovery-card-${i}`, code: `TEST-${i}`, type: 'CHARACTER', color: 'RED', rarity: i < 7 ? 'C' : i < 10 ? 'UC' : i < 12 ? 'R' : 'SR' }))]
 for (const card of cards) await prisma.card.upsert({ where: { id: card.id }, update: {}, create: { ...card, name: card.id, cost: 1, power: 2000, imageUrl: '/images/card-back.jpg', setCode: 'OP-TEST', set: 'OPTEST' } })
 console.log('14 synthetic cards seeded in isolated test database')
}
seed().finally(() => prisma.$disconnect())
