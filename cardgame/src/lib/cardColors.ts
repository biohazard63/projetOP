const translations: Record<string, string> = { ROUGE: 'RED', BLEU: 'BLUE', VERT: 'GREEN', NOIR: 'BLACK', VIOLET: 'PURPLE', JAUNE: 'YELLOW' }
export function normalizeCardColors(value: string): string[] {
  return value.toUpperCase().split(/[\s/,]+/).filter(Boolean).map(color => translations[color] || color).sort()
}
