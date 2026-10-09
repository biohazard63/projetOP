import { readOpening } from '@/lib/boosters/http'
export async function GET(_request: Request, context: { params: Promise<{ openingId: string }> }) {
  return readOpening((await context.params).openingId)
}
