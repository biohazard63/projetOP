// Product thumbnails verified on the official Bandai site. Existing catalogue
// artwork takes precedence; this does not modify CardSet or any opening rules.
const officialCodes = [
 'OP01', 'OP02', 'OP03', 'OP04', 'OP05', 'OP06',
 'OP07', 'OP08', 'OP09', 'OP10', 'OP11', 'OP12',
 'EB01', 'EB02', 'PRB01',
] as const
const officialArtwork = new Map<string, string>(officialCodes.map(code => [code, `https://en.onepiece-cardgame.com/images/products/boosters/${code.toLowerCase()}/img_thumbnail.png`]))
const newArtwork: Record<string, string> = {
 OP13: 'https://fr.onepiece-cardgame.com/products/boosters/op13/images/img_item01.webp',
 OP14EB04: 'https://fr.onepiece-cardgame.com/renewal/images/products/boosters/op14/img_item01.webp',
 OP15EB04: 'https://fr.onepiece-cardgame.com/renewal/images/products/boosters/op15-eb04/img_item01.webp',
 OP16: 'https://en.onepiece-cardgame.com/onepiececg/bccard/en/products/2026/03/26/olc1E9Gg9WXeLP6V/img_item01.webp',
 OP17: 'https://fr.onepiece-cardgame.com/products/boosters/op17/images/others/product_pack.webp',
}
for (const [code, image] of Object.entries(newArtwork)) officialArtwork.set(code, image)
export function getBoosterArtwork(code: string, configuredImage: string | null): string | null {
 return configuredImage?.trim() || officialArtwork.get(code.toUpperCase().replace(/[\s-]/g, '')) || null
}
