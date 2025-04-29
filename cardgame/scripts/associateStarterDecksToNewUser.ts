import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function associateStarterDecksToUser(userId: string) {
  try {
    console.log('Recherche des decks de démarrage existants...')
    
    // Récupérer tous les decks de démarrage (ceux sans userId)
    const starterDecks = await prisma.deck.findMany({
      where: {
        userId: null,
        name: {
          startsWith: 'ST-'
        }
      },
      include: {
        versions: {
          include: {
            cards: true
          }
        }
      }
    })

    if (starterDecks.length === 0) {
      console.log('Aucun deck de démarrage trouvé dans la base de données.')
      return
    }

    console.log(`${starterDecks.length} decks de démarrage trouvés. Création des copies pour l'utilisateur...`)

    // Utiliser une transaction pour toutes les opérations
    await prisma.$transaction(async (tx) => {
      // Préparer toutes les données pour les decks et leurs cartes
      const deckData = starterDecks.map(starterDeck => ({
        name: starterDeck.name,
        description: starterDeck.description,
        userId: userId,
        versions: {
          create: starterDeck.versions.map(version => ({
            name: version.name,
            cards: {
              create: version.cards.map(card => ({
                cardId: card.cardId,
                quantity: card.quantity
              }))
            }
          }))
        }
      }))

      // Créer tous les decks en une seule opération
      await tx.deck.createMany({
        data: deckData.map(deck => ({
          name: deck.name,
          description: deck.description,
          userId: deck.userId
        }))
      })

      // Récupérer les IDs des decks créés
      const createdDecks = await tx.deck.findMany({
        where: {
          userId: userId,
          name: {
            startsWith: 'ST-'
          }
        },
        select: {
          id: true,
          name: true
        }
      })

      // Créer les versions et les cartes pour chaque deck
      for (let i = 0; i < createdDecks.length; i++) {
        const createdDeck = createdDecks[i]
        const starterDeck = starterDecks[i]
        
        // Créer les versions pour ce deck
        for (const version of starterDeck.versions) {
          const createdVersion = await tx.deckVersion.create({
            data: {
              deckId: createdDeck.id,
              name: version.name
            }
          })
          
          // Créer toutes les cartes pour cette version en une seule opération
          await tx.deckCard.createMany({
            data: version.cards.map(card => ({
              deckVersionId: createdVersion.id,
              cardId: card.cardId,
              quantity: card.quantity
            }))
          })
        }
      }
    })

    console.log('Tous les decks de démarrage ont été copiés avec succès!')
  } catch (error) {
    console.error('Erreur lors de la copie des decks de démarrage:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Si le script est exécuté directement
if (require.main === module) {
  // Vérifier si un ID utilisateur est fourni en argument
  const userId = process.argv[2]
  if (!userId) {
    console.error('Veuillez fournir un ID utilisateur en argument.')
    process.exit(1)
  }

  associateStarterDecksToUser(userId)
    .catch(error => {
      console.error('Erreur:', error)
      process.exit(1)
    })
} 