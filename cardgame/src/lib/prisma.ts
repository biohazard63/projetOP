import { PrismaClient } from '@prisma/client';
import { associateStarterDecksToUser } from '../../scripts/associateStarterDecksToNewUser';

declare global {
  var prisma: PrismaClient | undefined
}

const prisma = global.prisma || new PrismaClient();

// Middleware pour gérer l'association automatique des decks de démarrage
prisma.$use(async (params, next) => {
  const result = await next(params);

  // Si on vient de créer un nouvel utilisateur
  if (params.model === 'User' && params.action === 'create') {
    // Marquer l'utilisateur comme n'ayant pas encore reçu ses decks
    // Nous utilisons une requête SQL brute pour éviter les problèmes de typage
    await prisma.$executeRaw`
      UPDATE "User" 
      SET "hasStarterDecks" = false 
      WHERE id = ${result.id}
    `;
    
    // Lancer l'association des decks de démarrage en arrière-plan
    // sans bloquer la réponse à l'utilisateur
    // Utiliser un délai minimal pour s'assurer que la transaction de création est terminée
    setTimeout(async () => {
      try {
        // Associer les decks de démarrage
        await associateStarterDecksToUser(result.id);
        
        // Marquer l'utilisateur comme ayant reçu ses decks
        await prisma.$executeRaw`
          UPDATE "User" 
          SET "hasStarterDecks" = true 
          WHERE id = ${result.id}
        `;
        
        console.log(`Decks de démarrage ajoutés avec succès pour l'utilisateur ${result.id}`);
      } catch (error) {
        console.error('Erreur lors de l\'association des decks de démarrage:', error);
        
        // En cas d'erreur, on pourrait implémenter une logique de retry ici
        // ou notifier un service de monitoring
      }
    }, 10); // Délai réduit à 10ms (suffisant pour la plupart des cas)
  }

  return result;
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export { prisma } 