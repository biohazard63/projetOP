import './globals.css'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import { Navbar } from '@/components/Navbar'
import { Providers } from './providers'
import { Footer } from '@/components/Footer'
import { Analytics } from '@vercel/analytics/react'
import { cn } from "@/lib/utils"
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'

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
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <div
                className="absolute inset-0 bg-[url('/images/home2.png')] bg-top md:bg-center bg-no-repeat bg-cover"
                aria-hidden
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--op-ink)/_.25)] via-transparent to-[hsl(var(--op-ink)/_.35)]" />
              <div className="absolute -top-32 left-1/2 h-[60vh] w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_hsl(var(--op-red)/_.10),_transparent_60%)] blur-3xl" />
              <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/10 to-transparent" />
            </div>

            <header className="relative z-20">
              <Navbar />
            </header>

            <main className="relative z-10 pt-16" suppressHydrationWarning>
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
        <PWAInstallPrompt />
        <Analytics />
      </body>
    </html>
  )
}
