import './globals.css'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import { Navbar } from '@/components/Navbar'
import { Providers } from './providers'

import { Analytics } from '@vercel/analytics/react'
import { cn } from "@/lib/utils"
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import PWAAuthHelper from '@/components/PWAAuthHelper'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'One Piece Card Game',
  description: 'Mugiwara TCG – L\'application fan-made française du One Piece Card Game. Ouvre des boosters réalistes, collectionne tes cartes et affronte d\'autres joueurs pirates.',
  manifest: '/manifest.json',
  themeColor: '#f59e0b',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
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
          <div className="relative min-h-screen">
            {/* Fond: image + dégradés radiaux et overlay */}
       

            <header className="relative z-20">
              {/* Navbar temporairement désactivé pour le build */}
              <Navbar />
            </header>

            <main className="relative z-10 pt-16" suppressHydrationWarning>
              {children}
            </main>
         
          </div>
        </Providers>
        <PWAInstallPrompt />
        {/* <PWAAuthHelper /> */}
        <Analytics />
      </body>
    </html>
  )
}
