'use client'
import { useEffect } from 'react'
import type { View } from './api'

// M5-5 interactive tutorial: coach marks over a real game. Steps that ask for an action advance when the
// matching CONFIRMED event of the player appears; the others advance with "Suivant". Skippable, relaunchable.
export type TutorialState = { active: boolean; step: number; since?: number }
type Step = { id: string; title: string; text: string; doneOn?: string }
export const TUTORIAL_STEPS: Step[] = [
  { id: 'leader', title: 'Votre Leader et vos Vies', text: 'En bas, votre Leader. À côté, la pile ♥ : vos cartes de Vie. Chaque coup reçu par votre Leader vous fait prendre une Vie en main.' },
  { id: 'don', title: 'Les DON!!', text: 'Les jetons DON!! paient le coût des cartes. Vous en recevez à chaque tour. Un DON!! actif peut aussi être glissé sur votre Leader ou un Personnage : +1000 de puissance pendant votre tour.' },
  { id: 'play', title: 'Jouer un Personnage', text: 'Glissez vers le haut une carte surlignée de votre main jusqu’au terrain, ou touchez-la puis « Jouer ». Son coût est payé en DON!!.', doneOn: 'CARD_PLAYED' },
  { id: 'attack', title: 'Attaquer', text: 'À partir de votre deuxième tour, glissez votre Leader ou un Personnage actif sur le Leader adverse (ou touchez-le puis « Attaquer »).', doneOn: 'ATTACK_DECLARED' },
  { id: 'counter', title: 'Le Counter', text: 'Quand le bot attaque, la fenêtre de Counter s’ouvre : jouez une carte de votre main pour ajouter sa valeur Counter à la carte attaquée. Il faut une puissance strictement supérieure pour bloquer les dégâts.' },
  { id: 'blocker', title: 'Le Blocker', text: 'Un Personnage [Blocker] actif peut s’interposer : il devient la cible de l’attaque à la place de votre Leader.' },
  { id: 'end', title: 'Fin du tour', text: 'Quand vous avez fini, touchez « Fin du tour » : le bot joue alors son tour.', doneOn: 'TURN_ENDED' },
  { id: 'win', title: 'Gagner la partie', text: 'Vous gagnez quand le Leader adverse est touché alors qu’il n’a plus de Vie, ou si l’adversaire n’a plus de cartes dans son deck. Bonne partie !' },
]
export const TUTORIAL_KEY = 'mugiwara:play:tutorial'
export function Tutorial({ view, state, onChange }: { view: View; state: TutorialState; onChange: (s: TutorialState) => void }) {
  const step = TUTORIAL_STEPS[state.step]
  const last = view.projection.events.at(-1)?.sequence ?? -1
  useEffect(() => {
    if (!step?.doneOn) return
    const since = state.since ?? last
    if (state.since === undefined) { onChange({ ...state, since }); return }
    if (view.projection.events.some(e => e.sequence > since && e.type === step.doneOn && e.actorId === view.seat)) onChange({ active: true, step: state.step + 1, since: last })
  }, [view, step, state, last, onChange])
  if (!step) return null
  const finish = (value: 'done' | 'skipped') => { try { localStorage.setItem(TUTORIAL_KEY, value) } catch { /* storage may be unavailable */ } onChange({ active: false, step: 0 }) }
  return <section className="tbl-coach" role="dialog" aria-modal="false" aria-label={`Tutoriel : ${step.title}`}>
    <p className="piece-eyebrow">Tutoriel · {state.step + 1}/{TUTORIAL_STEPS.length}</p>
    <h2>{step.title}</h2><p>{step.text}</p>
    <div className="tbl-coach-actions">
      <button type="button" className="piece-button ghost" onClick={() => finish('skipped')}>Passer le tutoriel</button>
      {state.step === TUTORIAL_STEPS.length - 1 ? <button type="button" className="piece-button" onClick={() => finish('done')}>Terminer</button>
        : <button type="button" className="piece-button secondary" onClick={() => onChange({ active: true, step: state.step + 1, since: last })}>{step.doneOn ? 'Plus tard' : 'Suivant'}</button>}
    </div>
  </section>
}
