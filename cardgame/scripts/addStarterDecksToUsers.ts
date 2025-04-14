import { PrismaClient } from '@prisma/client'
import { starterDecks } from './importStarterDecks'

const prisma = new PrismaClient()

async function addStarterDecksToUsers() {
  try {
    console.log('Début de l\'ajout des decks de démarrage aux utilisateurs...')

    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany()
    console.log(`${users.length} utilisateurs trouvés`)

    // Pour chaque utilisateur
    for (const user of users) {
      console.log(`Traitement de l'utilisateur: ${user.email}`)

      // Vérifier si l'utilisateur a déjà des decks
      const existingDecks = await prisma.deck.findMany({
        where: { userId: user.id }
      })

      if (existingDecks.length > 0) {
        console.log(`L'utilisateur ${user.email} a déjà ${existingDecks.length} decks, passage au suivant`)
        continue
      }

      // Créer les decks de démarrage pour l'utilisateur
      for (const deckData of starterDecks) {
        console.log(`Création du deck: ${deckData.name}`)

        // Créer le deck avec toutes ses cartes en une seule transaction
        await prisma.$transaction(async (tx) => {
          // Créer le deck
          const deck = await tx.deck.create({
            data: {
              name: deckData.name,
              userId: user.id,
            }
          })

          // Pour chaque carte dans le deck
          for (const cardData of deckData.cards) {
            // Vérifier si la carte existe
            const card = await tx.card.findUnique({
              where: { id: cardData.code }
            })

            if (!card) {
              console.error(`Carte non trouvée: ${cardData.code}`)
              continue
            }

            // Créer l'entrée DeckCard avec la quantité spécifiée
            await tx.deckCard.create({
              data: {
                deckId: deck.id,
                cardId: card.id,
                quantity: cardData.quantity
              }
            })
          }

          // Vérifier le nombre final de cartes
          const updatedDeck = await tx.deck.findUnique({
            where: { id: deck.id },
            include: { 
              deckCards: {
                include: { card: true }
              }
            }
          })

          const totalCards = updatedDeck?.deckCards.reduce((sum, dc) => sum + dc.quantity, 0) || 0
          console.log(`Deck créé avec succès: ${deck.name} pour ${user.email} avec ${totalCards} cartes au total`)
        })
      }
    }

    console.log('Ajout des decks de démarrage terminé avec succès')
  } catch (error) {
    console.error('Erreur lors de l\'ajout des decks de démarrage:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addStarterDecksToUsers() 