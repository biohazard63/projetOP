import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

type Args = {
  email?: string
  out?: string
}

function parseArgs(argv: string[]): Args {
  const args: Args = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--email') args.email = argv[++i]
    else if (a === '--out') args.out = argv[++i]
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv)
  if (!args.email) {
    console.error('Usage: tsx scripts/exportUserDecks.ts --email <email> [--out <file>]')
    process.exit(1)
  }

  const email = args.email.toLowerCase().trim()

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`Utilisateur introuvable pour l'email ${email}`)
    process.exit(1)
  }

  const decks = await prisma.deck.findMany({
    where: { userId: user.id },
    include: {
      versions: {
        include: {
          cards: {
            include: { card: true }
          }
        }
      }
    }
  })

  const data = {
    user: { id: user.id, email: user.email, name: user.name ?? null },
    decks: decks.map(d => ({
      id: d.id,
      name: d.name,
      versions: d.versions.map(v => {
        const cards = v.cards.map(dc => ({
          cardId: dc.cardId,
          code: dc.card.code,
          name: dc.card.name,
          type: dc.card.type,
          set: dc.card.set,
          setCode: dc.card.setCode,
          rarity: dc.card.rarity,
          quantity: dc.quantity,
        }))
        const leaderCount = cards.filter(c => c.type === 'LEADER').reduce((s, c) => s + (c.quantity || 0), 0)
        const nonLeaderCount = cards.filter(c => c.type !== 'LEADER').reduce((s, c) => s + (c.quantity || 0), 0)
        return {
          id: v.id,
          name: v.name,
          totals: { leader: leaderCount, nonLeaders: nonLeaderCount, total: leaderCount + nonLeaderCount },
          cards
        }
      })
    }))
  }

  const json = JSON.stringify(data, null, 2)

  if (args.out) {
    const outPath = path.isAbsolute(args.out) ? args.out : path.join(process.cwd(), args.out)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, json, 'utf-8')
    console.log(`Exporté: ${outPath}`)
  } else {
    console.log(json)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


