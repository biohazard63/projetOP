import './globals.css'
import { Inter } from 'next/font/google'
import { Navbar } from '@/components/Navbar'
import { Providers } from './providers'
import { Analytics } from '@vercel/analytics/react'
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'One Piece Card Game',
  description: 'Plateforme de jeu One Piece Card Game - Créez des decks, ouvrez des boosters et jouez en ligne !',
}

type RootLayoutProps = {
  children: React.ReactNode
  variant?: 'default' | 'impel-down' | 'ocean' | 'deck-builder'
}

export default function RootLayout({
  children,
  variant = 'default',
}: RootLayoutProps) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning className={cn(inter.className, "min-h-screen")}>
        <Providers>
          <div className="relative z-10">
            <div className="relative z-20" suppressHydrationWarning>
              <Navbar variant={variant} />
            </div>
            <main suppressHydrationWarning>
              {children}
            </main>
          </div>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
