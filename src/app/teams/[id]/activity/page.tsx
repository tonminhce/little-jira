import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole } from '@/lib/teams'
import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Activity } from 'lucide-react'

interface ActivityPageProps {
  params: Promise<{ id: string }>
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id: teamId } = await params
  const userRole = await getUserTeamRole(teamId, session.user.id)

  if (!userRole) {
    notFound()
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, deletedAt: null },
    select: { id: true, name: true },
  })

  if (!team) {
    notFound()
  }

  const activities = await prisma.teamActivity.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const breadcrumbs = [
    { label: team.name, href: `/teams/${teamId}` },
  ]

  return (
    <PageLayout breadcrumbs={breadcrumbs}>
      <div className="mb-6">
        <Link href={`/teams/${teamId}`} className="text-blue-600 hover:text-blue-800">
          &larr; Back to {team.name}
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
          <p className="text-gray-500 text-sm mt-1">Activity log</p>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
      <Card>
        <CardContent className="p-0 divide-y">
          {activities.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No activity yet"
              description="Activity will appear here as team members interact with the team."
            />
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="p-4 flex items-center gap-4">
                <span className="text-gray-600">{activity.type.replace(/_/g, ' ')}</span>
                <span className="text-sm text-gray-400 ml-auto">
                  {new Date(activity.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </PageLayout>
  )
}
