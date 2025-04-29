import { PrismaClient } from '@prisma/client'
import { associateStarterDecksToUser } from './associateStarterDecksToNewUser'

const prisma = new PrismaClient()

export async function completeStarterDecks() {
  try {
    console.log('Recherche des utilisateurs sans decks de démarrage...')
    
    // Trouver tous les utilisateurs qui n'ont pas encore reçu leurs decks de démarrage
    // en utilisant une requête SQL brute pour éviter les problèmes de typage
    const usersWithoutDecks = await prisma.$queryRaw`
      SELECT * FROM "User" WHERE "hasStarterDecks" = false
    ` as any[]
    
    if (usersWithoutDecks.length === 0) {
      console.log('Aucun utilisateur sans decks de démarrage trouvé.')
      return
    }
    
    console.log(`${usersWithoutDecks.length} utilisateurs sans decks de démarrage trouvés.`)
    
    // Pour chaque utilisateur
    for (const user of usersWithoutDecks) {
      console.log(`Traitement de l'utilisateur: ${user.email}`)
      
      try {
        // Associer les decks de démarrage
        await associateStarterDecksToUser(user.id)
        
        // Marquer l'utilisateur comme ayant reçu ses decks
        await prisma.$executeRaw`
          UPDATE "User" 
          SET "hasStarterDecks" = true 
          WHERE id = ${user.id}
        `
        
        console.log(`Decks de démarrage ajoutés avec succès pour l'utilisateur ${user.email}`)
      } catch (error) {
        console.error(`Erreur lors de l'ajout des decks pour l'utilisateur ${user.email}:`, error)
      }
    }
    
    console.log('Traitement terminé!')
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Si le script est exécuté directement
if (require.main === module) {
  completeStarterDecks()
    .catch(error => {
      console.error('Erreur:', error)
      process.exit(1)
    })
} 