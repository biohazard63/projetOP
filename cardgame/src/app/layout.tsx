import './globals.css'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import { Navbar } from '@/components/Navbar'
import { Providers } from './providers'
import { Analytics } from '@vercel/analytics/react'
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'One Piece Card Game',
  description: 'Plateforme de jeu One Piece Card Game - Créez des decks, ouvrez des boosters et jouez en ligne !',
}

// Note: variante de layout réservée pour usage futur (supprimée pour éviter warn unused)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning className={cn(inter.className, "min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] overflow-x-hidden")}>
        <Providers>
          <div className="relative min-h-screen">
            {/* Fond: image + dégradés radiaux et overlay */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <Image
                src="/images/one-piece-bg.jpg"
                alt=""
                fill
                priority
                className="object-cover opacity-20 dark:opacity-25"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--op-ink)/_.85)] via-transparent to-[hsl(var(--op-ink)/_.85)] [--tw-bg-opacity:1] mix-blend-multiply" />
              <div className="absolute -top-32 left-1/2 h-[60vh] w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_hsl(var(--op-red)/_.12),_transparent_60%)] blur-3xl" />
              <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/40 to-transparent" />
            </div>

            <header className="relative z-20">
              <Navbar />
            </header>

            <main className="relative z-10 pt-16" suppressHydrationWarning>
              {children}
            </main>
          </div>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
