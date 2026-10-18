import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import type { ReportStore } from './service'

export const reportStore: ReportStore = {
  ownsGame: async (userId, id) => Boolean(await prisma.engineGame.findFirst({ where: { id, userId }, select: { id: true } })),
  ownsOpening: async (userId, id) => Boolean(await prisma.boosterOpening.findFirst({ where: { id, userId }, select: { id: true } })),
  save: ({ card, context, requestId, userId, ...data }) => prisma.issueReport.upsert({
    where: { userId_requestId: { userId, requestId } }, update: {},
    create: { ...data, userId, requestId, cardSnapshot: card ? card as Prisma.InputJsonValue : Prisma.DbNull, context: context as Prisma.InputJsonValue },
    select: { id: true },
  }),
}
