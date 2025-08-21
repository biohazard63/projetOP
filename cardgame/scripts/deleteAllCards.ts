import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('DB:', process.env.DATABASE_URL ? 'DATABASE_URL chargé' : 'DATABASE_URL manquant')
    const beforeCards = await prisma.card.count()
    const beforeSets = await prisma.cardSet.count()
    const beforeRarities = await prisma.cardRarity.count()
    console.log(`Avant: cards=${beforeCards}, sets=${beforeSets}, rarities=${beforeRarities}`)

    console.log('Suppression des données liées aux cartes...')
    // Supprimer d'abord les relations dépendantes (avec onDelete: Cascade c'est souvent géré, mais on nettoie explicitement)
    await prisma.boosterOpeningCard.deleteMany({})
    await prisma.boosterOpening.deleteMany({})
    await prisma.boosterCard.deleteMany({})
    await prisma.booster.deleteMany({})
    await prisma.deckCard.deleteMany({})
    await prisma.deckVersion.deleteMany({})
    // Les decks peuvent rester (l’utilisateur peut en avoir), mais on peut les nettoyer si besoin
    // await prisma.deck.deleteMany({})
    await prisma.gameLog.deleteMany({})
    await prisma.userCard.deleteMany({})
    await prisma.favoriteCard.deleteMany({})

    console.log('Suppression des cartes...')
    await prisma.card.deleteMany({})

    console.log('Suppression des sets/rarités...')
    await prisma.cardSet.deleteMany({})
    await prisma.cardRarity.deleteMany({})

    const afterCards = await prisma.card.count()
    const afterSets = await prisma.cardSet.count()
    const afterRarities = await prisma.cardRarity.count()
    console.log(`Après: cards=${afterCards}, sets=${afterSets}, rarities=${afterRarities}`)
    console.log('Terminé: base vidée des cartes, sets, raretés et relations dépendantes.')
  } catch (e) {
    console.error('Erreur lors du reset:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()


