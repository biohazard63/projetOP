import { PrismaClient, Prisma, Card } from '@prisma/client'

const prisma = new PrismaClient()

export const starterDecks = [
  {
    name: 'ST-01 : Équipage du Chapeau de Paille (Rouge)',
    cards: [
      { code: 'ST01-001', quantity: 1 }, // Leader: Monkey D. Luffy
      { code: 'ST01-002', quantity: 4 }, // Usopp
      { code: 'ST01-003', quantity: 4 }, // Karoo
      { code: 'ST01-004', quantity: 4 }, // Sanji
      { code: 'ST01-005', quantity: 4 }, // Jinbe
      { code: 'ST01-006', quantity: 4 }, // Tony Tony Chopper
      { code: 'ST01-007', quantity: 4 }, // Nico Robin
      { code: 'ST01-008', quantity: 4 }, // Franky
      { code: 'ST01-009', quantity: 4 }, // Brook
      { code: 'ST01-010', quantity: 4 }, // Nami
      { code: 'ST01-011', quantity: 4 }, // Roronoa Zoro
      { code: 'ST01-012', quantity: 4 }, // Monkey D. Luffy
      { code: 'ST01-013', quantity: 4 }, // Guard Point
      { code: 'ST01-014', quantity: 4 }, // Gum-Gum Jet Pistol
    ]
  },
  {
    name: 'ST-02 : Pire Génération (Vert)',
    cards: [
      { code: 'ST02-001', quantity: 1 }, // Leader: Eustass Kid
      { code: 'ST02-002', quantity: 4 }, // Killer
      { code: 'ST02-003', quantity: 4 }, // Basil Hawkins
      { code: 'ST02-004', quantity: 4 }, // Capone "Gang" Bege
      { code: 'ST02-005', quantity: 4 }, // Jewelry Bonney
      { code: 'ST02-006', quantity: 4 }, // X Drake
      { code: 'ST02-007', quantity: 4 }, // Scratchmen Apoo
      { code: 'ST02-008', quantity: 4 }, // Urouge
      { code: 'ST02-009', quantity: 4 }, // Trafalgar Law
      { code: 'ST02-010', quantity: 4 }, // Heat
      { code: 'ST02-011', quantity: 4 }, // Wire
      { code: 'ST02-012', quantity: 4 }, // Repel
      { code: 'ST02-013', quantity: 4 }, // Straw Sword
    ]
  },
  {
    name: 'ST-03 : Les Sept Grands Corsaires (Bleu)',
    cards: [
      { code: 'ST03-001', quantity: 1 }, // Leader: Crocodile
      { code: 'ST03-002', quantity: 4 }, // Dracule Mihawk
      { code: 'ST03-003', quantity: 4 }, // Bartholomew Kuma
      { code: 'ST03-004', quantity: 4 }, // Donquixote Doflamingo
      { code: 'ST03-005', quantity: 4 }, // Gecko Moria
      { code: 'ST03-006', quantity: 4 }, // Boa Hancock
      { code: 'ST03-007', quantity: 4 }, // Edward Weevil
      { code: 'ST03-008', quantity: 4 }, // Jinbe
      { code: 'ST03-009', quantity: 4 }, // Trafalgar Law
      { code: 'ST03-010', quantity: 4 }, // Buggy
      { code: 'ST03-011', quantity: 4 }, // Gekko Moria
      { code: 'ST03-012', quantity: 4 }, // Love-Love Mellow
      { code: 'ST03-013', quantity: 4 }, // Thrust Pad Cannon
    ]
  },
  {
    name: 'ST-04 : Pirates aux Cent Bêtes (Violet)',
    cards: [
      { code: 'ST04-001', quantity: 1 }, // Leader: Kaido
      { code: 'ST04-002', quantity: 4 }, // King
      { code: 'ST04-003', quantity: 4 }, // Queen
      { code: 'ST04-004', quantity: 4 }, // Jack
      { code: 'ST04-005', quantity: 4 }, // Ulti
      { code: 'ST04-006', quantity: 4 }, // Page One
      { code: 'ST04-007', quantity: 4 }, // Sasaki
      { code: 'ST04-008', quantity: 4 }, // Black Maria
      { code: 'ST04-009', quantity: 4 }, // Who's-Who
      { code: 'ST04-010', quantity: 4 }, // Babanuki
      { code: 'ST04-011', quantity: 4 }, // Sheepshead
      { code: 'ST04-012', quantity: 4 }, // Brachio Bomber
      { code: 'ST04-013', quantity: 4 }, // Blast Breath
    ]
  },
  {
    name: 'ST-05 : Édition FILM (Violet)',
    cards: [
      { code: 'ST05-001', quantity: 1 }, // Leader: Shanks
      { code: 'ST05-002', quantity: 4 }, // Ain
      { code: 'ST05-003', quantity: 4 }, // Ann
      { code: 'ST05-004', quantity: 4 }, // Uta
      { code: 'ST05-005', quantity: 4 }, // Carina
      { code: 'ST05-006', quantity: 4 }, // Gild Tesoro
      { code: 'ST05-007', quantity: 4 }, // Gordon
      { code: 'ST05-008', quantity: 4 }, // Shiki
      { code: 'ST05-009', quantity: 4 }, // Scarlet
      { code: 'ST05-010', quantity: 4 }, // Zephyr
      { code: 'ST05-011', quantity: 4 }, // Douglas Bullet
      { code: 'ST05-012', quantity: 4 }, // Baccarat
      { code: 'ST05-013', quantity: 4 }, // Bins
      { code: 'ST05-014', quantity: 4 }, // Buena Festa
      { code: 'ST05-015', quantity: 4 }, // Dr. Indigo
      { code: 'ST05-016', quantity: 4 }, // Lion's Threat Imperial Earth Bind
      { code: 'ST05-017', quantity: 4 }, // Union Armada
    ]
  },
  {
    name: 'ST-06 : Justice Absolue (Noir)',
    cards: [
      { code: 'ST06-001', quantity: 1 }, // Leader: Sakazuki
      { code: 'ST06-002', quantity: 4 }, // Koby
      { code: 'ST06-003', quantity: 4 }, // Jango
      { code: 'ST06-004', quantity: 4 }, // Smoker
      { code: 'ST06-005', quantity: 4 }, // Sengoku
      { code: 'ST06-006', quantity: 4 }, // Tashigi
      { code: 'ST06-007', quantity: 4 }, // Tsuru
      { code: 'ST06-008', quantity: 4 }, // Hina
      { code: 'ST06-009', quantity: 4 }, // Fullbody
      { code: 'ST06-010', quantity: 4 }, // Helmeppo
      { code: 'ST06-011', quantity: 4 }, // Momonga
      { code: 'ST06-012', quantity: 4 }, // Monkey D. Garp
      { code: 'ST06-013', quantity: 4 }, // T-Bone
      { code: 'ST06-014', quantity: 4 }, // Shockwave
    ]
  },
  {
    name: 'ST-07 : Pirates de Big Mom (Jaune)',
    cards: [
      { code: 'ST07-001', quantity: 1 }, // Leader: Charlotte Linlin
      { code: 'ST07-002', quantity: 4 }, // Charlotte Perospero
      { code: 'ST07-003', quantity: 4 }, // Charlotte Daifuku
      { code: 'ST07-004', quantity: 4 }, // Charlotte Mont-d'Or
      { code: 'ST07-005', quantity: 4 }, // Charlotte Galette
      { code: 'ST07-006', quantity: 4 }, // Charlotte Oven
      { code: 'ST07-007', quantity: 4 }, // Charlotte Brûlée
      { code: 'ST07-008', quantity: 4 }, // Charlotte Smoothie
      { code: 'ST07-009', quantity: 4 }, // Charlotte Compote
      { code: 'ST07-010', quantity: 4 }, // Charlotte Pudding
      { code: 'ST07-011', quantity: 4 }, // Charlotte Cracker
      { code: 'ST07-012', quantity: 4 }, // Charlotte Katakuri
      { code: 'ST07-013', quantity: 4 }, // Soul Pocus
    ]
  },
  {
    name: 'ST-08 : Monkey D. Luffy (Rouge)',
    cards: [
      { code: 'ST08-001', quantity: 1 }, // Leader: Monkey D. Luffy
      { code: 'ST08-002', quantity: 4 }, // Roronoa Zoro
      { code: 'ST08-003', quantity: 4 }, // Nami
      { code: 'ST08-004', quantity: 4 }, // Usopp
      { code: 'ST08-005', quantity: 4 }, // Sanji
      { code: 'ST08-006', quantity: 4 }, // Tony Tony Chopper
      { code: 'ST08-007', quantity: 4 }, // Franky
      { code: 'ST08-008', quantity: 4 }, // Brook
      { code: 'ST08-009', quantity: 4 }, // Jinbe
      { code: 'ST08-010', quantity: 4 }, // Nico Robin
      { code: 'ST08-011', quantity: 4 }, // Carrot
      { code: 'ST08-012', quantity: 4 }, // Gum-Gum Red Roc
      { code: 'ST08-013', quantity: 4 }, // Straw Hat Crew's Resolve
    ]
  },
  {
    name: 'ST-09 : Yamato (Vert)',
    cards: [
      { code: 'ST09-001', quantity: 1 }, // Leader: Yamato
      { code: 'ST09-002', quantity: 4 }, // Momonosuke
      { code: 'ST09-003', quantity: 4 }, // Kin'emon
      { code: 'ST09-004', quantity: 4 }, // Kiku
      { code: 'ST09-005', quantity: 4 }, // Raizo
      { code: 'ST09-006', quantity: 4 }, // Kawamatsu
      { code: 'ST09-007', quantity: 4 }, // Denjiro
      { code: 'ST09-008', quantity: 4 }, // Ashura Doji
      { code: 'ST09-009', quantity: 4 }, // Inuarashi
      { code: 'ST09-010', quantity: 4 }, // Nekomamushi
      { code: 'ST09-011', quantity: 4 }, // Kozuki Oden
      { code: 'ST09-012', quantity: 4 }, // Two-Sword Style
    ]
  },
  {
    name: 'ST-10 : Les Trois Capitaines (Rouge/Vert)',
    cards: [
      { code: 'ST10-001', quantity: 1 }, // Leader: Monkey D. Luffy
      { code: 'ST10-002', quantity: 4 }, // Roronoa Zoro
      { code: 'ST10-003', quantity: 4 }, // Nami
      { code: 'ST10-004', quantity: 4 }, // Sanji
      { code: 'ST10-005', quantity: 4 }, // Jinbe
      { code: 'ST10-006', quantity: 4 }, // Tony Tony Chopper
      { code: 'ST10-007', quantity: 4 }, // Franky
      { code: 'ST10-008', quantity: 4 }, // Brook
      { code: 'ST10-009', quantity: 4 }, // Usopp
      { code: 'ST10-010', quantity: 4 }, // Carrot
      { code: 'ST10-011', quantity: 4 }, // Nico Robin
      { code: 'ST10-012', quantity: 4 }, // Gum-Gum Giant Sumo Slap
      { code: 'ST10-013', quantity: 4 }, // Gum-Gum Kong Gatling
    ]
  },
  {
    name: 'ST-12 : Zoro & Sanji (Rouge/Vert)',
    cards: [
      { code: 'ST12-001', quantity: 1 }, // Leader: Zoro & Sanji
      { code: 'ST12-002', quantity: 4 }, // Roronoa Zoro
      { code: 'ST12-003', quantity: 4 }, // Sanji
      { code: 'ST12-004', quantity: 4 }, // Nami
      { code: 'ST12-005', quantity: 4 }, // Usopp
      { code: 'ST12-006', quantity: 4 }, // Tony Tony Chopper
      { code: 'ST12-007', quantity: 4 }, // Franky
      { code: 'ST12-008', quantity: 4 }, // Brook
      { code: 'ST12-009', quantity: 4 }, // Jinbe
      { code: 'ST12-010', quantity: 4 }, // Nico Robin
      { code: 'ST12-011', quantity: 4 }, // Carrot
      { code: 'ST12-012', quantity: 4 }, // Two-Sword Style
      { code: 'ST12-013', quantity: 4 }, // Diable Jambe
    ]
  },
  {
    name: 'ST-13 : Les Trois Frères (Rouge/Vert)',
    cards: [
      { code: 'ST13-001', quantity: 1 }, // Leader: Monkey D. Luffy
      { code: 'ST13-002', quantity: 4 }, // Portgas D. Ace
      { code: 'ST13-003', quantity: 4 }, // Sabo
      { code: 'ST13-004', quantity: 4 }, // Monkey D. Luffy
      { code: 'ST13-005', quantity: 4 }, // Roronoa Zoro
      { code: 'ST13-006', quantity: 4 }, // Nami
      { code: 'ST13-007', quantity: 4 }, // Usopp
      { code: 'ST13-008', quantity: 4 }, // Sanji
      { code: 'ST13-009', quantity: 4 }, // Tony Tony Chopper
      { code: 'ST13-010', quantity: 4 }, // Franky
      { code: 'ST13-011', quantity: 4 }, // Brook
      { code: 'ST13-012', quantity: 2 }, // Gum-Gum Jet Pistol
      { code: 'ST13-013', quantity: 2 }, // Fire Fist
    ]
  },
]

