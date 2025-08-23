import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { addStarterDeckCardsToUser } from '@/lib/starterDeckUtils'
import { getClientIp, rateLimit, isStrongPassword, isValidEmail } from '@/lib/security'
import { verifyCaptcha } from '@/lib/captcha'

export async function POST(request: Request) {
  try {
    const { name, email, password, captchaToken } = await request.json()

    // Rate limit global + par IP
    const ip = getClientIp(request)
    const rl = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000) // 5 essais/15min
    if (!rl.allowed) {
      return NextResponse.json(
        { message: 'Trop de tentatives. Réessaie plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    // Captcha (Turnstile/Recaptcha) si activé
    const isHuman = await verifyCaptcha(captchaToken, ip)
    if (!isHuman) {
      return NextResponse.json({ message: 'Vérification anti‑bot échouée' }, { status: 400 })
    }

    // Validation des données
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Tous les champs sont requis' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ message: 'Email invalide' }, { status: 400 })
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json({ message: 'Mot de passe trop faible (min 8, 3 types requis)' }, { status: 400 })
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