'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BookOpen, History, Home, Layers, Menu, Package, Search, UserRound, X, Compass } from 'lucide-react'
const links = [
  { href: '/home', label: 'Accueil', icon: Home },
  { href: '/boosters', label: 'Boosters', icon: Package },
  { href: '/collection', label: 'Collection', icon: BookOpen },
  { href: '/decks', label: 'Mes decks', icon: Layers },
  { href: '/boosters?view=extensions', label: 'Extensions', icon: Compass },
  { href: '/history', label: 'Historique', icon: History },
  { href: '/profile', label: 'Profil', icon: UserRound },
]
export function Navbar() {
  const pathname = usePathname()
  const parameters = useSearchParams()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  useEffect(() => setOpen(false), [pathname, parameters])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); toggle.current?.focus() } }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [open])
  const active = (href: string) => href.includes('?') ? pathname === '/boosters' && parameters.get('view') === 'extensions' : (href === '/boosters' ? parameters.get('view') !== 'extensions' && (pathname.startsWith('/boosters') || pathname === '/booster-opening') : pathname === href || (href === '/decks' && pathname === '/deck-builder'))
  const brand = <Link href="/home" className="piece-brand" aria-label="Mugiwara TCG, accueil"><Image src="/images/jolly-roger.png" alt="" width={42} height={42} /><span><strong>MUGIWARA</strong><small>ONE PIECE CARD GAME</small></span></Link>
  const menu = links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}><Icon size={17} />{label}</Link>)
  return <>
    <aside className="piece-sidebar"><div className="piece-sidebar-brand">{brand}</div><p className="piece-sidebar-label">VOTRE AVENTURE</p><nav aria-label="Navigation principale" className="piece-sidebar-links">{menu}</nav><div className="piece-sidebar-note"><span className="piece-status-dot" />Simulation gratuite</div><Link href={session?.user ? '/profile' : '/login'} className="piece-sidebar-profile"><span className="piece-avatar">{session?.user?.name?.slice(0, 1).toUpperCase() || <UserRound size={18} />}</span><span><strong>{session?.user?.name || 'Bienvenue à bord'}</strong><small>{session?.user ? 'Votre espace collectionneur' : 'Connectez-vous'}</small></span></Link></aside>
    <header className="piece-topbar"><div className="piece-mobile-brand">{brand}</div><form action="/collection" method="get" className="piece-global-search" role="search"><Search size={16} /><input name="q" type="search" aria-label="Recherche globale de cartes" placeholder="Rechercher une carte, un identifiant…" /><button type="submit" aria-label="Rechercher">↵</button></form><div className="piece-account"><Link href="/boosters" className="piece-topbar-link">Grand Line</Link><Link href={session?.user ? '/profile' : '/login'} className="piece-avatar" aria-label={session?.user ? 'Mon profil' : 'Se connecter'}><UserRound size={18} /></Link><button ref={toggle} className="piece-mobile-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="collector-mobile-menu" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}>{open ? <X /> : <Menu />}</button></div>{open && <nav aria-label="Navigation mobile" id="collector-mobile-menu" className="piece-mobile-menu">{menu}</nav>}</header>
  </>
}
