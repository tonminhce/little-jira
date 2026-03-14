import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PageLayout } from '@/components/layout'
import { NotificationsList } from '@/components/notifications/NotificationsList'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Notifications',
}

export default async function NotificationsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <PageLayout>
      <NotificationsList />
    </PageLayout>
  )
}
