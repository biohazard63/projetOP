import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBoosterCatalog } from '@/lib/boosters/service'
import { normalizeSetCode } from '@/lib/boosters/rules'
export const dynamic = 'force-dynamic'
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params
    const catalog = await getBoosterCatalog(prisma)
    const exact = catalog.find(set => set.code === code.toUpperCase())
    const matches = catalog.filter(set => normalizeSetCode(set.code) === normalizeSetCode(code))
    const set = exact || (matches.length === 1 ? matches[0] : null)
    if (!set) return NextResponse.json({ success: false, error: 'Extension introuvable ou ambiguë' }, { status: 404 })
    return NextResponse.json({ success: true, rules: set.rules, available: set.available, error: set.error, warnings: set.warnings })
  } catch { return NextResponse.json({ success: false, error: 'Règles indisponibles' }, { status: 500 }) }
}
