/** Openable product families. Starter decks and promotional products stay catalogued. */
export function isBoosterProduct(code: string): boolean {
  return /^(?:OP-?\d+(?:-EB-?\d+)?|EB-?\d+|PRB-?\d+)$/.test(code.trim().toUpperCase())
}
