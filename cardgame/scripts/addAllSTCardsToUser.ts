import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Args = {
  email?: string
  userId?: string
  qty: number
  leadersQty: number
  setMode: boolean // true: fixe la quantité, false: incrémente
  dryRun: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = { qty: 1, leadersQty: 1, setMode: false, dryRun: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--email') args.email = argv[++i]
    else if (a === '--userId') args.userId = argv[++i]
    else if (a === '--qty') args.qty = Number(argv[++i] ?? '1')
    else if (a === '--leaders') args.leadersQty = Number(argv[++i] ?? String(args.qty))
    else if (a === '--set') args.setMode = true
    else if (a === '--dry-run') args.dryRun = true
  }
  if (!args.leadersQty) args.leadersQty = args.qty
  return args
}

async function resolveUserId(args: Args): Promise<string> {
  if (args.userId) return args.userId
  if (!args.email) throw new Error('Veuillez fournir --email ou --userId')
  const user = await prisma.user.findUnique({ where: { email: args.email } })
  if (!user) throw new Error(`Utilisateur introuvable pour l'email ${args.email}`)
  return user.id
}

async function findAllStarterCards() {
  // Cherche toutes les cartes des sets ST (code STxx-XXX, setCode STxx, ou set contient ST-xx)
  const cards = await prisma.card.findMany({
    where: {
      OR: [
        { code: { startsWith: 'ST' } },
        { setCode: { startsWith: 'ST' } },
        { set: { contains: 'ST-' } },
      ]
    },
    select: { id: true, name: true, code: true, type: true }
  })

  // On garde un seul exemplaire par id (au cas où)
  const seen = new Set<string>()
  const unique = [] as typeof cards
  for (const c of cards) {
    if (seen.has(c.id)) continue
    seen.add(c.id)
    unique.push(c)
  }
  return unique
}

async function upsertUserCards(userId: string, qty: number, leadersQty: number, setMode: boolean, dryRun: boolean) {
  const cards = await findAllStarterCards()
  console.log(`[ST] Cartes ST trouvées: ${cards.length}`)

  let leaders = 0
  let nonLeaders = 0
  let ops = 0

  for (const c of cards) {
    const targetQty = c.type === 'LEADER' ? leadersQty : qty
    if (dryRun) {
      if (c.type === 'LEADER') leaders++
      else nonLeaders++
      continue
    }

    if (setMode) {
      await prisma.userCard.upsert({
        where: { userId_cardId: { userId, cardId: c.id } },
        update: { quantity: targetQty },
        create: { userId, cardId: c.id, quantity: targetQty },
      })
    } else {
      const existing = await prisma.userCard.findUnique({ where: { userId_cardId: { userId, cardId: c.id } } })
      if (existing) {
        await prisma.userCard.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + targetQty }
        })
      } else {
        await prisma.userCard.create({ data: { userId, cardId: c.id, quantity: targetQty } })
      }
    }
    ops++
  }

  if (dryRun) {
    console.log(`[ST][DRY] Leaders: ${leaders}, Non-Leaders: ${nonLeaders}`)
  } else {
    console.log(`[ST] Cartes ajoutées/mises à jour: ${ops}`)
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const userId = await resolveUserId(args)
  console.log(`[ST] Cible: userId=${userId}${args.email ? ` (email=${args.email})` : ''}`)
  console.log(`[ST] Quantité: non-leaders=${args.qty}, leaders=${args.leadersQty}, mode=${args.setMode ? 'set' : 'increment'}`)
  await upsertUserCards(userId, args.qty, args.leadersQty, args.setMode, args.dryRun)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


