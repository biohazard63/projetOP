import { AdminWorkspace } from '@/components/admin/AdminWorkspace'
import { resources } from '@/lib/admin/contracts'
import { notFound } from 'next/navigation'
export default async function AdminSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  if (!(resources as readonly string[]).includes(section)) notFound()
  return <div className="piece-page admin-page"><AdminWorkspace resource={section as typeof resources[number]} /></div>
}
