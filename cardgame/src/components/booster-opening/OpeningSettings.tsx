'use client'
import { useCollectorPreferences } from '@/components/collector/Preferences'
import { useSoundSetting } from '@/hooks/useAudio'
export default function OpeningSettings() {
  const prefs = useCollectorPreferences()
  const sounds = useSoundSetting()
  return <details className="piece-panel mt-4" data-testid="opening-settings"><summary className="min-h-11 cursor-pointer font-semibold">Options d’ouverture</summary><div className="grid gap-4 pt-4">
    {([{ label: 'Animations', checked: prefs.animations, change: () => prefs.update({ animations: !prefs.animations }) }, { label: 'Effets sonores', checked: sounds.soundsEnabled, change: () => sounds.setSoundsEnabled(!sounds.soundsEnabled) }, { label: 'Mode rapide', checked: prefs.quickOpening, change: () => prefs.update({ quickOpening: !prefs.quickOpening }) }] ).map(option => <label key={option.label} className="flex min-h-11 items-center justify-between gap-4"><span>{option.label}</span><input type="checkbox" checked={option.checked} onChange={option.change} /></label>)}
    <label className="piece-field">Vitesse d’animation<select value={prefs.openingSpeed} onChange={e => prefs.update({ openingSpeed: e.target.value as 'slow' | 'normal' | 'fast' })}><option value="slow">Lente</option><option value="normal">Normale</option><option value="fast">Rapide</option></select></label>
    {!prefs.storageAvailable && <p role="status">Préférences conservées uniquement pour cette session.</p>}
  </div></details>
}
