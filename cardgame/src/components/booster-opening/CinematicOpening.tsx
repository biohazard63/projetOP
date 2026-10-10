'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import BoosterArtwork from './BoosterArtwork'
import { useCollectorPreferences } from '@/components/collector/Preferences'
import { useOpeningPresentation } from '@/components/collector/OpeningPresentation'
import styles from './CinematicOpening.module.css'
export const CINEMATIC_DURATION = 3400
export default function CinematicOpening({ imageUrl, setName, cardCount, onComplete }: { imageUrl: string | null; setName: string; cardCount: number; onComplete: () => void }) {
  const { setCinematic } = useOpeningPresentation()
  useEffect(() => { setCinematic(true); return () => setCinematic(false) }, [setCinematic])
  const settings=useCollectorPreferences()
  const [phase,setPhase]=useState(0)
  const [reduced,setReduced]=useState<boolean | null>(null)
  const complete=useRef(onComplete)
  useEffect(()=>{complete.current=onComplete},[onComplete])
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)')
    const update=()=>setReduced(media.matches)
    update();media.addEventListener('change',update)
    return ()=>media.removeEventListener('change',update)
  },[])
  useEffect(()=>{
    if(reduced === null) return
    if(reduced || !settings.animations){const timeout=setTimeout(()=>complete.current(),0);return ()=>clearTimeout(timeout)}
    const timers=[setTimeout(()=>setPhase(1),1000),setTimeout(()=>setPhase(2),1800),setTimeout(()=>setPhase(3),2600),setTimeout(()=>complete.current(),CINEMATIC_DURATION)]
    return ()=>timers.forEach(clearTimeout)
  },[reduced,settings.animations])
  return <div data-testid="pack-animation" className={styles.scene} data-phase={phase} data-reduced={reduced || settings.reducedEffects} aria-label="Cinématique d’ouverture">
    <div className={styles.lightBlue} /><div className={styles.lightGold} /><div className={styles.orbit} />
    <div className={styles.camera}><div className={styles.pack}>
      <div className={styles.packBody}><BoosterArtwork src={imageUrl} alt={`Booster ${setName}`} /></div>
      <div className={styles.packTop} aria-hidden="true"><BoosterArtwork src={imageUrl} alt="" /></div>
      <div className={styles.foil} /><div className={styles.innerLight} />
    </div><div className={styles.cards} aria-hidden="true">{Array.from({length:Math.min(5,cardCount)},(_,i)=><div className={styles.emergingCard} key={i} style={{'--card-index':i} as React.CSSProperties}><Image src="/images/card-back.jpg" alt="" width={90} height={126} /></div>)}</div></div>
    {!settings.reducedEffects && <div className={styles.particles} aria-hidden="true">{Array.from({length:16},(_,i)=><i key={i} style={{'--particle-index':i} as React.CSSProperties} />)}</div>}
    <div className={styles.caption}><p className="piece-eyebrow">{setName}</p><p aria-live="polite">{['Un trésor vous attend…','Le voyage commence.','Votre équipage prend forme.','À vous de les découvrir.'][phase]}</p><button className="piece-button secondary mt-4" onClick={()=>complete.current()}>Passer l’animation</button></div>
  </div>
}
