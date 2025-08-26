import { redirect } from 'next/navigation'

// Redirection vers la page de chargement
export default function HomePage() {
  redirect('/loading')
}
