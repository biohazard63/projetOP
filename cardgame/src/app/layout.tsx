import './globals.css'
import './collector.css'
import { CollectorPreferencesProvider } from '@/components/collector/Preferences'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import { Navbar } from '@/components/Navbar'
import { Providers } from './providers'

import { Analytics } from '@vercel/analytics/react'
import { cn } from "@/lib/utils"
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'

const inter = Inter({ subsets: ['latin'] })

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#080F1F' }

export const metadata = {
  title: 'One Piece Card Game',
  description: 'Mugiwara TCG – L\'application fan-made française du One Piece Card Game. Ouvre des boosters réalistes, collectionne tes cartes et affronte d\'autres joueurs pirates.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mugiwara TCG',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/images/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/images/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
}

// Note: variante de layout réservée pour usage futur (supprimée pour éviter warn unused)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Balises meta spécifiques pour iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mugiwara TCG" />
        <link rel="apple-touch-icon" href="/images/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/images/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/images/icons/icon-512.png" />
        <link rel="apple-touch-startup-image" href="/images/icons/icon-512.png" />
      </head>
      <body suppressHydrationWarning className={cn(inter.className, "min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] overflow-x-hidden")}>
        <Providers>
          <CollectorPreferencesProvider>
          <a className="piece-skip" href="#main-content">Aller au contenu</a>
          <div className="relative min-h-screen">
            {/* Fond: image + dégradés radiaux et overlay */}
       

            <Navbar />

            <main id="main-content" tabIndex={-1} className="piece-main relative z-10" suppressHydrationWarning>
              {children}
            </main>
         
          </div>
          <footer className="piece-footer"><span>MUGIWARA TCG · Votre aventure, carte après carte.</span><span>Projet de fans · Simulation gratuite <Link href="/opening-demo" className="ml-4 text-amber-200">Démo cinématique</Link></span></footer>
          </CollectorPreferencesProvider>
        </Providers>
        <PWAInstallPrompt />
        {/* <PWAAuthHelper /> */}
        <Analytics />
      </body>
    </html>
  )
}
