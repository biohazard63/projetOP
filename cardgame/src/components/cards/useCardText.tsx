'use client'
import { useEffect, useState } from 'react'
import { Languages } from 'lucide-react'

type FrenchText = { effect: string | null; trigger: string | null; source: 'official' | 'unofficial' }
// One request per card for the whole visit (null: the card has no French text, its original is shown).
const cache = new Map<string, Promise<FrenchText | null>>()
const load = (id: string) => {
  if (!cache.has(id)) cache.set(id, fetch(`/api/cards/text?ids=${encodeURIComponent(id)}`).then(r => r.ok ? r.json() : null).then(d => (d?.texts?.[id] as FrenchText | undefined) ?? null).catch(() => { cache.delete(id); return null }))
  return cache.get(id)!
}

/** Effect and trigger to show: French when there is a French text, the original otherwise (or on demand, « VO »). */
export function useCardText(card: { id: string; effect?: string | null; trigger?: string | null } | null) {
  const [fr, setFr] = useState<{ id: string; text: FrenchText | null } | null>(null)
  const [original, setOriginal] = useState(false)
  const id = card?.id
  useEffect(() => {
    if (!id) return
    let live = true
    setOriginal(false)
    void load(id).then(text => { if (live) setFr({ id, text }) })
    return () => { live = false }
  }, [id])
  const text = fr && fr.id === id ? fr.text : null
  const shown = text && !original ? text : null
  return { effect: shown ? shown.effect : card?.effect ?? null, trigger: shown ? shown.trigger : card?.trigger ?? null, source: text?.source ?? null, original, setOriginal }
}

/** Under a translated text: only a « Voir la VO / Voir la VF » switch (the source is given in its tooltip). */
export function CardTextSource({ source, original, onToggle, className = '' }: { source: 'official' | 'unofficial' | null; original: boolean; onToggle: (original: boolean) => void; className?: string }) {
  if (!source) return null
  return <p className={`card-text-source ${className}`}>
    <button type="button" onClick={() => onToggle(!original)} title={source === 'official' ? 'Texte de l’impression française officielle' : 'Traduction non officielle du texte anglais'}>
      <Languages size={13} aria-hidden="true" />{original ? 'Voir la VF' : 'Voir la VO'}
    </button>
  </p>
}
