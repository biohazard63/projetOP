import type { ReportCard } from '@/lib/reports/service'

const labels: Partial<Record<keyof ReportCard, string>> = {
  id: 'Identifiant catalogue', printingKey: 'Version imprimée', definitionId: 'Définition moteur', code: 'Numéro', name: 'Nom', imageUrl: 'Image', set: 'Série', setCode: 'Extension', rarity: 'Rareté', rarityName: 'Nom de rareté', type: 'Type', color: 'Couleur', colors: 'Couleurs', notes: 'Notes',
  cost: 'Coût', power: 'Puissance', counter: 'Counter', life: 'Vies', attribute: 'Attribut', family: 'Famille', effect: 'Texte', ability: 'Capacité', trigger: 'Trigger', originalText: 'Texte original', originalTrigger: 'Trigger original', language: 'Langue',
  isAltArt: 'Illustration alternative', isParallel: 'Version parallèle', isSpecial: 'Édition spéciale', drawVariant: 'Variante annoncée au tirage', drawTier: 'Palier du tirage', position: 'Position dans le booster',
  displayedEffect: 'Texte affiché au joueur', displayedTrigger: 'Trigger affiché au joueur', textSource: 'Source du texte affiché', originalShown: 'Affichage de la VO', currentPower: 'Puissance effective affichée', rested: 'Carte épuisée',
}
export function CardSnapshot({ card }: { card: ReportCard }) {
  return <dl className="report-card-info">{Object.entries(labels).filter(([key]) => card[key as keyof ReportCard] !== undefined && card[key as keyof ReportCard] !== null).map(([key, label]) => {
    const value = card[key as keyof ReportCard]
    return <div key={key}><dt>{label}</dt><dd>{typeof value === 'boolean' ? value ? 'Oui' : 'Non' : Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>
  })}</dl>
}
