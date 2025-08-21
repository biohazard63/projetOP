import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { addStarterDeckCardsToUser } from '@/lib/starterDeckUtils'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    // Validation des données
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Tous les champs sont requis' },
        { status: 400 }
      )
    }

    // Vérifier si l'email existe déjà (normalisé en minuscule)
    const existingUser = await prisma.user.findUnique({
      where: { email: (email as string).toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12)

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
      },
    })

    // Ajouter les cartes de démarrage à l'utilisateur
    // Ajouter les cartes de démarrage en arrière-plan pour ne pas bloquer la réponse
    setTimeout(() => {
      addStarterDeckCardsToUser(user.id).catch((err) =>
        console.error('Erreur association decks démarrage:', err)
      )
    }, 50)

    // Ne pas renvoyer le mot de passe
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(
      { message: 'Inscription réussie', user: userWithoutPassword },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error)
    return NextResponse.json(
      { message: 'Erreur lors de l\'inscription' },
      { status: 500 }
    )
  }
} 