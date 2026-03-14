import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole } from '@/lib/teams'
import { getProjectById, canManageProject } from '@/lib/projects'
import { notFound } from 'next/navigation'
import { FavoriteButton } from '@/components/project/FavoriteButton'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageLayout } from '@/components/layout'
import { LayoutGrid, List, Plus, Settings, ArrowLeft, Folder, User, Calendar } from 'lucide-react'

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id: projectId } = await params
  const project = await getProjectById(projectId, session.user.id)

  if (!project) {
    notFound()
  }

  // Verify user is team member
  const userRole = await getUserTeamRole(project.teamId, session.user.id)
  if (!userRole) {
    notFound()
  }

  const canManage = await canManageProject(projectId, session.user.id)
  const isArchived = !!project.archivedAt

  // Get issue counts by status
  const issueCounts = await prisma.issue.groupBy({
    by: ['status'],
    where: {
      projectId,
      deletedAt: null,
    },
    _count: true,
  })

  const issueStats = {
    total: issueCounts.reduce((sum, item) => sum + item._count, 0),
    todo: issueCounts.find((item) => item.status === 'BACKLOG')?._count || 0,
    inProgress: issueCounts.find((item) => item.status === 'IN_PROGRESS')?._count || 0,
    done: issueCounts.find((item) => item.status === 'DONE')?._count || 0,
  }

  const tabs = [
    { label: 'Board', href: `/projects/${projectId}/board`, icon: <LayoutGrid className="w-4 h-4" /> },
    { label: 'List', href: `/projects/${projectId}/issues`, icon: <List className="w-4 h-4" /> },
  ]

  const breadcrumbs = [
    { label: project.team.name, href: `/teams/${project.teamId}` },
  ]

  return (
    <PageLayout breadcrumbs={breadcrumbs}>
      {/* Back link */}
      <Link
        href={`/teams/${project.teamId}/projects`}
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      {/* Project Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Folder className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                {isArchived && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    Archived
                  </span>
                )}
              </div>
              {project.description && (
                <p className="text-gray-600 mt-2 whitespace-pre-wrap">{project.description}</p>
              )}
              <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {project.owner.name || project.owner.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FavoriteButton
                projectId={project.id}
                initialFavorited={project.isFavorited}
                favoriteCount={0}
              />
              {!isArchived && (
                <Link href={`/projects/${projectId}/issues/new`}>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Issue
                  </Button>
                </Link>
              )}
              {canManage && (
                <Link href={`/projects/${projectId}/settings`}>
                  <Button variant="secondary">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Issues</p>
            <p className="text-2xl font-bold text-gray-900">{issueStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">To Do</p>
            <p className="text-2xl font-bold text-gray-600">{issueStats.todo}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{issueStats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Done</p>
            <p className="text-2xl font-bold text-green-600">{issueStats.done}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <Tabs tabs={tabs} />
        <CardContent className="p-6">
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">Select a view to see your issues</p>
            <div className="flex justify-center gap-4">
              <Link href={`/projects/${projectId}/board`}>
                <Button>
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  Board View
                </Button>
              </Link>
              <Link href={`/projects/${projectId}/issues`}>
                <Button variant="secondary">
                  <List className="w-4 h-4 mr-2" />
                  List View
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
