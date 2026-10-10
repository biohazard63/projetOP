'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import BoosterArtwork from './BoosterArtwork'
import { useCollectorPreferences } from '@/components/collector/Preferences'
import { useOpeningPresentation } from '@/components/collector/OpeningPresentation'
import { animationDuration } from '@/lib/boosters/presentation'
import styles from './CinematicOpening.module.css'
export const CINEMATIC_DURATION = 3400
export default function CinematicOpening({ imageUrl, setName, cardCount, onComplete, returnHref = '/boosters' }: { returnHref?: string; imageUrl: string | null; setName: string; cardCount: number; onComplete: () => void }) {
  const { setCinematic } = useOpeningPresentation()
  useEffect(() => { setCinematic(true); return () => setCinematic(false) }, [setCinematic])
  const settings=useCollectorPreferences()
  const [phase,setPhase]=useState(0)
  const [started,setStarted]=useState(false)
  const pointer=useRef<{x:number;y:number}|null>(null)
  const duration=animationDuration(settings.openingSpeed,settings.quickOpening)
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
    if(reduced === null || !started) return
    if(reduced || !settings.animations){const timeout=setTimeout(()=>complete.current(),0);return ()=>clearTimeout(timeout)}
    const timers=[setTimeout(()=>setPhase(1),duration*.29),setTimeout(()=>setPhase(2),duration*.53),setTimeout(()=>setPhase(3),duration*.76),setTimeout(()=>complete.current(),duration)]
    return ()=>timers.forEach(clearTimeout)
  },[reduced,settings.animations,started,duration])
  return <div data-testid="pack-animation" className={styles.scene} data-started={started} style={{ '--opening-duration': `${duration}ms` } as React.CSSProperties} data-phase={phase} data-reduced={reduced || settings.reducedEffects} aria-label="Cinématique d’ouverture" onDragStart={e=>e.preventDefault()} onPointerDown={e=>{pointer.current={x:e.clientX,y:e.clientY}}} onPointerMove={e=>{const start=pointer.current;if(start && (Math.abs(start.y-e.clientY)>10 || Math.abs(start.x-e.clientX)>10))e.currentTarget.setPointerCapture(e.pointerId)}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);const start=pointer.current;pointer.current=null;if(start && (start.y-e.clientY>45 || Math.abs(start.x-e.clientX)>60))setStarted(true)}} onPointerCancel={()=>{pointer.current=null}}>
    <Link href={returnHref} className={styles.back} aria-label="Retour aux boosters"><ChevronLeft size={22} /></Link>
    {!started && <button type="button" className={styles.gesture} onClick={()=>setStarted(true)}>Glisse pour ouvrir <span>↑</span><small>Ou touchez le paquet</small></button>}
    <div className={styles.lightBlue} /><div className={styles.lightGold} /><div className={styles.orbit} />
    <div data-opening-camera className={styles.camera} aria-hidden={!started} onClick={()=>setStarted(true)}><div className={styles.pack}>
      <div className={styles.packBody}><BoosterArtwork src={imageUrl} alt={`Booster ${setName}`} /></div>
      <div className={styles.packTop} aria-hidden="true"><BoosterArtwork src={imageUrl} alt="" /></div>
      <div className={styles.foil} /><div className={styles.innerLight} />
    </div><div className={styles.cards} aria-hidden="true">{Array.from({length:Math.min(5,cardCount)},(_,i)=><div className={styles.emergingCard} key={i} style={{'--card-index':i} as React.CSSProperties}><Image src="/images/card-back.jpg" alt="" width={90} height={126} /></div>)}</div></div>
    {!settings.reducedEffects && <div className={styles.particles} aria-hidden="true">{Array.from({length:16},(_,i)=><i key={i} style={{'--particle-index':i} as React.CSSProperties} />)}</div>}
    <div className={styles.caption}><p className="piece-eyebrow">{setName}</p><p aria-live="polite">{['Votre résultat est enregistré.','Le voyage commence.','Votre équipage prend forme.','À vous de les découvrir.'][phase]}</p><button className="piece-button secondary mt-4" onClick={()=>complete.current()}>Passer l’animation</button></div>
  </div>
}
