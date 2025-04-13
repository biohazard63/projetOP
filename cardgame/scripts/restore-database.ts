import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import readline from 'readline'

const prisma = new PrismaClient()

// Interface pour le type de sauvegarde
interface BackupData {
  timestamp: string
  data: {
    users: any[]
    cards: any[]
    decks: any[]
  }
}

async function listBackups() {
  const backupDir = path.join(process.cwd(), 'backups')
  if (!fs.existsSync(backupDir)) {
    console.log('❌ Aucun dossier de sauvegarde trouvé')
    return []
  }

  const files = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
    .map(file => {
      const filePath = path.join(backupDir, file)
      const stats = fs.statSync(filePath)
      return {
        name: file,
        path: filePath,
        date: stats.mtime
      }
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  return files
}

async function selectBackup(): Promise<string | null> {
  const backups = await listBackups()
  
  if (backups.length === 0) {
    console.log('❌ Aucune sauvegarde trouvée')
    return null
  }

  console.log('📂 Sauvegardes disponibles:')
  backups.forEach((backup, index) => {
    console.log(`${index + 1}. ${backup.name} (${backup.date.toLocaleString()})`)
  })

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question('Choisissez une sauvegarde à restaurer (numéro): ', (answer) => {
      rl.close()
      const index = parseInt(answer) - 1
      if (index >= 0 && index < backups.length) {
        resolve(backups[index].path)
      } else {
        console.log('❌ Choix invalide')
        resolve(null)
      }
    })
  })
}

async function restoreDatabase() {
  try {
    // Sélectionner la sauvegarde à restaurer
    const backupPath = await selectBackup()
    if (!backupPath) {
      return
    }

    console.log(`🔄 Restauration de la sauvegarde: ${backupPath}`)
    
    // Lire le fichier de sauvegarde
    const backupContent = fs.readFileSync(backupPath, 'utf-8')
    const backup: BackupData = JSON.parse(backupContent)
    
    console.log(`📅 Date de la sauvegarde: ${new Date(backup.timestamp).toLocaleString()}`)
    console.log(`📊 Données à restaurer:`)
    console.log(`   - Utilisateurs: ${backup.data.users.length}`)
    console.log(`   - Cartes: ${backup.data.cards.length}`)
    console.log(`   - Decks: ${backup.data.decks.length}`)

    // Demander confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    await new Promise<void>((resolve) => {
      rl.question('⚠️ Cette opération va remplacer toutes les données actuelles. Continuer? (o/n): ', async (answer) => {
        rl.close()
        if (answer.toLowerCase() === 'o') {
          // Supprimer toutes les données existantes
          console.log('🗑️ Suppression des données existantes...')
          await prisma.deck.deleteMany()
          await prisma.user.deleteMany()
          await prisma.card.deleteMany()
          
          // Restaurer les cartes
          console.log('🔄 Restauration des cartes...')
          for (const card of backup.data.cards) {
            await prisma.card.create({
              data: {
                id: card.id,
                name: card.name,
                image: card.image,
                type: card.type,
                color: card.color,
                rarity: card.rarity,
                cost: card.cost,
                power: card.power,
                counter: card.counter,
                attribute: card.attribute,
                attributeImage: card.attributeImage,
                set: card.set,
                setNumber: card.setNumber,
                effect: card.effect,
                createdAt: new Date(card.createdAt),
                updatedAt: new Date(card.updatedAt)
              }
            })
          }
          
          // Restaurer les utilisateurs
          console.log('🔄 Restauration des utilisateurs...')
          for (const user of backup.data.users) {
            await prisma.user.create({
              data: {
                id: user.id,
                name: user.name,
                email: user.email,
                password: user.password,
                createdAt: new Date(user.createdAt),
                updatedAt: new Date(user.updatedAt)
              }
            })
          }
          
          // Restaurer les collections des utilisateurs
          console.log('🔄 Restauration des collections...')
          for (const user of backup.data.users) {
            if (user.collection && user.collection.length > 0) {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  collection: {
                    connect: user.collection.map((card: any) => ({ id: card.id }))
                  }
                }
              })
            }
          }
          
          // Restaurer les decks
          console.log('🔄 Restauration des decks...')
          for (const deck of backup.data.decks) {
            await prisma.deck.create({
              data: {
                id: deck.id,
                name: deck.name,
                userId: deck.userId,
                createdAt: new Date(deck.createdAt),
                updatedAt: new Date(deck.updatedAt)
              }
            })
          }
          
          // Restaurer les cartes des decks
          console.log('🔄 Restauration des cartes des decks...')
          for (const deck of backup.data.decks) {
            if (deck.cards && deck.cards.length > 0) {
              await prisma.deck.update({
                where: { id: deck.id },
                data: {
                  cards: {
                    connect: deck.cards.map((card: any) => ({ id: card.id }))
                  }
                }
              })
            }
          }
          
          console.log('✅ Restauration terminée avec succès!')
        } else {
          console.log('❌ Restauration annulée')
        }
        resolve()
      })
    })
  } catch (error) {
    console.error('❌ Erreur lors de la restauration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

restoreDatabase() 