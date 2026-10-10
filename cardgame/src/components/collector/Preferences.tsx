'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
type Preferences = { animations: boolean; vibrations: boolean; reducedEffects: boolean; density: 'comfortable' | 'compact' }
const defaults: Preferences = { animations: true, vibrations: false, reducedEffects: false, density: 'comfortable' }
const Context = createContext<Preferences & { update: (patch: Partial<Preferences>) => void; storageAvailable: boolean; ready: boolean }>({ ...defaults, update: () => {}, storageAvailable: true, ready: false })
export function CollectorPreferencesProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const key = `mugiwara:display:${session?.user?.id || 'guest'}`
  const [settings, setSettings] = useState(defaults)
  const [loadedKey, setLoadedKey] = useState<string|null>(null)
  const ready=status!=='loading' && loadedKey===key
  const [storageAvailable, setStorageAvailable] = useState(true)
  useEffect(() => {
    if(status==='loading')return
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '{}')
      setSettings({ animations: typeof stored.animations === 'boolean' ? stored.animations : true,
        vibrations: typeof stored.vibrations === 'boolean' ? stored.vibrations : false,
        reducedEffects: typeof stored.reducedEffects === 'boolean' ? stored.reducedEffects : false,
        density: stored.density === 'compact' ? 'compact' : 'comfortable' })
      setStorageAvailable(true)
    } catch { setSettings(defaults); setStorageAvailable(false) }
    setLoadedKey(key)
  }, [key,status])
  function update(patch: Partial<Preferences>) {
    if(!ready)return
    const next = { ...settings, ...patch }; setSettings(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { setStorageAvailable(false) }
  }
  return <Context.Provider value={{ ...settings, update, storageAvailable, ready }}><div data-visual-effects={settings.reducedEffects ? 'reduced' : 'full'} data-animations={settings.animations ? 'on' : 'off'}>{children}</div></Context.Provider>
}
export const useCollectorPreferences = () => useContext(Context)
