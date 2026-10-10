/** Families come from actual catalogue codes; unknown formats remain explicit. */
export function extensionFamily(code: string): string {
  return code.trim().toUpperCase().match(/^([A-Z]+)-?\d/)?.[1] || 'Autres'
}
export function extensionFamilies(codes: string[]): string[] {
  const priority = ['OP', 'EB', 'ST', 'PRB']
  return [...new Set(codes.map(extensionFamily))].sort((a,b) => {
    const rank = (value: string) => priority.includes(value) ? priority.indexOf(value) : priority.length
    return rank(a) - rank(b) || a.localeCompare(b)
  })
}
