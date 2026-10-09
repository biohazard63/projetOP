// Product thumbnails verified on the official Bandai site. Existing catalogue
// artwork takes precedence; this does not modify CardSet or any opening rules.
const officialCodes = [
 'OP01', 'OP02', 'OP03', 'OP04', 'OP05', 'OP06',
 'OP07', 'OP08', 'OP09', 'OP10', 'OP11', 'OP12',
 'EB01', 'EB02', 'PRB01',
] as const
const officialArtwork = new Map<string, string>(officialCodes.map(code => [code, `https://en.onepiece-cardgame.com/images/products/boosters/${code.toLowerCase()}/img_thumbnail.png`]))
export function getBoosterArtwork(code: string, configuredImage: string | null): string | null {
 return configuredImage?.trim() || officialArtwork.get(code.toUpperCase().replace(/[\s-]/g, '')) || null
}
