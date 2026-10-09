import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BoosterError } from './rules'
import { getBoosterCatalog, getOpening, openBooster } from './service'

const requestSchema = z.object({ setCode: z.string().trim().min(2).max(64), idempotencyKey: z.string().uuid() }).strict()
function failure(error: unknown) {
  if (error instanceof BoosterError) return NextResponse.json({ success: false, code: error.code, error: error.message }, { status: error.status })
  console.error('Opération booster échouée')
  return NextResponse.json({ success: false, code: 'SERVER_ERROR', error: 'Ouverture non confirmée. Réessayez avec la même clé pour récupérer votre résultat.' }, { status: 500 })
}
async function json(request: Request): Promise<unknown> {
  if (!request.body) throw new BoosterError('INVALID_REQUEST', 'Corps JSON requis', 400)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > 4096) { await reader.cancel(); throw new BoosterError('INVALID_REQUEST', 'Requête trop volumineuse', 400) }
    chunks.push(value)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  try { return JSON.parse(text) } catch { throw new BoosterError('INVALID_REQUEST', 'JSON invalide', 400) }
}
export async function postOpening(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  try {
    const origin = request.headers.get('origin')
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new BoosterError('INVALID_ORIGIN', 'Origine de requête refusée', 403)
    const parsed = requestSchema.safeParse(await json(request))
    if (!parsed.success) throw new BoosterError('INVALID_REQUEST', 'Extension et clé d’idempotence UUID requises ; aucun identifiant de carte n’est accepté.', 400)
    const { opening, replayed } = await openBooster(prisma, session.user.id, parsed.data.setCode, parsed.data.idempotencyKey)
    return NextResponse.json({ success: true, opening, replayed, cards: opening.cards, newCardsCount: opening.newCardsCount, hasRareCard: opening.hasRareCard }, { status: replayed ? 200 : 201 })
  } catch (error) { return failure(error) }
}
export async function getCatalog() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  try { return NextResponse.json({ success: true, sets: await getBoosterCatalog(prisma) }) } catch (error) { return failure(error) }
}
export async function acknowledgeOpening(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  try {
    const parsed = z.object({ openingId: z.string().min(1).max(100) }).strict().safeParse(await json(request))
    if (!parsed.success) throw new BoosterError('UNTRUSTED_CARDS', 'Les cartes sont créditées uniquement lors de l’ouverture serveur. Fournissez un openingId pour consulter le reçu.', 400)
    const opening = await getOpening(prisma, session.user.id, parsed.data.openingId)
    if (!opening) throw new BoosterError('NOT_FOUND', 'Ouverture introuvable', 404)
    if (!opening.creditedAt) throw new BoosterError('LEGACY_OPENING', 'Ancienne ouverture sans preuve de crédit ; aucune attribution rétroactive automatique.', 409)
    return NextResponse.json({ success: true, alreadyCredited: true, opening })
  } catch (error) { return failure(error) }
}
export async function readOpening(id: string) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  try {
    const opening = await getOpening(prisma, session.user.id, id)
    if (!opening) throw new BoosterError('NOT_FOUND', 'Ouverture introuvable', 404)
    return NextResponse.json({ success: true, opening })
  } catch (error) { return failure(error) }
}
export async function listHistory(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  try {
    const parsed = z.object({ cursor: z.string().min(1).max(100).optional() }).strict().safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) throw new BoosterError('INVALID_REQUEST', 'Pagination invalide', 400)
    const cursor = parsed.data.cursor
    if (cursor && !await prisma.boosterOpening.findFirst({ where: { id: cursor, userId: session.user.id }, select: { id: true } })) throw new BoosterError('NOT_FOUND', 'Ouverture introuvable', 404)
    const rows = await prisma.boosterOpening.findMany({ where: { userId: session.user.id }, orderBy: [{ openedAt: 'desc' }, { id: 'desc' }], take: 21, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, openedAt: true, creditedAt: true, booster: { select: { name: true, setCode: true, cardSet: { select: { name: true } } } }, _count: { select: { cards: true } } } })
    const page = rows.slice(0, 20)
    return NextResponse.json({ success: true, openings: page.map(row => ({ id: row.id, setName: row.booster.cardSet.name, setCode: row.booster.setCode, openedAt: row.openedAt, creditedAt: row.creditedAt, cardCount: row._count.cards })), nextCursor: rows.length > 20 ? page.at(-1)!.id : null })
  } catch (error) { return failure(error) }
}
