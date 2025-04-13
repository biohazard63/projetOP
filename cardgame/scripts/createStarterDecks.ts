import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const starterDecks = [
  {
    name: 'Deck Whitebeard Pirates',
    description: 'Un deck basé sur l\'équipage de Barbe Blanche',
    cards: [
      // Leader
      { code: 'OP02-001' }, // Edward.Newgate (LEADER)
      // Personnages
      { code: 'OP02-008' }, // Jozu
      { code: 'OP02-018' }, // Marco
      { code: 'OP02-019' }, // Rakuyo
      { code: 'OP03-003' }, // Izo
      { code: 'OP03-006' }, // Speed Jil
      { code: 'OP03-007' }, // Namule
      { code: 'OP03-009' }, // Haruta
      { code: 'OP03-010' }, // Fossa
      { code: 'OP02-023' }, // You May Be a Fool...but I Still Love You (EVENT)
    ]
  },
  {
    name: 'Deck Marine',
    description: 'Un deck basé sur les forces marines',
    cards: [
      // Leader
      { code: 'OP01-001' }, // Monkey D. Luffy (LEADER)
      // Personnages
      { code: 'OP01-002' }, // Roronoa Zoro
      { code: 'OP01-003' }, // Nami
      { code: 'OP01-004' }, // Usopp
      { code: 'OP01-005' }, // Sanji
      { code: 'OP01-006' }, // Tony Tony Chopper
      { code: 'OP01-007' }, // Nico Robin
      { code: 'OP01-008' }, // Franky
      { code: 'OP01-009' }, // Brook
      { code: 'OP01-010' }, // Jinbe
      // Événements
      { code: 'OP01-011' }, // Gum-Gum Pistol
    ]
  },
  {
    name: 'Deck Warlords',
    description: 'Un deck basé sur les Shichibukai',
    cards: [
      // Leader
      { code: 'OP03-001' }, // Donquixote Doflamingo (LEADER)
      // Personnages
      { code: 'OP03-002' }, // Trafalgar Law
      { code: 'OP03-004' }, // Boa Hancock
      { code: 'OP03-005' }, // Bartholomew Kuma
      { code: 'OP03-008' }, // Gecko Moria
      { code: 'OP03-011' }, // Crocodile
      { code: 'OP03-012' }, // Jinbe
      { code: 'OP03-013' }, // Edward Weevil
      { code: 'OP03-014' }, // Buggy
      { code: 'OP03-015' }, // Marshall D. Teach
      // Événements
      { code: 'OP03-016' }, // String-String Fruit
    ]
  }
]

async function createStarterDecks() {
  try {
    console.log('Début de la création des decks de démarrage...')

    // Récupérer toutes les cartes de la base de données
    const allCards = await prisma.card.findMany()
    console.log(`Nombre total de cartes trouvées: ${allCards.length}`)

    // Créer un utilisateur de test si nécessaire
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Utilisateur Test',
        password: 'password123'
      }
    })

    console.log('Utilisateur test créé/récupéré:', testUser.email)

    // Créer les decks de démarrage
    for (const deckData of starterDecks) {
      // Trouver les cartes correspondantes
      const deckCards = deckData.cards.map(cardData => {
        const card = allCards.find(c => c.code === cardData.code)
        if (!card) {
          console.warn(`Carte non trouvée: ${cardData.code}`)
          return null
        }
        return card
      }).filter(card => card !== null)

      if (deckCards.length !== deckData.cards.length) {
        console.warn(`Certaines cartes sont manquantes pour le deck ${deckData.name}`)
        continue
      }

      // Créer le deck
      const deck = await prisma.deck.create({
        data: {
          name: deckData.name,
          description: deckData.description,
          userId: testUser.id,
          cards: {
            connect: deckCards.map(card => ({ id: card!.id }))
          }
        }
      })

      console.log(`Deck créé: ${deck.name} avec ${deckCards.length} cartes`)
    }

    console.log('Création des decks de démarrage terminée')
  } catch (error) {
    console.error('Erreur lors de la création des decks de démarrage:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createStarterDecks() 