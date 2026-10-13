'use client'
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import Image from 'next/image'
import type { View } from './api'
import type { AnimStep, LogEntry } from './anim'
import { BATTLE_STEPS, PHASES, RESULTS } from './labels'
import { attachedCount, cardActions, cardName, display, dropIntent, draggable, findVisible, FIELD_DROP, pendingAttacks, prompt, seats, type CardAction, type Intent, type Visible } from './model'
import { useGestures, type DragSource } from './gestures'
import { Tutorial, type TutorialState } from './Tutorial'
import { handFanLayout } from './handLayout'
import { characterPositions } from './boardLayout'

type Send = (intent: Intent) => void
const LEVELS: Record<string, string> = { easy: 'Facile', normal: 'Normal', hard: 'Difficile' }

// ---------- card faces ----------
export function CardFace({ view, printingKey, rested, power, attached, size = 'md', hidden, label }: { view: View; printingKey?: string | null; rested?: boolean; power?: number | null; attached?: number; size?: 'xs' | 'sm' | 'md' | 'lg'; hidden?: boolean; label?: string }) {
  const card = display(view, printingKey)
  const [broken, setBroken] = useState(false)
  if (hidden || !card) return <div className={`play-card back ${size}`} aria-label={label ?? 'Carte cachée'}><span>MUGIWARA</span></div>
  return <div className={`play-card ${size}${rested ? ' rested' : ''}`} aria-label={`${card.name}${rested ? ', épuisé' : ''}`}>
    {/* Official artwork goes through the same-origin optimizer: Bandai's Cross-Origin-Resource-Policy blocks direct <img>. */}
    {!broken && card.imageUrl ? <Image src={card.imageUrl} alt="" fill sizes={size === 'lg' ? '320px' : size === 'md' ? '150px' : '90px'} loading={size === 'lg' ? 'eager' : 'lazy'} draggable={false} onError={() => setBroken(true)} /> : <div className="play-card-text"><strong>{card.name}</strong><small>{card.number}</small></div>}
    {card.cost !== null && card.category !== 'LEADER' && <span className="play-badge cost">{card.cost}</span>}
    {power !== undefined && power !== null && <span className="play-badge power">{power}</span>}
    {!!attached && <span className="play-badge don">+{attached}</span>}
  </div>
}
function DonCard({ rested = false, small = false }: { rested?: boolean; small?: boolean }) {
  return <span className={`play-don-card${rested ? ' rested' : ''}${small ? ' small' : ''}`} aria-label={`DON!!${rested ? ' reposé' : ''}`}>
    <Image src="/images/play/don-custom.webp" alt="Carte DON!!" fill sizes={small ? '34px' : '56px'} draggable={false} />
  </span>
}
export function Sheet({ title, onClose, children, wide }: { title: string; onClose?: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!onClose) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [onClose])
  return <div className="play-sheet-backdrop" role="presentation" onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
    <section className={`play-sheet${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header><h2>{title}</h2>{onClose && <button type="button" className="play-close" aria-label="Fermer" onClick={onClose}>×</button>}</header>
      {children}
    </section>
  </div>
}
function ActionList({ actions, onPick }: { actions: CardAction[]; onPick: (a: CardAction) => void }) {
  return <div className="play-actions">{actions.map(a => <button type="button" key={a.key} className={`piece-button ${a.tone === 'primary' ? '' : 'secondary'}`} onClick={() => onPick(a)}>{a.label}</button>)}</div>
}
function Confirm({ title, text, confirm, onConfirm, onCancel, danger }: { title: string; text: string; confirm: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  return <Sheet title={title} onClose={onCancel}><p className="play-rules">{text}</p><div className="play-actions">
    <button type="button" className={`piece-button${danger ? ' danger' : ''}`} onClick={onConfirm}>{confirm}</button>
    <button type="button" className="piece-button secondary" onClick={onCancel}>Annuler</button></div></Sheet>
}
function CardSheet({ view, id, onClose, act }: { view: View; id: string; onClose: () => void; act: (intent: Intent, label: string) => void }) {
  const visible = findVisible(view, id), card = display(view, visible?.printingKey)
  const actions = useMemo(() => cardActions(view, id), [view, id])
  const [targets, setTargets] = useState<CardAction['targets'] | null>(null)
  if (targets) return <Sheet title={targets.label} onClose={onClose}>
    <div className="play-pick-grid">{targets.ids.map(t => { const v = findVisible(view, t); return <button type="button" key={t} className="play-pick" aria-label={cardName(view, t)} onClick={() => { act(targets.build(t), targets.label); onClose() }}>
      <CardFace view={view} printingKey={v?.printingKey} rested={v?.rested} power={v?.power} size="sm" /><span>{cardName(view, t)}{v?.power != null ? ` · ${v.power}` : ''}</span></button> })}</div>
  </Sheet>
  return <Sheet title={card?.name ?? 'Carte'} onClose={onClose}>
    <div className="play-detail">
      <CardFace view={view} printingKey={visible?.printingKey} rested={visible?.rested} power={visible?.power} size="lg" />
      <div className="play-detail-text">
        {card && <p className="piece-eyebrow">{card.number} · {card.category === 'CHARACTER' ? 'Personnage' : card.category === 'EVENT' ? 'Événement' : card.category === 'LEADER' ? 'Leader' : 'Lieu'}{card.certified ? ' · certifiée' : ''}</p>}
        {card && <p className="play-stats-line">{card.cost !== null ? `Coût ${card.cost} · ` : ''}{card.power !== null ? `Puissance ${visible?.power ?? card.power}` : ''}{card.counter ? ` · Counter +${card.counter}` : ''}{visible?.rested ? ' · épuisé' : ''}</p>}
        <p className="play-rules">{card?.text || 'Aucun effet.'}</p>
        {card?.trigger && <p className="play-rules">{card.trigger}</p>}
      </div>
    </div>
    {actions.length ? <ActionList actions={actions} onPick={a => { if (a.targets) setTargets(a.targets); else if (a.intent) { act(a.intent, a.label); onClose() } }} /> : <p className="piece-muted">Aucune action possible avec cette carte maintenant.</p>}
  </Sheet>
}
function Inspect({ view, id, onClose }: { view: View; id: string; onClose: () => void }) {
  const v = findVisible(view, id), card = display(view, v?.printingKey)
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key) }, [onClose])
  return <div className="play-inspect-backdrop" role="presentation" onClick={onClose}>
    <aside className="play-inspect" role="dialog" aria-modal="true" aria-label={`Inspection : ${card?.name ?? 'carte'}`} onClick={e => e.stopPropagation()}>
      <header><strong>{card?.name ?? 'Carte'}</strong><button type="button" className="play-close" aria-label="Fermer l’inspection" onClick={onClose}>×</button></header>
      <CardFace view={view} printingKey={v?.printingKey} power={v?.power} size="lg" />
      <p>{card?.text || 'Aucun effet.'}{card?.trigger ? <><br /><br />{card.trigger}</> : null}</p>
      <span className="piece-muted">{card ? `${card.number} · ${card.category}` : 'Carte visible'}</span>
    </aside>
  </div>
}
function ChoiceSheet({ view, action, send }: { view: View; action: Extract<View['legalActions'][number], { type: 'ANSWER_CHOICE' }>; send: Send }) {
  const [picked, setPicked] = useState<string[]>([])
  const ordering = action.choiceType === 'ORDER', options = action.options, source = view.choiceSource
  const allOrNone = 'allOrNone' in action && action.allOrNone === true
  const slot = (o: (typeof options)[number]) => 'slot' in o && o.slot ? o.slot.kind === 'MODE' ? `Option ${(o.slot.index ?? 0) + 1}` : o.slot.kind === 'DECK_TOP' ? 'Dessus du deck (sans la regarder)' : `${o.slot.kind === 'LIFE_TOP' ? 'Dessus' : 'Dessous'} des Vies ${o.slot.ownerId === view.seat ? '(vous)' : '(adversaire)'}` : null
  const label = (o: (typeof options)[number], i: number) => 'triggerId' in o ? `Effet ${i + 1}` : o.instanceId ? `${cardName(view, o.instanceId)}${slot(o) ? ` — ${slot(o)}` : ''}` : slot(o) ?? `Carte cachée ${i + 1}`
  const toggle = (token: string) => setPicked(p => p.includes(token) ? p.filter(t => t !== token) : ordering || action.max > 1 ? [...p, token] : [token])
  const valid = picked.length >= action.min && picked.length <= action.max && (!allOrNone || picked.length === 0 || picked.length === action.max)
  const title = ordering ? (action.max === 1 && options.some(o => 'triggerId' in o) ? 'Ordre de résolution' : 'Ordre des cartes (sous le deck, de haut en bas)') : action.max === 0 ? 'Aucune carte éligible' : `Choisissez ${action.min === action.max ? action.max : `jusqu’à ${action.max}`} carte${action.max > 1 ? 's' : ''}`
  return <Sheet title={title} wide>
    {source && <div className="play-source"><strong>{source.trigger ? '[Trigger] ' : ''}{source.name}</strong><p>{source.text}</p></div>}
    <p className="piece-muted play-consequence">{ordering ? 'Touchez les cartes dans l’ordre voulu.' : allOrNone ? `Choisissez les ${action.max} cartes, ou aucune : c’est tout ou rien.` : action.min === 0 ? 'Ce choix est facultatif : vous pouvez ne rien choisir.' : 'Ce choix est obligatoire.'}</p>
    <div className="play-pick-grid">{options.map((o, i) => {
      const instanceId = 'instanceId' in o ? o.instanceId : undefined, key = instanceId ? (findVisible(view, instanceId)?.printingKey ?? view.privateCards.options[instanceId]) : undefined
      const rank = picked.indexOf(o.token)
      return <button type="button" key={o.token} className={`play-pick${rank >= 0 ? ' picked' : ''}`} aria-pressed={rank >= 0} aria-label={label(o, i)} onClick={() => toggle(o.token)}>
        <CardFace view={view} printingKey={key} hidden={!key} size="sm" label={label(o, i)} /><span>{rank >= 0 && ordering ? `${rank + 1}. ` : ''}{label(o, i)}</span></button>
    })}</div>
    <div className="play-actions">
      {ordering && <button type="button" className="piece-button secondary" onClick={() => setPicked(options.map(o => o.token).slice(0, action.max))}>Ordre affiché</button>}
      <button type="button" className="piece-button" disabled={!valid} onClick={() => send({ type: 'ANSWER_CHOICE', choiceId: action.choiceId, tokens: picked })}>{action.min === 0 && !picked.length ? 'Ne rien choisir' : 'Valider'}</button>
    </div>
  </Sheet>
}
// ---------- zones ----------
function Pile({ label, count, children }: { label: string; count: number; children?: ReactNode }) {
  return <div className="tbl-pile" aria-label={`${label} : ${count}`} title={`${label} : ${count}`}>{children}<span className="tbl-count">{count}</span><small>{label}</small></div>
}
function LifeStack({ count, mine }: { count: number; mine: boolean }) {
  return <div className={`tbl-life${mine ? ' mine' : ''}`} aria-label={`${mine ? 'Vos' : 'Ses'} cartes de Vie : ${count}`} key={count}>
    <div className="tbl-life-cards">{Array.from({ length: Math.max(count, 0) }, (_, i) => <span key={i} style={{ ['--i' as string]: i }} />)}</div><strong>♥ {count}</strong>
  </div>
}
function DonArea({ view, seat, mine, bind }: { view: View; seat: ReturnType<typeof seats>['me']; mine: boolean; bind?: (s: DragSource) => Record<string, unknown> }) {
  const cost = seat.cost as Visible[], active = cost.filter(d => !d.rested), rested = cost.filter(d => d.rested)
  return <div className="tbl-don" aria-label={`DON!! ${mine ? 'disponibles' : 'du bot'} : ${active.length} actifs, ${rested.length} reposés, ${seat.counts.donDeck} dans le deck DON!!`}>
    <div className="tbl-don-zone"><span className="tbl-zone-label">Cost Area · DON!!</span><div className="tbl-don-chips" role="list" aria-label="DON!! dans la Cost Area">
      {active.map(d => mine && bind && draggable(view, 'don', d.id)
        ? <button type="button" key={d.id} className="tbl-don-token active draggable" aria-label="DON!! actif : glissez-le sur votre Leader ou un Personnage" {...bind({ kind: 'don', id: d.id, printingKey: null })}><DonCard /></button>
        : <span key={d.id} className="tbl-don-token active" role="listitem"><DonCard /></span>)}
      {rested.map(d => <span key={d.id} className="tbl-don-token rested" role="listitem"><DonCard /></span>)}
    </div></div>
    <small className="tbl-don-count"><strong>{active.length}</strong> actifs · <strong>{rested.length}</strong> reposés <span>· {seat.counts.donDeck} en réserve</span></small>
  </div>
}
// ---------- decision panels ----------
function BattlePanel({ view, act, send, busy }: { view: View; act: (intent: Intent, label: string) => void; send: Send; busy: boolean }) {
  const p = prompt(view), battle = view.projection.battle
  if (!battle || (p.kind !== 'counter' && p.kind !== 'block')) return null
  const attackPower = findVisible(view, battle.attacker)?.power ?? 0, defence = (findVisible(view, battle.target)?.power ?? 0) + (battle.counterBonus ?? 0), gap = attackPower - defence + 1000
  const hand = (seats(view).me.hand ?? []) as Visible[]
  const options = p.kind === 'counter' ? hand.flatMap(c => cardActions(view, c.id).filter(a => a.intent && ['counter', 'event', 'event-don', 'event-life'].includes(a.key)).map(a => ({ c, a }))) : []
  return <section className="tbl-decision" aria-label={p.kind === 'counter' ? 'Fenêtre de Counter' : 'Fenêtre de blocage'}>
    <p className="tbl-duel"><strong>{cardName(view, battle.attacker)}</strong> {attackPower} → <strong>{cardName(view, battle.target)}</strong> {defence}{gap > 0 ? <em> · il manque {gap}</em> : <em> · défense suffisante</em>}</p>
    {p.kind === 'block' && <div className="tbl-quick">{p.blockers.map(id => <button key={id} type="button" className="piece-button" disabled={busy} onClick={() => act({ type: 'ACTIVATE_BLOCKER', blockerId: id, battleId: p.battleId }, 'Blocage')}>Bloquer avec {cardName(view, id)} ({findVisible(view, id)?.power})</button>)}
      <button type="button" className="piece-button secondary" disabled={busy} onClick={() => send({ type: 'PASS_BLOCKER', battleId: p.battleId })}>Ne pas bloquer</button></div>}
    {p.kind === 'counter' && <div className="tbl-quick">{options.map(({ c, a }) => <button key={`${c.id}${a.key}`} type="button" className="piece-button" disabled={busy} onClick={() => a.intent && act(a.intent, a.label)}>{cardName(view, c.id)} : {a.label}</button>)}
      <button type="button" className="piece-button secondary" disabled={busy} onClick={() => send({ type: 'PASS_COUNTER', battleId: p.battleId })}>Passer</button></div>}
  </section>
}
function Stage({ step, view }: { step: AnimStep | null; view: View }) {
  if (!step) return null
  return <div className={`tbl-stage ${step.kind}${step.mine ? ' mine' : ' foe'}`} key={step.key} style={{ ['--d' as string]: `${step.duration}ms` }} data-anim={step.kind} aria-hidden>
    <div className="tbl-stage-cards">{step.cards.map((k, i) => <CardFace key={i} view={view} printingKey={k} hidden={!k} size="sm" />)}</div>
    <p>{step.text}</p>
  </div>
}
function Log({ entries, open, onClose }: { entries: LogEntry[]; open: boolean; onClose: () => void }) {
  if (!open) return null
  return <aside className={`tbl-log${open ? ' open' : ''}`} aria-label="Journal de combat">
    <button type="button" className="tbl-log-scrim" aria-label="Fermer le journal" onClick={onClose} />
    <section className="tbl-log-panel"><header><h2>Journal</h2><button type="button" className="play-close tbl-log-close" aria-label="Fermer le journal" onClick={onClose}>×</button></header>
      <ol>{[...entries].reverse().map(e => <li key={e.sequence} className={e.mine ? 'mine' : 'bot'}>{e.text}</li>)}</ol>
    </section>
  </aside>
}
// ---------- board ----------
export type BoardProps = { view: View; send: Send; busy: boolean; step: AnimStep | null; log: LogEntry[]; motion: 'auto' | 'reduced' | 'full'; reduced: boolean
  onMotion: (m: 'auto' | 'reduced' | 'full') => void; onConcede: () => void; onLeave: () => void; onNewGame: () => void; onSkipAnim: () => void; tutorial: TutorialState; onTutorial: (t: TutorialState) => void; stats: ReactNode }
export function Board({ view, send, busy, step, log, motion, reduced, onMotion, onConcede, onLeave, onNewGame, onSkipAnim, tutorial, onTutorial, stats }: BoardProps) {
  const { me, foe } = seats(view), p = prompt(view), battle = view.projection.battle
  const [selected, setSelected] = useState<string | null>(null)
  const [inspect, setInspect] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [confirm, setConfirm] = useState<null | { title: string; text: string; confirm: string; intent?: Intent; run?: () => void; danger?: boolean }>(null)
  useEffect(() => { setSelected(null) }, [view.version])
  const act = useCallback((intent: Intent, label: string) => {
    // Costly or irreversible choices are confirmed before anything is sent.
    if (intent.type === 'START_EFFECT' && Array.isArray(intent.donMinusIds)) setConfirm({ title: 'Renvoyer des DON!!', text: `${label}. Les ${intent.donMinusIds.length} DON!! choisis retournent dans le deck DON!! (reposés d’abord).`, confirm: 'Confirmer', intent })
    else send(intent)
  }, [send])
  const endTurn = () => pendingAttacks(view) ? setConfirm({ title: 'Terminer le tour ?', text: `Vous pouvez encore attaquer avec ${pendingAttacks(view)} carte(s).`, confirm: 'Terminer le tour', intent: { type: 'END_MAIN' } }) : send({ type: 'END_MAIN' })
  const accepts = useCallback((source: DragSource, target: string) => !!dropIntent(view, source, target), [view])
  const gestures = useGestures(useMemo(() => ({
    tap: (id: string) => setSelected(id), inspect: (id: string) => { setLogOpen(false); setInspect(id) }, accepts,
    drop: (source: DragSource, target: string) => { const intent = dropIntent(view, source, target); if (intent) act(intent, 'Glisser-déposer') },
  }), [view, accepts, act]))
  const drag = gestures.drag
  const actable = useMemo(() => new Set([...((me.hand ?? []) as Visible[]), ...(me.leader as Visible[]), ...(me.characters as Visible[])].filter(c => cardActions(view, c.id).length).map(c => c.id)), [view, me])
  const hand = (me.hand ?? []) as Visible[]
  const fan = handFanLayout(hand.length)
  const canDrop = (id: string) => !!drag && !!dropIntent(view, drag, id)
  const inspectOnHover = (id: string) => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      setLogOpen(false)
      setInspect(id)
    }
  }
  const clearHoverInspect = (id: string) => setInspect(current => current === id ? null : current)
  const myTurn = view.projection.activePlayerId === view.seat
  const result = view.projection.result as { reason: string; winnerId: string | null } | null
  const slot = (v: Visible, owner: 'me' | 'foe', leader = false) => {
    const canAttack = owner === 'me' && draggable(view, 'attacker', v.id)
    return <button type="button" key={v.id} data-card={v.id} data-drop={v.id}
      className={`play-slot${leader ? ' leader' : ''}${actable.has(v.id) ? ' can-act' : ''}${battle?.target === v.id ? ' targeted' : ''}${battle?.attacker === v.id ? ' attacking' : ''}${canDrop(v.id) ? ' drop-ok' : ''}${drag?.over === v.id ? ' drop-over' : ''}${step?.ids.includes(v.id) ? ` fx-${step.kind}` : ''}${canAttack ? ' draggable' : ''}`}
      aria-label={`${leader ? (owner === 'me' ? 'Votre Leader : ' : 'Leader du bot : ') : ''}${cardName(view, v.id)}${v.power !== null ? `, puissance ${v.power}` : ''}${v.rested ? ', épuisé' : ''}`}
      onMouseEnter={() => inspectOnHover(v.id)} onMouseLeave={() => clearHoverInspect(v.id)}
      {...gestures.bind({ kind: 'attacker', id: v.id, printingKey: v.printingKey, fixed: !canAttack })}>
      <CardFace view={view} printingKey={v.printingKey} rested={v.rested} power={v.power} attached={attachedCount(owner === 'me' ? me : foe, v.id)} size={leader ? 'md' : 'sm'} />
      {!!attachedCount(owner === 'me' ? me : foe, v.id) && <span className="tbl-attached-don" aria-label={`${attachedCount(owner === 'me' ? me : foe, v.id)} DON!! attach${attachedCount(owner === 'me' ? me : foe, v.id) > 1 ? 'és' : 'é'}`}>
        {Array.from({ length: attachedCount(owner === 'me' ? me : foe, v.id) }, (_, i) => <DonCard key={i} small />)}
      </span>}</button>
  }
  const trashTop = (seat: typeof me) => (seat.trash as Visible[]).at(-1)
  const piles = (seat: typeof me) => <div className="tbl-piles">
    <Pile label="Deck" count={seat.counts.deck}><div className="play-card back xs" /></Pile>
    <Pile label="Défausse" count={seat.counts.trash}>{trashTop(seat) ? <CardFace view={view} printingKey={trashTop(seat)!.printingKey} size="xs" /> : <div className="tbl-empty-slot" />}</Pile>
    <Pile label="DON!! Deck" count={seat.counts.donDeck}><div className="play-card back xs don-deck-back"><span>DON!!</span></div></Pile>
  </div>
  const stageZone = (seat: typeof me, owner: 'me' | 'foe') => <div className="tbl-stage-zone" aria-label={`Zone Stage ${owner === 'me' ? 'du joueur' : 'du bot'}`}>
    <small className="tbl-zone-label">Stage</small>{(seat.stage as Visible[]).map(stage => slot(stage, owner))}
    {!seat.stage.length && <span className="tbl-stage-empty" aria-hidden>◇</span>}
  </div>
  const characterArea = (seat: typeof me, owner: 'me' | 'foe') => {
    const characters = seat.characters as Visible[]
    return <div className="tbl-character-area" aria-label={`Zone Personnages ${owner === 'me' ? 'du joueur' : 'du bot'}`}>
      <div className="tbl-character-heading"><span className="tbl-zone-label">Personnages</span><small>{characters.length}/5</small></div>
      <div className="tbl-character-grid" role="group" aria-label={`Emplacements Personnages ${owner === 'me' ? 'du joueur' : 'du bot'}`}>
        {characterPositions(characters).map((position, index) => position.kind === 'card'
          ? slot(position.card, owner)
          : <span className="tbl-character-empty" key={`empty-${index}`} aria-hidden="true" />)}
      </div>
    </div>
  }
  const leaderZone = (seat: typeof me, owner: 'me' | 'foe') => <div className="tbl-leader-zone" aria-label={`Zone Leader ${owner === 'me' ? 'du joueur' : 'du bot'}`}>
    <small className="tbl-zone-label">Leader</small>
    {(seat.leader as Visible[]).map(leader => slot(leader, owner, true))}
  </div>
  const utilityZones = (seat: typeof me, owner: 'me' | 'foe') => <div className="tbl-side-utility">
    {stageZone(seat, owner)}
    <div className="tbl-stack-col">
      {owner === 'foe' && <div className="tbl-hand-foe" aria-label={`Main du bot : ${seat.counts.hand} cartes`}>{Array.from({ length: Math.min(seat.counts.hand, 10) }, (_, i) => <span key={i} />)}<small>{seat.counts.hand}</small></div>}
      {piles(seat)}
    </div>
  </div>
  const sideAnchor = (seat: typeof me, owner: 'me' | 'foe') => <div className="tbl-side-anchor">
    <LifeStack count={seat.counts.life} mine={owner === 'me'} />
    {leaderZone(seat, owner)}
  </div>
  return <div className={`play-board${busy ? ' busy' : ''}${myTurn ? ' my-turn' : ''}`} data-version={view.version} data-motion={reduced ? 'reduced' : 'full'}>
    <header className="tbl-top">
      <button type="button" className="play-icon" aria-label="Quitter la table" onClick={onLeave}>‹</button>
      <div className="play-turn" aria-live="polite"><strong>{myTurn ? 'Votre tour' : 'Tour du bot'}</strong><span>Tour {view.projection.turn} · {PHASES[view.projection.phase] ?? view.projection.phase}</span></div>
      <span className="tbl-level" title="Difficulté du bot">{LEVELS[view.botLevel] ?? view.botLevel}</span>
      <button type="button" className="play-icon tbl-log-toggle" aria-label="Journal de combat" aria-expanded={logOpen} onClick={() => { const next = !logOpen; if (next) setInspect(null); setLogOpen(next) }}>☰</button>
      <button type="button" className="play-icon" aria-label="Menu de la partie" onClick={() => setMenu(true)}>⋯</button>
    </header>
    <main className="play-surface" aria-label="Plateau de jeu">
    <div className="tbl-main">
      <div className="tbl-field">
        <section className="play-side foe tbl-side" aria-label="Terrain du bot">
          <div className="tbl-side-core">
            {sideAnchor(foe, 'foe')}
            {characterArea(foe, 'foe')}
            {utilityZones(foe, 'foe')}
          </div>
          <DonArea view={view} seat={foe} mine={false} />
        </section>
        <div className="tbl-center" aria-live="polite">
          {battle ? <p className="play-battle"><strong>{cardName(view, battle.attacker)}</strong> attaque <strong>{cardName(view, battle.target)}</strong> · {BATTLE_STEPS[battle.step] ?? battle.step}{battle.counterBonus ? ` · Counter +${battle.counterBonus}` : ''}</p>
            : <p className="play-hint">{p.kind === 'main' ? 'Glissez une carte vers le haut pour la jouer, ou touchez-la. Appui long : inspecter.' : p.kind === 'wait' ? 'Le bot joue…' : ' '}</p>}
          <Stage step={step} view={view} />
          {step && <button type="button" className="tbl-skip" onClick={onSkipAnim} aria-label="Passer l’animation">⏩</button>}
        </div>
        <section className={`play-side me tbl-side${canDrop(FIELD_DROP) ? ' drop-ok' : ''}${drag?.over === FIELD_DROP ? ' drop-over' : ''}`} aria-label="Votre terrain" data-drop={FIELD_DROP}>
          <div className="tbl-side-core">
            {sideAnchor(me, 'me')}
            {characterArea(me, 'me')}
            {utilityZones(me, 'me')}
          </div>
          <DonArea view={view} seat={me} mine bind={gestures.bind} />
        </section>
      </div>
      <Log entries={log} open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
    <BattlePanel view={view} act={act} send={send} busy={busy} />
    <section className="play-hand" aria-label={`Votre main : ${(me.hand ?? []).length} cartes`}>
      <div className="play-hand-track">
        <div className="play-hand-fan">{hand.map((c, index) => <button type="button" key={c.id} data-card={c.id} className={`play-hand-card${actable.has(c.id) ? ' can-act' : ''}${drag?.id === c.id ? ' dragging' : ''}${selected === c.id ? ' selected' : ''}`} aria-label={cardName(view, c.id)}
          style={{ '--fan-angle': `${fan[index]?.angle ?? 0}deg`, '--fan-offset': `${fan[index]?.offsetY ?? 0}px`, '--fan-overlap': `${fan[index]?.overlap ?? 0}px` } as CSSProperties}
          onMouseEnter={() => inspectOnHover(c.id)} onMouseLeave={() => clearHoverInspect(c.id)}
          {...gestures.bind({ kind: 'hand', id: c.id, printingKey: c.printingKey, fixed: !draggable(view, 'hand', c.id) })}>
          <CardFace view={view} printingKey={c.printingKey} size="md" /></button>)}</div>
      </div>
    </section>
    <footer className="play-dock">
      {p.kind === 'main' && <button type="button" className="piece-button" disabled={busy} onClick={endTurn}>Fin du tour</button>}
      {p.kind === 'block' && <span className="play-dock-text">{p.blockers.length ? 'Bloquer ? Choisissez un bloqueur ci-dessus.' : 'Aucun bloqueur disponible.'}</span>}
      {p.kind === 'counter' && <span className="play-dock-text">Counter ? Choisissez ci-dessus, ou glissez une carte sur la cible.</span>}
      {p.kind === 'resolve' && <button type="button" className="piece-button" disabled={busy} onClick={() => send({ type: 'RESOLVE_BATTLE', battleId: p.battleId })}>Résoudre le combat</button>}
      {p.kind === 'continue' && <button type="button" className="piece-button" disabled={busy} onClick={() => send({ type: 'CONTINUE_LIFE_DAMAGE', battleId: p.battleId })}>Continuer les dégâts</button>}
      {(p.kind === 'wait' || p.kind === 'advance') && <span className="play-dock-text">{p.kind === 'advance' ? `${PHASES[view.projection.phase] ?? ''}…` : 'En attente…'}</span>}
    </footer>
    </main>
    {drag && <div className={`tbl-ghost${drag.over ? ' ok' : ''}`} style={{ left: drag.x, top: drag.y }} aria-hidden>{drag.kind === 'don' ? <span className="tbl-chip active">DON</span> : <CardFace view={view} printingKey={drag.printingKey} size="sm" />}</div>}
    {inspect && <Inspect view={view} id={inspect} onClose={() => setInspect(null)} />}
    {selected && p.kind !== 'choice' && !confirm && <CardSheet key={selected} view={view} id={selected} act={act} onClose={() => setSelected(null)} />}
    {p.kind === 'choice' && <ChoiceSheet key={p.action.choiceId} view={view} action={p.action} send={send} />}
    {p.kind === 'first' && <Sheet title="Qui commence ?"><p className="piece-muted">Vous avez gagné le tirage : choisissez de jouer en premier ou en second. Le premier joueur ne pioche pas et ne reçoit qu’un DON!! au premier tour.</p><div className="play-actions">
      <button type="button" className="piece-button" onClick={() => send({ type: 'CHOOSE_FIRST', choice: 'FIRST' })}>Jouer en premier</button>
      <button type="button" className="piece-button secondary" onClick={() => send({ type: 'CHOOSE_FIRST', choice: 'SECOND' })}>Jouer en second</button></div></Sheet>}
    {p.kind === 'mulligan' && <Sheet title="Votre main de départ" wide><div className="play-hand inline">{((me.hand ?? []) as Visible[]).map(c => <div key={c.id} className="play-hand-card"><CardFace view={view} printingKey={c.printingKey} size="md" /></div>)}</div>
      <p className="piece-muted">Vous pouvez repiocher une seule fois : votre main retourne dans le deck, qui est mélangé.</p>
      <div className="play-actions"><button type="button" className="piece-button" onClick={() => send({ type: 'MULLIGAN', redraw: false })}>Garder</button><button type="button" className="piece-button secondary" onClick={() => send({ type: 'MULLIGAN', redraw: true })}>Repiocher 5 cartes</button></div></Sheet>}
    {p.kind === 'trigger' && <Sheet title="[Trigger] révélé"><div className="play-detail"><CardFace view={view} printingKey={view.privateCards.lifeTrigger} size="lg" /><div className="play-detail-text"><p className="play-rules">{display(view, view.privateCards.lifeTrigger)?.trigger || 'Cette carte de Vie a un [Trigger].'}</p>
      <p className="piece-muted">Activer : l’effet [Trigger] se résout. Sinon, la carte va dans votre main.</p></div></div>
      <div className="play-actions"><button type="button" className="piece-button" onClick={() => send({ type: 'ANSWER_TRIGGER', choiceId: p.choiceId, activate: true })}>Activer le Trigger</button><button type="button" className="piece-button secondary" onClick={() => send({ type: 'ANSWER_TRIGGER', choiceId: p.choiceId, activate: false })}>Ajouter à la main</button></div></Sheet>}
    {confirm && <Confirm title={confirm.title} text={confirm.text} confirm={confirm.confirm} danger={confirm.danger} onCancel={() => setConfirm(null)} onConfirm={() => { const c = confirm; setConfirm(null); if (c.intent) send(c.intent); c.run?.() }} />}
    {menu && <Sheet title="Partie" onClose={() => setMenu(false)}>
      <fieldset className="tbl-motion"><legend>Animations</legend>{(['auto', 'full', 'reduced'] as const).map(m => <label key={m}><input type="radio" name="motion" checked={motion === m} onChange={() => onMotion(m)} /> {m === 'auto' ? 'Selon le système' : m === 'full' ? 'Complètes' : 'Réduites'}</label>)}</fieldset>
      <div className="play-actions">
        <button type="button" className="piece-button secondary" onClick={() => { setMenu(false); onTutorial({ active: true, step: 0 }) }}>Relancer le tutoriel</button>
        <button type="button" className="piece-button secondary" onClick={() => { setMenu(false); onLeave() }}>Quitter (la partie reste sauvegardée)</button>
        {view.status === 'ACTIVE' && <button type="button" className="piece-button danger" onClick={() => { setMenu(false); setConfirm({ title: 'Abandonner la partie ?', text: 'L’abandon compte comme une défaite (règle officielle 1-2-3).', confirm: 'Abandonner', danger: true, run: onConcede }) }}>Abandonner la partie</button>}
      </div></Sheet>}
    {tutorial.active && p.kind !== 'over' && <Tutorial view={view} state={tutorial} onChange={onTutorial} />}
    {p.kind === 'over' && result && (!step || step.kind === 'result') && <div className="play-result" role="dialog" aria-modal="true" aria-label="Fin de partie">
      <div className={`play-result-card ${result.winnerId === view.seat ? 'win' : 'loss'}`}><p className="piece-eyebrow">Fin de partie · bot {LEVELS[view.botLevel] ?? ''}</p><h2>{result.winnerId === view.seat ? 'Victoire !' : 'Défaite'}</h2><p>{RESULTS[result.reason] ?? result.reason}</p>
        {stats}
        <div className="play-actions"><button type="button" className="piece-button" onClick={onNewGame}>Nouvelle partie</button><button type="button" className="piece-button secondary" onClick={onLeave}>Retour à l’accueil</button></div></div></div>}
  </div>
}
