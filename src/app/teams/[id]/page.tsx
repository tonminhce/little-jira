import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole, TeamRole } from '@/lib/teams'
import { notFound } from 'next/navigation'
import { PageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface TeamDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
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
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })

  if (!team) {
    notFound()
  }

  const isAtLeastAdmin = userRole === 'OWNER' || userRole === 'ADMIN'

  const breadcrumbs = [
    { label: 'Teams', href: '/teams' },
  ]

  return (
    <PageLayout breadcrumbs={breadcrumbs}>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
              <p className="text-gray-500 text-sm mt-1">
                Your role: <span className="font-medium">{userRole}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Link href={`/teams/${teamId}/projects`}>
              <Button>Projects</Button>
            </Link>
            <Link href={`/teams/${teamId}/members`}>
              <Button variant="secondary">Members</Button>
            </Link>
            <Link href={`/teams/${teamId}/activity`}>
              <Button variant="secondary">Activity</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Members ({team.members.length})</h2>
            <div className="space-y-3">
              {team.members.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {(member.user.name || member.user.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {member.user.name || member.user.email}
                    </p>
                    <p className="text-xs text-gray-500">{member.role}</p>
                  </div>
                </div>
              ))}
              {team.members.length > 5 && (
                <Link
                  href={`/teams/${teamId}/members`}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View all {team.members.length} members
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Members</span>
                <span className="font-medium">{team.members.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span className="font-medium">
                  {new Date(team.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
