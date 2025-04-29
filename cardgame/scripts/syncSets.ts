import { PrismaClient } from '@prisma/client'
import { SET_RULES } from './configureSetRules'

const prisma = new PrismaClient()

async function syncSets() {
  try {
    console.log('Début de la synchronisation des sets...')
    
    // Convertir les règles de sets en données pour la base
    const setsToSync = Object.entries(SET_RULES).map(([code, rules]) => ({
      code,
      name: rules.name,
      releaseDate: new Date(), // Date par défaut
      description: `Set ${rules.name}`,
      imageUrl: null
    }))
    
    console.log(`${setsToSync.length} sets à synchroniser`)
    
    // Synchroniser chaque set
    for (const setData of setsToSync) {
      await prisma.cardSet.upsert({
        where: { code: setData.code },
        update: {
          name: setData.name,
          releaseDate: setData.releaseDate,
          description: setData.description,
          imageUrl: setData.imageUrl
        },
        create: {
          code: setData.code,
          name: setData.name,
          releaseDate: setData.releaseDate,
          description: setData.description,
          imageUrl: setData.imageUrl
        }
      })
      console.log(`Set ${setData.code} (${setData.name}) synchronisé`)
    }
    
    console.log('Synchronisation terminée avec succès')
    
  } catch (error) {
    console.error('Erreur lors de la synchronisation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter la synchronisation
syncSets() 