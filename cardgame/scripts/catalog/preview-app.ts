import { PrismaClient } from '@prisma/client'
import { assertLocalDatabase } from './database'
import { readiness } from './readiness'
import { MASTER, readJson, writeJson } from './files'
import type { Catalog } from './core'

async function main() {
  const url = process.env.DATABASE_URL || ''
  assertLocalDatabase(url, true)
  const db = new PrismaClient({ datasourceUrl: url })
  try {
    const { records } = await readiness()
    const catalog = await readJson<Catalog>(MASTER)
    const result = await db.$transaction(async tx => {
      const used = new Set(records.map(r => r.data.setCode || r.memberships.find(c => /^(?:[A-Z]+-\d+|OP\d+-EB\d+)$/.test(c)) || r.memberships[0]))
      for (const code of used) {
        if (!code) throw new Error('Extension absente')
        const extension = catalog.extensions.find(e => e.code === code)!
        const observedDate = extension.metadata?.observedReleaseDates.find(d => Number.isFinite(Date.parse(d)))
        await tx.cardSet.upsert({ where: { code }, update: {}, create: {
          code, name: extension.name.fr || extension.name.original || code,
          releaseDate: observedDate ? new Date(observedDate) : new Date('1970-01-01T00:00:00Z'),
          description: observedDate ? 'Catalogue de prévisualisation local.' : 'PRÉVISUALISATION : date technique 1970, date de sortie inconnue. Aucune règle de booster configurée.',
          imageUrl: extension.metadata?.imageUrls[0] || null,
        } })
      }
      const inserted = await tx.card.createMany({ skipDuplicates: true, data: records.map(r => ({
        ...r.data, setCode: r.data.setCode || r.memberships.find(c => /^(?:[A-Z]+-\d+|OP\d+-EB\d+)$/.test(c)) || r.memberships[0],
      })) })
      return { inserted: inserted.count, compatible: records.length, totalCards: await tx.card.count(), testOnly: true, existingCardsUpdated: 0, playerRowsModified: 0 }
    }, { timeout: 60000 })
    await writeJson('../docs/catalog/evidence/app-preview.json', result)
    console.log(JSON.stringify(result))
  } finally { await db.$disconnect() }
}
void main().catch(e => { console.error(e instanceof Error ? e.message : 'Prévisualisation interrompue'); process.exitCode = 1 })
