import { handleAdmin } from '@/lib/admin/routes'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
type Context = { params: Promise<{ resource: string }> }
export async function GET(request: Request, context: Context) { return handleAdmin(request, (await context.params).resource) }
export async function PATCH(request: Request, context: Context) { return handleAdmin(request, (await context.params).resource) }
