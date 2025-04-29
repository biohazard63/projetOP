import { completeStarterDecks } from './completeStarterDecks'

// Intervalle en millisecondes (par exemple, toutes les 5 minutes)
const CHECK_INTERVAL = 5 * 60 * 1000

console.log('Démarrage du service de vérification des decks de démarrage...')
console.log(`Vérification toutes les ${CHECK_INTERVAL / 60000} minutes`)

// Exécuter immédiatement une première fois
completeStarterDecks()
  .then(() => {
    console.log('Première vérification terminée.')
    
    // Puis exécuter périodiquement
    setInterval(() => {
      console.log('Vérification périodique des decks de démarrage...')
      completeStarterDecks()
        .catch((error: Error) => {
          console.error('Erreur lors de la vérification périodique:', error)
        })
    }, CHECK_INTERVAL)
  })
  .catch((error: Error) => {
    console.error('Erreur lors de la première vérification:', error)
  }) 