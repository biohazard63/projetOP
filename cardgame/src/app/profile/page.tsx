'use client'
import '../home/home.css'
import './profile.css'
import Link from 'next/link'
import Image from 'next/image'
import { useState, type ReactNode } from 'react'
import { signOut } from 'next-auth/react'
import { BookOpen, Clapperboard, History, Layers, LogOut, PackageOpen, Smartphone, Sparkles, TrendingUp, Trophy, Lock, Vibrate, Volume2, Wand2 } from 'lucide-react'
import { InstallHelp } from '@/components/collector/InstallHelp'
import { ThemeSelector } from '@/components/collector/ThemeSelector'
import { useRemote } from '@/hooks/useRemote'
import { useCollectorPreferences } from '@/components/collector/Preferences'
import { useSoundSetting } from '@/hooks/useAudio'
import type { CatalogueCard, CollectorOverview } from '@/lib/collector/types'
import { LoadState, Progress } from '@/components/collector/Primitives'
import { Counter, Ring, badgesOf, bountyOf, rankOf, useCountUp } from '@/components/collector/Progression'
import CardDetail from '@/components/collector/CardDetail'
import { compareCodes } from '@/lib/boosters/catalogPresentation'
import { OceanBackdrop, Tilt, useReveal } from '@/components/home/fx'

function Toggle({ label, hint, icon, checked, disabled, onChange }: { label: string; hint: string; icon: ReactNode; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return <label className="pf-toggle"><span className="pf-toggle-icon">{icon}</span><span className="pf-toggle-text"><b>{label}</b><small>{hint}</small></span>
    <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} /><span className="pf-switch" aria-hidden="true" /></label>
}

