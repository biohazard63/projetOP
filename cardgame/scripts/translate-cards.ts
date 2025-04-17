// scripts/translate-cards.ts
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface TranslatedCard {
  id: string
  effect: string
  ability: string
  trigger: string | null
}

async function showCurrentCards() {
  try {
    console.log('Lecture des cartes actuelles dans la base de données...')
    const cards = await prisma.card.findMany({
      select: {
        id: true,
        effect: true,
        ability: true,
        trigger: true
      },
      take: 5 // On prend juste 5 cartes comme exemple
    })

    console.log('\nExemple des données actuelles (5 premières cartes):')
    console.log(JSON.stringify(cards, null, 2))

    // Compter le nombre total de cartes
    const totalCards = await prisma.card.count()
    console.log(`\nNombre total de cartes dans la base de données: ${totalCards}`)

    return cards
  } catch (error) {
    console.error('Erreur lors de la lecture des cartes:', error)
    return []
  }
}

async function showTranslations() {
  try {
    console.log('\nLecture du fichier de traductions...')
    const translationsPath = join(process.cwd(), 'cartes_traduites_complet.json')
    const translationsData = readFileSync(translationsPath, 'utf-8')
    
    // On va juste lire les 5 premières cartes comme exemple
    const firstFewLines = translationsData.split('\n').slice(0, 20).join('\n')
    console.log('\nExemple du contenu du fichier de traductions:')
    console.log(firstFewLines)
    
  } catch (error) {
    console.error('Erreur lors de la lecture des traductions:', error)
  }
}

async function updateCardsWithTranslations() {
  try {
    console.log('Lecture du fichier de traductions...')
    const translationsPath = join(process.cwd(), 'cartes_traduites_complet.json')
    const fileContent = readFileSync(translationsPath, 'utf-8')
    
    // Nettoyer le contenu du fichier
    const cleanedContent = fileContent
      .replace(/:\s*NaN/g, ': ""')  // Remplacer tous les NaN par des chaînes vides
      .replace(/,(\s*})/g, '$1')    // Supprimer les virgules trailing
      .replace(/,(\s*])/g, '$1')    // Supprimer les virgules trailing avant ]
    
    const translatedCards: TranslatedCard[] = JSON.parse(cleanedContent)

    console.log(`${translatedCards.length} cartes traduites trouvées`)

    let updatedCount = 0
    for (const card of translatedCards) {
      if (!card.id) {
        console.log('Carte ignorée car pas d\'ID')
        continue
      }

      try {
        console.log(`Mise à jour de la carte ${++updatedCount}/${translatedCards.length} (ID: ${card.id})`)
        
        await prisma.card.update({
          where: { id: card.id },
          data: {
            effect: card.effect || "",
            ability: card.ability || "",
            trigger: card.trigger || ""
          }
        })
      } catch (error) {
        console.error(`Erreur lors de la mise à jour de la carte ${card.id}:`, error)
      }
    }

    console.log(`Mise à jour des traductions terminée avec succès ! ${updatedCount} cartes mises à jour.`)
  } catch (error) {
    console.error('Erreur lors de la mise à jour des traductions:', error)
    if (error instanceof SyntaxError) {
      console.error('Erreur de syntaxe JSON. Contenu problématique:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  try {
    await showCurrentCards()
    await showTranslations()
    await updateCardsWithTranslations()
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
