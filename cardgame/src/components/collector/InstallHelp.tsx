'use client'
import { useEffect, useState } from 'react'
export function InstallHelp() {
  const [ios,setIos]=useState(false)
  const [standalone,setStandalone]=useState(false)
  useEffect(()=>{
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1))
    setStandalone(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  },[])
  return <details className="piece-install-help"><summary>Installer Mugiwara sur mon appareil</summary><p className="piece-muted">{standalone?'Mugiwara est déjà ouvert en mode application.':ios?'Dans Safari, ouvrez Partager puis « Sur l’écran d’accueil ». Confirmez avec Ajouter.':'Dans le menu du navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil » lorsque cette option est disponible.'}</p><p className="piece-muted">Les actions de collection nécessitent une connexion. L’installation dépend du navigateur ; elle ne correspond pas à une publication sur les stores.</p></details>
}