/** V2 profile: a One Piece "WANTED" bounty poster, rank and statistics, badges, treasures and settings as switches. */
export default function ProfilePage() {
  useReveal()
  const overview = useRemote<CollectorOverview>('/api/collector')
  const prefs = useCollectorPreferences()
  const sound = useSoundSetting()
  const [detail, setDetail] = useState<CatalogueCard | null>(null)
  const data = overview.data, profile = data?.profile
  const bounty = useCountUp(data ? bountyOf(data) : 0, 1600)
  const progress = data ? rankOf(data.percentage, data.catalogue, data.unique) : null
  const badges = data ? badgesOf(data) : []
  const portrait = data?.recentRareCards[0] ?? data?.recentCards[0]
  const sets = (data?.sets ?? []).filter(s => s.total > 0).sort((a, b) => b.percentage - a.percentage || compareCodes(a.code, b.code)).slice(0, 6)
  const name = profile?.name || 'Pirate inconnu'
  return <div className="piece-page piece-profile-page pf-page">
    <div className="fx-home pf">
      <OceanBackdrop />
      <LoadState loading={overview.loading} error={overview.error} retry={overview.retry} />
      <section className="pf-hero">
        <Tilt className="pf-poster" max={6}>
          <p className="pf-wanted">WANTED</p>
          <div className="pf-photo">{portrait?.imageUrl ? <Image src={portrait.imageUrl} alt="" fill sizes="260px" /> : <span>{name.slice(0, 1).toUpperCase()}</span>}</div>
          <p className="pf-dead">DEAD OR ALIVE</p>
          <p className="pf-name">{name}</p>
          <p className="pf-bounty"><span>฿</span>{bounty.toLocaleString('fr-FR')}<span>-</span></p>
          <p className="pf-marine">MARINE</p>
        </Tilt>
        <div className="pf-identity">
          <p className="fx-kicker">À bord du Thousand Sunny</p>
          <h1>{name}</h1>
          <p className="pf-rank"><Sparkles size={16} /> Rang : <b className="fx-gradient-text">{progress?.rank.name ?? '…'}</b>{progress?.next && <span> · encore {progress.toNext.toLocaleString('fr-FR')} cartes pour {progress.next.name}</span>}</p>
          {profile && <dl className="pf-facts">
            <div><dt>Adresse email</dt><dd>{profile.email}</dd></div>
            <div><dt>Membre depuis</dt><dd>{new Date(profile.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
          </dl>}
          <div className="pf-ring-row">
            <div className="pf-ring"><Ring value={data?.percentage ?? 0} size={120} stroke={11} /><div><strong>{data ? `${data.percentage}%` : '…'}</strong><span>du catalogue</span></div></div>
            {data && <div className="pf-counters">
              <Counter label="Cartes uniques" value={data.unique} accent />
              <Counter label="Exemplaires" value={data.total} />
              <Counter label="Boosters ouverts" value={data.openings} />
              <Counter label="Decks" value={data.decks} />
            </div>}
          </div>
          <div className="pf-links"><Link href="/history" className="fx-btn ghost"><History size={17} />Mes ouvertures</Link><Link href="/progress" className="fx-btn ghost"><TrendingUp size={17} />Ma progression</Link><Link href="/collection" className="fx-btn"><BookOpen size={17} />Ma collection</Link></div>
        </div>
      </section>
      <p className="pf-note">La prime est un clin d’œil calculé à partir de votre collection : elle ne sert à rien d’autre.</p>

      {badges.length > 0 && <section className="pf-section" data-reveal>
        <h2><Trophy size={20} /> Badges <small>{badges.filter(b => b.done).length} / {badges.length}</small></h2>
        <div className="hm-badges">{badges.map(b => <div key={b.name} className={`hm-badge${b.done ? ' done' : ''}`} title={b.hint}><span>{b.done ? <Trophy size={20} /> : <Lock size={18} />}</span><b>{b.name}</b><small>{b.hint}</small></div>)}</div>
      </section>}

      <div className="pf-columns" data-reveal>
        {data && data.recentRareCards.length > 0 && <section className="pf-section">
          <h2><Sparkles size={20} /> Trésors</h2>
          <div className="pf-treasures">{data.recentRareCards.slice(0, 4).map(c => <Tilt key={c.id} max={14} className="pf-treasure"><button type="button" onClick={() => setDetail(c)} aria-label={`Détails de ${c.name}`}><Image src={c.imageUrl || '/images/card-back.jpg'} alt={c.name} fill sizes="160px" /></button></Tilt>)}</div>
        </section>}
        {sets.length > 0 && <section className="pf-section">
          <h2><Layers size={20} /> Extensions les plus avancées</h2>
          <div className="pf-sets">{sets.map(s => <Link key={s.code} href={`/collection?set=${encodeURIComponent(s.code)}`} className="pf-set"><b>{s.code}</b><Progress value={s.percentage} label={`Progression ${s.code}`} /><span>{s.percentage}%</span></Link>)}</div>
        </section>}
      </div>

      <section className="pf-section pf-settings" aria-busy={!prefs.ready} data-reveal>
        <h2><Wand2 size={20} /> Votre expérience</h2>
        <div className="pf-settings-grid">
          <div className="pf-setting-block"><ThemeSelector /><p className="pf-muted">Préférences conservées dans ce navigateur. Le réglage d’animations réduites du système est toujours respecté.</p>
            <label className="pf-select">Affichage du classeur<select disabled={!prefs.ready} value={prefs.density} onChange={e => prefs.update({ density: e.target.value === 'compact' ? 'compact' : 'comfortable' })}><option value="comfortable">Confortable</option><option value="compact">Compact</option></select></label>
            {!prefs.storageAvailable && <p className="pf-muted pf-warn" role="status">Le stockage local est indisponible : ces préférences seront temporaires.</p>}</div>
          <div className="pf-toggles">
            <Toggle label="Cinématiques d’ouverture" hint="Déchirure du paquet et révélation des cartes" icon={<Clapperboard size={18} />} checked={prefs.animations} disabled={!prefs.ready} onChange={v => prefs.update({ animations: v })} />
            <Toggle label="Sons de révélation" hint="Ouverture et cartes rares" icon={<Volume2 size={18} />} checked={sound.soundsEnabled} onChange={v => sound.setSoundsEnabled(v)} />
            <Toggle label="Vibrations de révélation (si disponibles)" hint="Sur mobile, pour les cartes rares" icon={<Vibrate size={18} />} checked={prefs.vibrations} disabled={!prefs.ready} onChange={v => prefs.update({ vibrations: v })} />
            <Toggle label="Réduire les effets visuels" hint="Moins de particules et d’animations" icon={<Smartphone size={18} />} checked={prefs.reducedEffects} disabled={!prefs.ready} onChange={v => prefs.update({ reducedEffects: v })} />
          </div>
        </div>
        <div className="pf-install"><InstallHelp /></div>
      </section>

      <div className="pf-bottom" data-reveal><Link href="/boosters" className="fx-btn"><PackageOpen size={18} />Ouvrir un booster</Link>
        <button type="button" className="pf-logout" onClick={() => void signOut({ callbackUrl: '/login' })}><LogOut size={17} />Se déconnecter</button></div>
      <CardDetail card={detail} cards={data?.recentRareCards} onClose={() => setDetail(null)} />
    </div>
  </div>
}
