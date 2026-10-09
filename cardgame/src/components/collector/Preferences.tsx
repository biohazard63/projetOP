'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
type Preferences = { animations: boolean; reducedEffects: boolean; density: 'comfortable' | 'compact' }
const defaults: Preferences = { animations: true, reducedEffects: false, density: 'comfortable' }
const Context = createContext<Preferences & { update: (patch: Partial<Preferences>) => void; storageAvailable: boolean }>({ ...defaults, update: () => {}, storageAvailable: true })
export function CollectorPreferencesProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const key = `mugiwara:display:${session?.user?.id || 'guest'}`
  const [settings, setSettings] = useState(defaults)
  const [storageAvailable, setStorageAvailable] = useState(true)
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '{}')
      setSettings({ animations: typeof stored.animations === 'boolean' ? stored.animations : true,
        reducedEffects: typeof stored.reducedEffects === 'boolean' ? stored.reducedEffects : false,
        density: stored.density === 'compact' ? 'compact' : 'comfortable' })
      setStorageAvailable(true)
    } catch { setSettings(defaults); setStorageAvailable(false) }
  }, [key])
  function update(patch: Partial<Preferences>) {
    const next = { ...settings, ...patch }; setSettings(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { setStorageAvailable(false) }
  }
  return <Context.Provider value={{ ...settings, update, storageAvailable }}><div data-visual-effects={settings.reducedEffects ? 'reduced' : 'full'} data-animations={settings.animations ? 'on' : 'off'}>{children}</div></Context.Provider>
}
export const useCollectorPreferences = () => useContext(Context)
