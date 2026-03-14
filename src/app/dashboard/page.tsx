import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PageLayout } from '@/components/layout'
import { PersonalDashboard } from '@/components/dashboard/PersonalDashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <PageLayout>
      <PersonalDashboard />
    </PageLayout>
  )
}
