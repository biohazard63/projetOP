import { Prisma } from '@prisma/client'
import { BoosterError } from './rules'

/** Never serialize an exception: Prisma messages may contain connection details. */
export function describeBoosterFailure(error: unknown) {
  if (error instanceof BoosterError) {
    return { status: error.status, code: error.code, message: error.message, databaseCode: null }
  }
  const rawCode = error instanceof Prisma.PrismaClientKnownRequestError ? error.code
    : error instanceof Prisma.PrismaClientInitializationError ? error.errorCode : undefined
  const databaseCode = rawCode && /^P\d{4}$/.test(rawCode) ? rawCode : null
  if (databaseCode === 'P2021' || databaseCode === 'P2022') {
    return { status: 503, code: 'DATABASE_SCHEMA_OUTDATED', databaseCode,
      message: 'La base de données du serveur nécessite une mise à jour. Conservez cette ouverture et réessayez avec la même clé après correction.' }
  }
  if (databaseCode && ['P1000', 'P1001', 'P1002', 'P1008', 'P1010', 'P1017', 'P2024'].includes(databaseCode)) {
    return { status: 503, code: 'DATABASE_UNAVAILABLE', databaseCode,
      message: 'La base de données du serveur est momentanément indisponible. Réessayez cette ouverture avec la même clé.' }
  }
  if (databaseCode === 'P2028') {
    return { status: 503, code: 'OPENING_TRANSACTION_FAILED', databaseCode,
      message: 'La transaction d’ouverture a été interrompue. Réessayez cette ouverture avec la même clé pour récupérer votre résultat.' }
  }
  return { status: 500, code: 'SERVER_ERROR', databaseCode,
    message: 'Ouverture non confirmée. Réessayez avec la même clé pour récupérer votre résultat.' }
}
