import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const testCards = [
  {
    id: 'card1',
    code: 'ST01-001',
    name: 'Dragon de Feu',
    type: 'Créature',
    color: 'Rouge',
    cost: 5,
    power: 4,
    counter: 4,
    effect: 'Vol, Hâte',
    rarity: 'Rare',
    imageUrl: 'https://example.com/dragon.jpg'
  },
  {
    id: 'card2',
    code: 'ST01-002',
    name: 'Boule de Feu',
    type: 'Sort',
    color: 'Rouge',
    cost: 2,
    effect: 'Inflige 3 dégâts à la cible',
    rarity: 'Commune',
    imageUrl: 'https://example.com/fireball.jpg'
  },
  {
    id: 'card3',
    code: 'ST01-003',
    name: 'Élémental d\'Eau',
    type: 'Créature',
    color: 'Bleu',
    cost: 3,
    power: 3,
    counter: 2,
    effect: 'Peut attaquer dès qu\'il arrive en jeu',
    rarity: 'Peu commune',
    imageUrl: 'https://example.com/water.jpg'
  },
  {
    id: 'card4',
    code: 'ST01-004',
    name: 'Contrôle Mental',
    type: 'Sort',
    color: 'Bleu',
    cost: 4,
    effect: 'Prenez le contrôle d\'une créature jusqu\'à la fin du tour',
    rarity: 'Rare',
    imageUrl: 'https://example.com/mind.jpg'
  },
  {
    id: 'card5',
    code: 'ST01-005',
    name: 'Golem de Pierre',
    type: 'Créature',
    color: 'Vert',
    cost: 6,
    power: 5,
    counter: 6,
    effect: 'Vigilance',
    rarity: 'Peu commune',
    imageUrl: 'https://example.com/golem.jpg'
  },
  {
    id: 'card6',
    code: 'ST01-006',
    name: 'Éclat de Vie',
    type: 'Sort',
    color: 'Vert',
    cost: 1,
    effect: 'Gagnez 3 points de vie',
    rarity: 'Commune',
    imageUrl: 'https://example.com/life.jpg'
  },
  {
    id: 'card7',
    code: 'ST01-007',
    name: 'Ange Gardien',
    type: 'Créature',
    color: 'Blanc',
    cost: 4,
    power: 3,
    counter: 4,
    effect: 'Vol, Protection contre le noir',
    rarity: 'Rare',
    imageUrl: 'https://example.com/angel.jpg'
  },
  {
    id: 'card8',
    code: 'ST01-008',
    name: 'Exorcisme',
    type: 'Sort',
    color: 'Blanc',
    cost: 3,
    effect: 'Détruisez toutes les créatures noires',
    rarity: 'Peu commune',
    imageUrl: 'https://example.com/exorcism.jpg'
  },
  {
    id: 'card9',
    code: 'ST01-009',
    name: 'Vampire Nocturne',
    type: 'Créature',
    color: 'Noir',
    cost: 3,
    power: 2,
    counter: 3,
    effect: 'Vol, Menace de vie',
    rarity: 'Rare',
    imageUrl: 'https://example.com/vampire.jpg'
  },
  {
    id: 'card10',
    code: 'ST01-010',
    name: 'Drain de Vie',
    type: 'Sort',
    color: 'Noir',
    cost: 2,
    effect: 'Détruisez une créature. Vous gagnez des points de vie égaux à sa force',
    rarity: 'Commune',
    imageUrl: 'https://example.com/drain.jpg'
  }
]

async function main() {
  try {
    // Récupérer l'utilisateur de test
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    })

    if (!user) {
      console.log('Utilisateur de test non trouvé. Veuillez d\'abord créer l\'utilisateur de test.')
      return
    }

    // Créer les cartes
    for (const cardData of testCards) {
      const card = await prisma.card.upsert({
        where: { id: cardData.id },
        update: cardData,
        create: cardData
      })

      // Ajouter la carte à la collection de l'utilisateur
      await prisma.user.update({
        where: { id: user.id },
        data: {
          collection: {
            connect: { id: card.id }
          }
        }
      })
    }

    console.log('Cartes de test ajoutées avec succès à la collection de l\'utilisateur')
  } catch (error) {
    console.error('Erreur lors de l\'ajout des cartes de test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main() 