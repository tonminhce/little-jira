import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole } from '@/lib/teams'
import { getProjectById, canManageProject } from '@/lib/projects'
import { notFound } from 'next/navigation'
import { IssueListWithFilters } from '@/components/issue/IssueListWithFilters'
import { Tabs } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageLayout } from '@/components/layout'
import { Alert } from '@/components/ui/alert'
import { LayoutGrid, List, Plus, ArrowLeft, Settings, BarChart3 } from 'lucide-react'

interface IssuesListPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    status?: string
    priority?: string
    assigneeId?: string
    search?: string
    sortBy?: string
    sortOrder?: string
  }>
}

export default async function ProjectIssuesListPage({ params, searchParams }: IssuesListPageProps) {
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

  // Get query params
  const resolvedSearchParams = await searchParams
  const status = resolvedSearchParams.status
  const priority = resolvedSearchParams.priority
  const assigneeId = resolvedSearchParams.assigneeId
  const search = resolvedSearchParams.search
  const sortBy = resolvedSearchParams.sortBy || 'createdAt'
  const sortOrder = resolvedSearchParams.sortOrder || 'desc'

  // Build where clause
  const where: Record<string, unknown> = {
    projectId,
    deletedAt: null,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(assigneeId === 'unassigned' ? { assigneeId: null } : (assigneeId && { assigneeId })),
    ...(search && { title: { contains: search, mode: 'insensitive' } }),
  }

  // Get issues
  const issues = await prisma.issue.findMany({
    where,
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
      labels: {
        include: {
          label: true,
        },
      },
    },
    orderBy: { [sortBy]: sortOrder },
  })

  // Get project labels for filter
  const labels = await prisma.issueLabel.findMany({
    where: { projectId },
    orderBy: { name: 'asc' },
  })

  // Get team members for assignee filter
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId: project.teamId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  })

  const members = teamMembers.map((m) => m.user)

  // Map issues for client component
  const mappedIssues = issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    dueDate: issue.dueDate,
    owner: issue.owner,
    assignee: issue.assignee,
    labels: issue.labels.map((l) => l.label),
  }))

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
              <p className="text-gray-500 text-sm mt-1">Issues List</p>
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
        <Alert variant="warning" className="mb-6">
          This project is archived. Issues cannot be created or modified.
        </Alert>
      )}

      <IssueListWithFilters
        projectId={projectId}
        initialIssues={mappedIssues}
        labels={labels}
        members={members}
        isArchived={isArchived}
        initialFilters={{
          status: status || '',
          priority: priority || '',
          assigneeId: assigneeId || '',
          search: search || '',
          sortBy: sortBy || 'createdAt',
          sortOrder: sortOrder || 'desc',
        }}
      />
    </PageLayout>
  )
}
