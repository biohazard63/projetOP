import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDecks() {
  try {
    console.log('Vérification des decks dans la base de données...')
    
    // Récupérer tous les decks avec leurs cartes via la relation deckCards
    const decks = await prisma.deck.findMany({
      include: {
        deckCards: {
          include: {
            card: true
          }
        },
        user: {
          select: {
            email: true
          }
        }
      }
    })
    
    console.log(`Nombre total de decks: ${decks.length}`)
    
    // Afficher les détails de chaque deck
    for (const deck of decks) {
      console.log(`\nDeck: ${deck.name} (ID: ${deck.id})`)
      console.log(`Utilisateur: ${deck.user.email}`)
      console.log(`Nombre de cartes: ${deck.deckCards.length}`)
      
      // Afficher les 5 premières cartes
      console.log('Premières cartes:')
      for (let i = 0; i < Math.min(5, deck.deckCards.length); i++) {
        const deckCard = deck.deckCards[i]
        console.log(`- ${deckCard.card.name} (${deckCard.card.id})`)
      }
      
      // Compter les occurrences de chaque carte
      const cardCounts = new Map<string, number>()
      for (const deckCard of deck.deckCards) {
        cardCounts.set(deckCard.card.id, (cardCounts.get(deckCard.card.id) || 0) + 1)
      }
      
      console.log('\nOccurrences des cartes:')
      for (const [cardId, count] of cardCounts.entries()) {
        const deckCard = deck.deckCards.find(dc => dc.card.id === cardId)
        console.log(`- ${deckCard?.card.name || cardId}: ${count} exemplaires`)
      }
    }
    
  } catch (error) {
    console.error('Erreur lors de la vérification des decks:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDecks() 