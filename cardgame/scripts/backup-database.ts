import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function backupDatabase() {
  try {
    // Créer le dossier de sauvegarde s'il n'existe pas
    const backupDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir)
    }

    // Récupérer toutes les données
    const users = await prisma.user.findMany({
      include: {
        collection: true,
        decks: true
      }
    })

    const cards = await prisma.card.findMany()
    const decks = await prisma.deck.findMany({
      include: {
        // Supprimer la propriété cards qui n'existe pas dans le type DeckInclude
        // et utiliser les relations correctes si nécessaire
      }
    })

    // Créer l'objet de sauvegarde
    const backup = {
      timestamp: new Date().toISOString(),
      data: {
        users,
        cards,
        decks
      }
    }

    // Générer le nom du fichier avec la date
    const date = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(backupDir, `backup-${date}.json`)

    // Écrire la sauvegarde dans un fichier
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))

    console.log(`✅ Sauvegarde créée avec succès : ${backupPath}`)
    console.log(`📊 Statistiques de la sauvegarde :`)
    console.log(`   - Utilisateurs : ${users.length}`)
    console.log(`   - Cartes : ${cards.length}`)
    console.log(`   - Decks : ${decks.length}`)

  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde :', error)
  } finally {
    await prisma.$disconnect()
  }
}

backupDatabase() 