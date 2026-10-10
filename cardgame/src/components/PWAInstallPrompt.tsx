'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Download, RefreshCw, X } from 'lucide-react'
import { useOpeningPresentation } from '@/components/collector/OpeningPresentation'
interface InstallEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
export function PWAInstallPrompt() {
  const pathname=usePathname()
  const {data:session}=useSession()
  const {cinematic}=useOpeningPresentation()
  const [prompt,setPrompt]=useState<InstallEvent|null>(null)
  const [updateHidden,setUpdateHidden]=useState(false)
  const [waiting,setWaiting]=useState<ServiceWorker|null>(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  useEffect(()=>{
    let disposed=false
    let registration:ServiceWorkerRegistration|undefined
    let installing:ServiceWorker|null=null
    const inspect=()=>{if(!disposed && registration?.waiting && navigator.serviceWorker.controller){setWaiting(registration.waiting);setUpdateHidden(false)}}
    const state=()=>inspect()
    const update=()=>{installing=registration?.installing || null;installing?.addEventListener('statechange',state);inspect()}
    if(process.env.NODE_ENV==='production' && 'serviceWorker' in navigator){
      void navigator.serviceWorker.register('/sw.js').then(reg=>{if(disposed)return;registration=reg;inspect();registration.addEventListener('updatefound',update)}).catch(()=>{/* Browser continues online without service worker. */})
    }
    const install=(event:Event)=>{
      event.preventDefault()
      if(window.matchMedia('(display-mode: standalone)').matches)return
      try{if(localStorage.getItem('pwa-install-refused'))return}catch{/* Optional preference. */}
      setPrompt(event as InstallEvent)
    }
    const installed=()=>setPrompt(null)
    window.addEventListener('beforeinstallprompt',install);window.addEventListener('appinstalled',installed)
    return ()=>{disposed=true;registration?.removeEventListener('updatefound',update);installing?.removeEventListener('statechange',state);window.removeEventListener('beforeinstallprompt',install);window.removeEventListener('appinstalled',installed)}
  },[])
  function dismiss(){setPrompt(null);try{localStorage.setItem('pwa-install-refused','true')}catch{/* Temporary dismissal when storage unavailable. */}}
  async function install(){if(!prompt)return;setBusy(true);setError('');try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='dismissed')dismiss();else setPrompt(null)}catch{setError('Installation indisponible. Utilisez le menu de votre navigateur.')}finally{setBusy(false)}}
  function applyUpdate(){
    if(!waiting || cinematic || pathname==='/booster-opening')return
    try{
      const intent=session?.user?.id ? JSON.parse(sessionStorage.getItem(`op:booster:${session.user.id}`) || 'null') : null
      if(intent && !intent.openingId){setError('Une ouverture reste à confirmer. Récupérez-la avant de mettre à jour.');return}
    }catch{setError('La reprise d’ouverture ne peut pas être vérifiée. Rechargez uniquement après confirmation de votre ouverture.');return}
    setBusy(true)
    const reload=()=>{
      if(['/booster-opening','/opening-demo'].includes(window.location.pathname) || document.querySelector('[data-testid=pack-animation]')){setBusy(false);return}
      try{
        const latest=session?.user?.id ? JSON.parse(sessionStorage.getItem(`op:booster:${session.user.id}`) || 'null') : null
        if(latest && !latest.openingId){setBusy(false);setError('Rechargement reporté : une ouverture reste à confirmer.');return}
      }catch{setBusy(false);setError('Rechargement reporté : reprise d’ouverture non vérifiable.');return}
      window.location.reload()
    }
    if(waiting.state==='activated'){reload();return}
    navigator.serviceWorker.addEventListener('controllerchange',reload,{once:true})
    waiting.postMessage({type:'MUGIWARA_SKIP_WAITING'})
  }
  if((waiting && updateHidden) || cinematic || pathname==='/booster-opening' || pathname==='/opening-demo' || (!prompt && !waiting))return null
  return <aside className="piece-pwa-prompt" aria-label={waiting?'Mise à jour de Mugiwara':'Installation de Mugiwara'}><div><strong>{waiting?'Une nouvelle escale est prête':'Mugiwara sur votre écran d’accueil'}</strong><p className="piece-muted">{waiting?'Appliquez la mise à jour quand aucune ouverture n’est en cours.':'Installez l’application depuis votre navigateur compatible.'}</p></div>{error&&<p role="alert" className="piece-error">{error}</p>}<div className="piece-actions">{waiting?<button className="piece-button" disabled={busy} onClick={applyUpdate}><RefreshCw size={16}/>Mettre à jour</button>:<button className="piece-button" disabled={busy} onClick={()=>void install()}><Download size={16}/>Installer</button>}<button className="piece-button secondary" onClick={()=>waiting?setUpdateHidden(true):dismiss()} aria-label={waiting?'Reporter la mise à jour':'Reporter l’installation'}><X size={18}/>Plus tard</button></div></aside>
}
