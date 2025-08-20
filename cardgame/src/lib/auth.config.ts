import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GithubProvider from "next-auth/providers/github"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"
import { addStarterDeckCardsToUser } from "./starterDeckUtils"

export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Autoriser le rattachement d'un compte Google au même email qu'un compte existant
      // (sécurisé par la vérification d'email dans le callback signIn ci-dessous)
      allowDangerousEmailAccountLinking: true,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) {
          throw new Error("Aucun utilisateur trouvé avec cet email")
        }

        if (!user.password) {
          throw new Error("Ce compte n'a pas de mot de passe configuré")
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error("Mot de passe incorrect")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Protection centralisée utilisée par le middleware
    authorized({ auth, request }) {
      // true = accès, false = redirection vers pages.signIn
      return !!auth?.user
    },
    async signIn({ user, account, profile, isNewUser }) {
      // Bloquer les connexions OAuth si l'email Google n'est pas vérifié
      if (account?.provider === 'google') {
        const verified = (profile as any)?.email_verified
        if (verified === false) {
          return false
        }
      }
      // Si c'est un nouvel utilisateur OAuth
      if (account?.provider !== 'credentials' && user) {
        // Vérifier si l'utilisateur a déjà des decks
        const userWithDecks = await prisma.user.findUnique({
          where: { id: user.id },
          include: { decks: true }
        })

        // Si l'utilisateur n'a pas de decks, ajouter les decks de démarrage
        if (userWithDecks && userWithDecks.decks.length === 0) {
          // Lancer l'association des decks de démarrage en arrière-plan
          setTimeout(async () => {
            try {
              await addStarterDeckCardsToUser(user.id)
              console.log(`Decks de démarrage ajoutés avec succès pour l'utilisateur ${user.id}`)
            } catch (error) {
              console.error('Erreur lors de l\'association des decks de démarrage:', error)
            }
          }, 100)
        }
      }

      // Si c'est un nouvel utilisateur avec credentials, ajouter aussi les decks
      if (account?.provider === 'credentials' && isNewUser && user) {
        setTimeout(async () => {
          try {
            await addStarterDeckCardsToUser(user.id)
            console.log(`Decks de démarrage ajoutés avec succès pour le nouvel utilisateur ${user.id}`)
          } catch (error) {
            console.error('Erreur lors de l\'association des decks de démarrage:', error)
          }
        }, 100)
      }

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
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 heures
    updateAge: 60 * 60, // 1 heure
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development'
} satisfies NextAuthConfig
