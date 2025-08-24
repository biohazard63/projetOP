import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GithubProvider from "next-auth/providers/github"
import EmailProvider from "next-auth/providers/email"
import type { Provider } from "next-auth/providers"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { addStarterDeckCardsToUser } from "./starterDeckUtils"
import { verifyCaptcha } from "./captcha"
import { getClientIp, rateLimit, isLocked, registerFailure, clearFailures } from "./security"

const providers: Provider[] = []

if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
  providers.push(
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      maxAge: 10 * 60, // 10 minutes
    })
  )
}

providers.push(
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // Autoriser le rattachement d'un compte Google au même email qu'un compte existant
    // (sécurisé par la vérification d'email dans le callback signIn ci-dessous)
    allowDangerousEmailAccountLinking: true,
  })
)

providers.push(
  GithubProvider({
    clientId: process.env.GITHUB_ID!,
    clientSecret: process.env.GITHUB_SECRET!,
  })
)

providers.push(
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Mot de passe", type: "password" }
    },
    async authorize(credentials: Record<string, unknown> | undefined, _request: { headers?: Headers }) {
      // Protection anti-abus (rate-limit + lock basé sur IP + email)
      const ip = getClientIp(_request)
      const rawEmail = credentials ? credentials.email : undefined
      const rawPassword = credentials ? credentials.password : undefined
      const rawCaptcha = credentials ? (credentials as Record<string, unknown>).captchaToken : undefined
      const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase().trim() : ''
      const password = typeof rawPassword === 'string' ? rawPassword : ''
      const captchaToken = typeof rawCaptcha === 'string' ? rawCaptcha : ''

      const lockKey = `loginlock:${ip}:${email}`
      if (isLocked(lockKey)) {
        throw new Error('Trop de tentatives, réessaie plus tard')
      }
      const rl = rateLimit(`login:${ip}`, 10, 10 * 60 * 1000) // 10 tentatives/10min/IP
      if (!rl.allowed) {
        throw new Error('Trop de tentatives, réessaie plus tard')
      }

      // Captcha si activé (provider + secret)
      const captchaOk = await verifyCaptcha(captchaToken, ip)
      if (!captchaOk) {
        throw new Error('Vérification anti‑bot échouée')
      }

      if (!email || !password) {
        throw new Error("Email et mot de passe requis")
      }

      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user) {
        registerFailure(lockKey, 5, 15 * 60 * 1000) // 5 erreurs => 15min lock
        throw new Error("Aucun utilisateur trouvé avec cet email")
      }

      if (!user.password) {
        throw new Error("Ce compte n'a pas de mot de passe configuré")
      }

      const isPasswordValid = await bcrypt.compare(password, user.password)

      if (!isPasswordValid) {
        registerFailure(lockKey, 5, 15 * 60 * 1000)
        throw new Error("Mot de passe incorrect")
      }

      // Exiger email vérifié pour credentials si EmailProvider activé
      const requireEmailVerified = Boolean(process.env.EMAIL_SERVER && process.env.EMAIL_FROM)
      if (requireEmailVerified && !user.emailVerified) {
        throw new Error('Email non vérifié. Utilise le lien magique reçu par email.')
      }

      // Succès: effacer les échecs
      clearFailures(lockKey)

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? user.email.split('@')[0]
      }
    }
  })
)

export const authConfig = {
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Protection centralisée utilisée par le middleware
    authorized({ auth, request }) {
      // true = accès, false = redirection vers pages.signIn
      return !!auth?.user
    },
    async signIn({ user, account, profile }) {
      // Bloquer les connexions OAuth si l'email Google n'est pas vérifié
      if (account?.provider === 'google') {
        const verified = (profile && typeof profile === 'object' && 'email_verified' in profile)
          ? (profile as { email_verified?: boolean }).email_verified
          : undefined
        if (verified === false) return false
      }
      // Les nouveaux comptes credentials sont gérés lors de l'inscription (API register)
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
      }
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.accessToken = token.accessToken as string
        session.provider = token.provider as string
      }
      return session
    }
  },
  events: {
    // Lorsqu'un compte OAuth est lié/créé → marquer l'email comme vérifié
    async linkAccount({ user, account }) {
      try {
        if ((account?.provider === 'google' || account?.provider === 'email') && user?.id) {
          await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } })
        }
      } catch (e) {
        console.error('events.linkAccount error:', e)
      }
    },
    // À la création d'un nouvel utilisateur (OAuth) → provisionner cartes ST + decks
    async createUser({ user }) {
      try {
        if (!user?.id) return
        const found = await prisma.user.findUnique({ where: { id: user.id } })
        if (!found) return
        if (found.hasStarterDecks) return
        await addStarterDeckCardsToUser(user.id)
        await prisma.user.update({ where: { id: user.id }, data: { hasStarterDecks: true } })
        console.log(`[auth] Starter ST + decks provisionnés pour ${user.id}`)
      } catch (e) {
        console.error('events.createUser error:', e)
      }
    },
  },
  session: {
    strategy: "jwt",
    // Durée de session (inactivité serveur) configurable via env
    // Par défaut: 30 minutes d'inactivité, rolling toutes les 5 minutes si activité
    maxAge: parseInt(process.env.SESSION_MAX_AGE_SECONDS || `${30 * 60}`, 10),
    updateAge: parseInt(process.env.SESSION_UPDATE_AGE_SECONDS || `${5 * 60}`, 10),
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development'
} satisfies NextAuthConfig
