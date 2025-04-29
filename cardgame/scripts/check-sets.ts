import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Vérifier les règles de set
  const setRules = await prisma.setRules.findMany()
  console.log('Règles de set:', setRules)

  // Vérifier les cartes par set
  const sets = ['OP01', 'OP02']
  
  for (const setCode of sets) {
    const cards = await prisma.card.findMany({
      where: {
        setCode: setCode
      },
      select: {
        id: true,
        code: true,
        name: true,
        rarity: true,
        type: true
      }
    })
    
    console.log(`\nCartes du set ${setCode}:`, cards.length)
    console.log(cards)
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