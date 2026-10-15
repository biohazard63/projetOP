'use client'
import { BerryChip } from '@/components/economy/Berries'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import compactLogo from '../../public/images/logo/mugiwara-emblem.png'
import desktopLogo from '../../public/images/logo/mugiwara-wordmark.png'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BookOpen, History, Home, Layers, Menu, Package, PackageOpen, Search, Swords, UserRound, X, Compass, ChevronRight } from 'lucide-react'
import { ThemeSelector } from '@/components/collector/ThemeSelector'
import { useOpeningPresentation } from '@/components/collector/OpeningPresentation'
// Grouped in the V2 sidebar; the order of `links` (and the mobile bottom bar) is unchanged.
const groups = [{ label: 'Jouer', hrefs: ['/home', '/play'] }, { label: 'Collection', hrefs: ['/boosters', '/boosters?view=extensions', '/collection', '/decks'] }, { label: 'Compte', hrefs: ['/history', '/profile'] }]
const links = [
  { href: '/home', label: 'Accueil', icon: Home },
  { href: '/boosters', label: 'Boosters', icon: Package },
  { href: '/collection', label: 'Collection', icon: BookOpen },
  { href: '/decks', label: 'Mes decks', icon: Layers },
  { href: '/play', label: 'Jouer', icon: Swords },
  { href: '/boosters?view=extensions', label: 'Extensions', icon: Compass },
  { href: '/history', label: 'Historique', icon: History },
  { href: '/profile', label: 'Profil', icon: UserRound },
]
export function Navbar() {
  const { cinematic } = useOpeningPresentation()
  const pathname = usePathname()
  const parameters = useSearchParams()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null), search = useRef<HTMLInputElement>(null)
  // "/" focuses the global card search (outside text fields).
  useEffect(() => {
    const key = (e: KeyboardEvent) => { const t = e.target as HTMLElement; if (e.key === '/' && !e.metaKey && !e.ctrlKey && !t.closest('input,textarea,select,[contenteditable=true]')) { e.preventDefault(); search.current?.focus() } }
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key)
  }, [])
  useEffect(() => setOpen(false), [pathname, parameters])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); toggle.current?.focus() } }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [open])
  const active = (href: string) => href.includes('?') ? pathname === '/boosters' && parameters.get('view') === 'extensions' : (href === '/boosters' ? parameters.get('view') !== 'extensions' && (pathname.startsWith('/boosters') || pathname === '/booster-opening') : pathname === href || (href === '/collection' && pathname === '/progress') || (href === '/decks' && pathname === '/deck-builder') || (href === '/play' && pathname.startsWith('/play/')))
  const mobileBrand = <Link href="/home" className="piece-brand" aria-label="Mugiwara TCG, accueil"><Image src={compactLogo} alt="" width={48} height={44} sizes="48px" /><span><strong>MUGIWARA</strong><small>ONE PIECE CARD GAME</small></span></Link>
  const desktopBrand = <Link href="/home" className="piece-brand piece-brand-desktop" aria-label="Mugiwara TCG, accueil"><Image src={desktopLogo} alt="One Piece Card Game" sizes="168px" /><span className="piece-brand-name">MUGIWARA TCG</span></Link>
  const item = ({ href, label, icon: Icon }: (typeof links)[number]) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}><span className="piece-nav-icon"><Icon size={17} /></span>{label}</Link>
  const menu = links.map(item)
  const grouped = groups.map(g => <div key={g.label} className="piece-nav-group"><p className="piece-sidebar-label">{g.label}</p>{g.hrefs.map(h => item(links.find(l => l.href === h)!))}</div>)
  if (cinematic) return null
  return <>
    <aside className="piece-sidebar"><div className="piece-sidebar-brand">{desktopBrand}</div>
      <Link href="/boosters" className="piece-sidebar-cta"><PackageOpen size={18} />Ouvrir un booster</Link>
      <nav aria-label="Navigation principale" className="piece-sidebar-links">{grouped}</nav>
      <div className="piece-sidebar-bottom"><div className="piece-sidebar-theme"><ThemeSelector /></div><div className="piece-sidebar-note"><span className="piece-status-dot" />Simulation gratuite</div>
        <Link href={session?.user ? '/profile' : '/login'} className="piece-sidebar-profile"><span className="piece-avatar">{session?.user?.name?.slice(0, 1).toUpperCase() || <UserRound size={18} />}</span><span><strong>{session?.user?.name || 'Bienvenue à bord'}</strong><small>{session?.user ? 'Votre espace collectionneur' : 'Connectez-vous'}</small></span><ChevronRight size={16} className="piece-sidebar-profile-go" /></Link></div></aside>
    <header className="piece-topbar"><div className="piece-mobile-brand">{mobileBrand}</div><form action="/collection" method="get" className="piece-global-search" role="search"><Search size={16} /><input ref={search} name="q" type="search" aria-label="Recherche globale de cartes" placeholder="Rechercher une carte, un identifiant…" /><kbd className="piece-search-key" aria-hidden="true">/</kbd><button type="submit" aria-label="Rechercher">↵</button></form><div className="piece-account"><BerryChip /><Link href="/boosters" className="piece-topbar-link"><PackageOpen size={15} />Grand Line</Link><Link href={session?.user ? '/profile' : '/login'} className="piece-avatar" aria-label={session?.user ? 'Mon profil' : 'Se connecter'}><UserRound size={18} /></Link><button ref={toggle} className="piece-mobile-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="collector-mobile-menu" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}>{open ? <X /> : <Menu />}</button></div>{open && <nav aria-label="Navigation mobile" id="collector-mobile-menu" className="piece-mobile-menu">{menu}<ThemeSelector /></nav>}</header>
    <nav className="piece-bottom-nav" aria-label="Navigation principale mobile">{links.filter(({ href }) => ['/home', '/boosters', '/collection', '/decks', '/play', '/profile'].includes(href)).map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={(href === '/boosters' ? pathname.startsWith('/boosters') || pathname === '/booster-opening' : active(href)) ? 'page' : undefined}><span className="piece-bottom-icon"><Icon size={21} aria-hidden="true" /></span><span>{label === 'Mes decks' ? 'Decks' : label}</span></Link>)}</nav>
  </>
}
