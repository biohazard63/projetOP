'use client'
import './home.css'
import { useSession } from 'next-auth/react'
import VisitorHome from '@/components/home/VisitorHome'
import MemberHome from '@/components/home/MemberHome'

// V2 home: a showcase for visitors, a dashboard for signed-in players.
export default function HomePage() {
  const { status } = useSession()
  return <div className="piece-page piece-home-page home-v2">
    {status === 'loading' ? <div className="home-skeleton" role="status" aria-label="Chargement de l’accueil"><span /><span /><span /></div>
      : status === 'authenticated' ? <MemberHome /> : <VisitorHome />}
  </div>
}
