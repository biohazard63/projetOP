import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function normalizeSetCode(code: string): string {
  let c = code.toUpperCase().trim()
  c = c.replace(/[-\s]/g, '')
  if (/^OP\d{2}$/.test(c)) return c.replace(/^OP(\d{2})$/, 'OP-$1')
  if (/^EB\d{2}$/.test(c)) return c.replace(/^EB(\d{2})$/, 'EB-$1')
  if (/^PRB\d{2}$/.test(c)) return c.replace(/^PRB(\d{2})$/, 'PRB-$1')
  if (/^ST\d{2}$/.test(c)) return c.replace(/^ST(\d{2})$/, 'ST-$1')
  return code.toUpperCase()
}

async function run() {
  const arg = process.argv[2] || 'PRB-01'
  const code = normalizeSetCode(arg)
  const count = await prisma.card.count({ where: { setCode: code } })
  console.log(`Set ${code} → ${count} cartes`)
  const sample = await prisma.card.findMany({
    where: { setCode: code },
    select: { id: true, name: true, rarity: true },
    take: 10,
  })
  console.table(sample)
}

run().finally(() => prisma.$disconnect())


