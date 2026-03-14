import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TeamList } from '@/components/team/TeamList'
import { PageLayout } from '@/components/layout'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Teams',
}

export default async function TeamsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <PageLayout>
      <TeamList />
    </PageLayout>
  )
}
