import './play.css'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Jouer — Mugiwara TCG' }
export default async function PlayLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return children
}
