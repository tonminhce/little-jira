import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole } from '@/lib/teams'
import { getProjectById, canManageProject } from '@/lib/projects'
import { notFound } from 'next/navigation'
import { ProjectSettingsClient } from '@/components/project/ProjectSettingsClient'
import { LabelManager } from '@/components/issue/LabelManager'
import { ColumnManager } from '@/components/project/ColumnManager'
import { PageLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'

interface ProjectSettingsPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id: projectId } = await params
  const project = await getProjectById(projectId, session.user.id)

  if (!project) {
    notFound()
  }

  const canManage = await canManageProject(projectId, session.user.id)

  if (!canManage) {
    redirect(`/projects/${projectId}`)
  }

  // Get project labels
  const labels = await prisma.issueLabel.findMany({
    where: { projectId },
    orderBy: { name: 'asc' },
  })

  const breadcrumbs = [
    { label: project.team.name, href: `/teams/${project.teamId}` },
    { label: project.name, href: `/projects/${projectId}` },
  ]

  return (
    <PageLayout breadcrumbs={breadcrumbs}>
      <div className="mb-6">
        <Link href={`/projects/${projectId}`} className="text-blue-600 hover:text-blue-800">
          &larr; Back to {project.name}
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">Project Settings</h1>
          <p className="text-gray-500 text-sm mt-1">{project.name}</p>
        </CardContent>
      </Card>

      <ProjectSettingsClient
        project={{
          id: project.id,
          name: project.name,
          description: project.description,
          archivedAt: project.archivedAt,
          teamId: project.teamId,
        }}
      />

      {/* Labels Section */}
      <div className="mt-6">
        <LabelManager
          projectId={projectId}
          initialLabels={labels}
          canManage={canManage}
        />
      </div>

      {/* Columns Section */}
      {canManage && (
        <div className="mt-6">
          <Card>
            <CardContent className="p-6">
              <ColumnManager projectId={projectId} />
            </CardContent>
          </Card>
        </div>
      )}
    </PageLayout>
  )
}
