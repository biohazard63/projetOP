import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

// Métadonnées pour la page 404
export const metadata = {
  title: 'Page introuvable - One Piece Card Game',
  description: 'La page que vous recherchez n\'existe pas.',
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-6xl md:text-8xl font-bold text-yellow-500 mb-4">404</h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
            Page introuvable
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            La page que vous recherchez n&apos;existe pas ou a été déplacée.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button className="bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-500 hover:to-red-500 text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105">
              <Home className="h-5 w-5 mr-2" />
              Accueil
            </Button>
          </Link>
          
          <Button 
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 px-6 py-3 rounded-xl transition-all duration-300"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    </div>
  )
}
