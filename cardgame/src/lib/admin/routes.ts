import { auth } from '../auth'
import { prisma } from '../prisma'
import { rateLimit } from '../security'
import { adminHandlers } from './http'
import { adminRead } from './read'
import { adminWrite } from './write'
export const handleAdmin = adminHandlers({ session: auth, read: adminRead, write: (actor, action) => adminWrite(prisma, actor, action), allow: id => rateLimit(`admin-write:${id}`, 60, 60000).allowed })
