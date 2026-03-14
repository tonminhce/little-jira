import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserTeamRole } from '@/lib/teams'
import { getProjectById, canManageProject } from '@/lib/projects'
import { notFound } from 'next/navigation'
import { ProjectDashboard } from '@/components/dashboard/ProjectDashboard'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageLayout } from '@/components/layout'
import { LayoutGrid, List, Plus, ArrowLeft, Settings, BarChart3 } from 'lucide-react'

interface DashboardPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDashboardPage({ params }: DashboardPageProps) {
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

  const tabs = [
    { label: 'Board', href: `/projects/${projectId}/board`, icon: <LayoutGrid className="w-4 h-4" /> },
    { label: 'List', href: `/projects/${projectId}/issues`, icon: <List className="w-4 h-4" /> },
    { label: 'Dashboard', href: `/projects/${projectId}/dashboard`, icon: <BarChart3 className="w-4 h-4" /> },
  ]

  const breadcrumbs = [
    { label: project.team.name, href: `/teams/${project.teamId}` },
    { label: project.name, href: `/projects/${projectId}` },
  ]

  return (
    <PageLayout breadcrumbs={breadcrumbs}>
      {/* Back link */}
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Project
      </Link>

      {/* Project Header with Tabs */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="p-6 flex justify-between items-center border-b">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-500 text-sm mt-1">Dashboard</p>
            </div>
            <div className="flex items-center gap-2">
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
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <Tabs tabs={tabs} />
        </CardContent>
      </Card>

      {isArchived && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded mb-6">
          This project is archived. Issues cannot be created or modified.
        </div>
      )}

      <ProjectDashboard projectId={projectId} />
    </PageLayout>
  )
}
