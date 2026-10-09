import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  if (!(await auth())?.user?.id) redirect('/login')
  return <>{children}</>
}
