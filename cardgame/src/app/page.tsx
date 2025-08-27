import { redirect } from 'next/navigation'

// Métadonnées pour la page racine
export const metadata = {
  title: 'One Piece Card Game',
  description: 'Jeu de cartes One Piece fan-made',
}

// Redirection vers la page d'accueil
export default function HomePage() {
  redirect('/home')
}
