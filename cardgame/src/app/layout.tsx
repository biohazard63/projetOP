import './globals.css'
import './collector.css'
import '@/components/reports/reports.css'
import '@/components/admin/admin.css'
import './light.css'
import { CollectorPreferencesProvider } from '@/components/collector/Preferences'
import Link from 'next/link'
import { OpeningPresentationProvider } from '@/components/collector/OpeningPresentation'
import { Inter } from 'next/font/google'
import { Navbar } from '@/components/Navbar'
import { Providers } from './providers'
import { auth } from '@/lib/auth'
import { ProgressProvider } from '@/components/progression/ProgressProvider'

import { Analytics } from '@vercel/analytics/react'
import { cn } from "@/lib/utils"
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'

const inter = Inter({ subsets: ['latin'] })

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#071222' }, { media: '(prefers-color-scheme: light)', color: '#F8F6F0' }] }

export const metadata = {
  title: 'Mugiwara TCG',
  description: 'Mugiwara TCG – L\'application fan-made française du One Piece Card Game. Collectionne tes cartes, ouvre des boosters et construis tes decks.',
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

export default async function RootLayout({
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
      <body suppressHydrationWarning className={cn(inter.className, "min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] overflow-x-clip")}>
        {/* The session comes with the page: no client round trip before the signed-in views can render. */}
        <Providers session={await auth()}>
          <CollectorPreferencesProvider><OpeningPresentationProvider><ProgressProvider>
          <a className="piece-skip" href="#main-content">Aller au contenu</a>
          <div className="relative min-h-screen">
            {/* Fond: image + dégradés radiaux et overlay */}
       

            <Navbar />

            <main id="main-content" tabIndex={-1} className="piece-main relative z-10" suppressHydrationWarning>
              {children}
            </main>
         
          </div>
          <footer className="piece-footer"><span>MUGIWARA TCG · Votre aventure, carte après carte.</span><span>Projet de fans · Simulation gratuite <Link href="/opening-demo" className="ml-4 text-amber-200">Démo cinématique</Link></span></footer>
            <PWAInstallPrompt /></ProgressProvider></OpeningPresentationProvider></CollectorPreferencesProvider>
        </Providers>
        {/* <PWAAuthHelper /> */}
        <Analytics />
      </body>
    </html>
  )
}