async function importStarterDecks() {
  try {
    console.log('Début de l\'importation des decks de démarrage...')

    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany()
    console.log(`Nombre d'utilisateurs trouvés: ${users.length}`)
    
    if (users.length === 0) {
      console.log('Aucun utilisateur trouvé. Création d\'un utilisateur admin par défaut...')
      const { hash } = await import('bcryptjs')
      const hashedPassword = await hash('admin123', 12)
      
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          name: 'Admin',
          password: hashedPassword,
        }
      })
      console.log('Utilisateur admin créé avec succès:', adminUser.email)
      users.push(adminUser)
    }

    // Supprimer tous les decks existants
    console.log('Suppression des decks existants...')
    await prisma.deck.deleteMany()
    console.log('Decks existants supprimés')

    // Créer les decks de démarrage pour chaque utilisateur
    console.log('Création des decks de démarrage pour chaque utilisateur...')
    for (const user of users) {
      console.log(`Création des decks pour l'utilisateur ${user.email}...`)
      for (const deckData of starterDecks) {
        try {
          console.log(`Création du deck ${deckData.name}...`)
          await createStarterDeck(user.id, deckData)
          console.log(`Deck ${deckData.name} créé avec succès`)
        } catch (error) {
          console.error(`Erreur lors de la création du deck ${deckData.name}:`, error)
        }
      }
    }

    console.log('Importation des decks de démarrage terminée')
  } catch (error) {
    console.error('Erreur lors de l\'importation des decks de démarrage:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function createStarterDeck(userId: string, deckData: { name: string, cards: { code: string, quantity: number }[] }) {
  try {
    console.log(`Recherche des cartes pour le deck ${deckData.name}...`)
    // Trouver les cartes correspondantes
    const deckCards = await Promise.all(
      deckData.cards.map(async (cardData) => {
        const card = await prisma.card.findFirst({
          where: { code: cardData.code }
        })
        if (!card) {
          console.warn(`Carte non trouvée: ${cardData.code}`)
          return null
        }
        return { card, quantity: cardData.quantity }
      })
    )

    const validCards = deckCards.filter((item): item is { card: Card, quantity: number } => item !== null)
    console.log(`${validCards.length}/${deckData.cards.length} cartes trouvées`)

    if (validCards.length !== deckData.cards.length) {
      console.warn(`Certaines cartes sont manquantes pour le deck ${deckData.name}`)
      return
    }

    // Créer le deck
    console.log(`Création du deck ${deckData.name}...`)
    const deck = await prisma.deck.create({
      data: {
        name: deckData.name,
        userId: userId,
        deckCards: {
          create: validCards.map(item => ({
            cardId: item.card.id,
            quantity: item.quantity
          }))
        }
      }
    })

    console.log(`Deck ${deck.name} créé avec succès`)
    return deck
  } catch (error) {
    console.error(`Erreur lors de la création du deck ${deckData.name}:`, error)
    throw error
  }
}

importStarterDecks() 