import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole } from '@/lib/teams'
import { notFound } from 'next/navigation'
import { ProjectList } from '@/components/project/ProjectList'
import { PageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ProjectsPageProps {
  params: Promise<{ id: string }>
}

export default async function TeamProjectsPage({ params }: ProjectsPageProps) {
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
              <p className="text-gray-500 text-sm mt-1">Projects</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/teams/${teamId}/members`}>
                <Button variant="secondary">Members</Button>
              </Link>
              <Link href={`/teams/${teamId}/activity`}>
                <Button variant="secondary">Activity</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProjectList teamId={teamId} />
    </PageLayout>
  )
}
