'use client'
import { useCollectorPreferences } from '@/components/collector/Preferences'
export function useVibration() {
  const { vibrations } = useCollectorPreferences()
  return () => {
    if (!vibrations || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
    try { navigator.vibrate(12) } catch { /* Optional browser capability. */ }
  }
}
