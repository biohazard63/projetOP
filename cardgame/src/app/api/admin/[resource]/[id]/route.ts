import { handleAdmin } from '@/lib/admin/routes'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
type Context = { params: Promise<{ resource: string; id: string }> }
export async function GET(request: Request, context: Context) { const { resource, id } = await context.params; return handleAdmin(request, resource, id) }
export async function PATCH(request: Request, context: Context) { const { resource, id } = await context.params; return handleAdmin(request, resource, id) }
