'use client'
import '../home/home.css'
import { useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { Crown, Eye, EyeOff, Lock, Sparkles, Trophy } from 'lucide-react'
import { OceanBackdrop } from '@/components/home/fx'
import { Medal } from '@/components/progression/ProgressionPanel'
import { useProgress } from '@/components/progression/ProgressProvider'
import { BADGE_STEPS, PROGRESSION, levelReward, rankOf, xpForLevel } from '@/lib/progression/config'

const CATEGORY: Record<string, string> = { openings: 'Ouvertures', collection: 'Collection', battles: 'Combats', loyalty: 'Fidélité' }
const fmt = (n: number) => n.toLocaleString('fr-FR')
const ART_BADGES = ['collectionneur']

/** Review page of every badge (13 levels, rewards), secret badges and account titles; the player's progress when signed in. */
export default function BadgesPage() {
  const { progress } = useProgress()
  // Review page (not linked for players): secrets are shown by default to validate them.
  const [reveal, setReveal] = useState(true)
  const reached = new Map(progress?.badges.map(b => [b.id, b]) ?? [])
  const secretsDone = new Set(progress?.secrets.filter(s => s.unlocked).map(s => s.id) ?? [])
  const levels = Array.from({ length: BADGE_STEPS }, (_, i) => rankOf(i + 1))
  return <div className="piece-page"><div className="fx-home bg-page">
    <OceanBackdrop />
    <header className="bg-head">
      <p className="fx-kicker">Le tableau des primes</p>
      <h1>Tous les badges.</h1>
      <p className="bg-lead">Chaque badge monte de <b>Bronze I</b> à <b>Légende</b> en {BADGE_STEPS} niveaux. Chaque niveau rapporte des Berrys et de l’expérience, une seule fois.</p>
      {progress && <Link href="/profile#progression" className="fx-btn ghost"><Trophy size={16} />Ma progression · niveau {progress.account.level}</Link>}
    </header>

    <section className="bg-section">
      <h2>Rangs et récompenses</h2>
      <div className="bg-ranks">{PROGRESSION.ranks.map((r, i) => <div key={r.id} className="bg-rank">
        <Medal badge={{ rank: r.id, level: 1, label: r.levels > 1 ? `${r.label} I` : r.label }} size={48} />
        <b>{r.label}{r.levels > 1 ? ' I-III' : ''}</b><span>+{fmt(r.reward)} ฿ · {r.xp} XP{r.levels > 1 ? ' par niveau' : ''}</span>{r.title && <em>+ titre exclusif</em>}
        {i === PROGRESSION.ranks.length - 1 && <small>soit une display</small>}
      </div>)}</div>
    </section>

    {Object.entries(CATEGORY).map(([category, label]) => <section key={category} className="bg-section">
      <h2>{label}</h2>
      <div className="bg-list">{PROGRESSION.badges.filter(b => b.category === category).map(b => {
        const mine = reached.get(b.id), level = mine?.level ?? 0
        return <article key={b.id} className="bg-badge">
          <header><Medal badge={{ ...(mine ?? { rank: null, level: 0, label: '' }), id: b.id }} size={44} /><div><h3>{b.name}</h3><p>{b.unit}{mine ? ` · vous : ${fmt(mine.value)} (${mine.label})` : ''}</p></div></header>
          <ol className="bg-ladder">{b.thresholds.map((t, i) => <li key={i} className={i < level ? 'done' : i === level && progress ? 'next' : ''} data-rank={levels[i].id} title={`${levels[i].label} : ${fmt(t)} ${b.unit} · +${fmt(levels[i].reward)} ฿`}>
            <span>{levels[i].id === 'legend' ? <Crown size={11} /> : levels[i].sub}</span><b>{fmt(t)}</b></li>)}</ol>
          {ART_BADGES.includes(b.id) && <div className="bg-art-row">{PROGRESSION.ranks.map((r, i) => <figure key={r.id}><Medal badge={{ id: b.id, rank: r.id, level: 1 + PROGRESSION.ranks.slice(0, i).reduce((n, x) => n + x.levels, 0), label: r.levels > 1 ? `${r.label} I` : r.label }} size={56} /><figcaption>{r.label}</figcaption></figure>)}</div>}
          <p className="bg-legend"><Sparkles size={12} /> Légende : titre « {b.legendTitle} »</p>
        </article>
      })}</div>
    </section>)}

    <section className="bg-section">
      <h2>Badges secrets <small>{PROGRESSION.secrets.length} · +{fmt(PROGRESSION.secretReward.berries)} ฿ et {PROGRESSION.secretReward.xp} XP chacun</small>
        <button type="button" className="bg-reveal" onClick={() => setReveal(r => !r)} aria-pressed={reveal}>{reveal ? <><EyeOff size={15} />Masquer</> : <><Eye size={15} />Révéler (spoilers)</>}</button></h2>
      <ul className="pg-secrets">{PROGRESSION.secrets.map(s => { const done = secretsDone.has(s.id), show = reveal || done
        return <li key={s.id} className={done ? 'on' : ''}><span>{done ? <Sparkles size={18} /> : <Lock size={16} />}</span><b>{show ? s.name : '???'}</b><small>{show ? s.hint : 'À découvrir en jouant'}</small></li> })}</ul>
    </section>

    <section className="bg-section">
      <h2>Niveaux de compte</h2>
      <p className="bg-lead">L’expérience vient des boosters ({PROGRESSION.xp.booster} XP), des nouvelles cartes ({PROGRESSION.xp.newCard} XP), des parties ({PROGRESSION.xp.game.easy} / {PROGRESSION.xp.game.normal} / {PROGRESSION.xp.game.hard} XP, ×{PROGRESSION.xp.winMultiplier} en victoire), du trésor du jour ({PROGRESSION.xp.dailyTreasure} XP) et des badges. Chaque niveau rapporte {fmt(levelReward(2))} ฿, tous les 5 niveaux {fmt(levelReward(5))} ฿ et tous les 10 niveaux {fmt(levelReward(10))} ฿, soit une display.</p>
      <ol className="bg-titles">{PROGRESSION.titles.map((t, i) => { const mineLvl = progress?.account.level ?? 0, to = PROGRESSION.titles[i + 1]?.from
        return <li key={t.title} className={mineLvl >= t.from && (!to || mineLvl < to) ? 'on' : mineLvl >= t.from ? 'done' : ''} style={{ '--i': i } as CSSProperties}>
          <b>{t.title}</b><span>niveau {t.from}{to ? `-${to - 1}` : ''}</span><small>{fmt(xpForLevel(t.from))} XP</small></li> })}</ol>
    </section>
  </div></div>
}
