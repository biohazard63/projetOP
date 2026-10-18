import { AdminWorkspace } from '@/components/admin/AdminWorkspace'
import { notFound } from 'next/navigation'
const sections = ['users', 'cards', 'sets', 'games', 'openings', 'audit'] as const
export default async function AdminDetail({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params
  if (!(sections as readonly string[]).includes(section)) notFound()
  return <div className="piece-page admin-page"><AdminWorkspace resource={section as typeof sections[number]} id={id} /></div>
}
