import { redirect } from 'next/navigation'

// Redirection vers la page d'accueil
export default function HomePage() {
  redirect('/home')
}
