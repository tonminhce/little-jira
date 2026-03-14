import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole } from '@/lib/teams'
import { canManageProject } from '@/lib/projects'
import { notFound } from 'next/navigation'
import { IssueDetail } from '@/components/issue/IssueDetail'

interface IssuePageProps {
  params: Promise<{ id: string }>
}

export default async function IssueDetailPage({ params }: IssuePageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id: issueId } = await params

  const issue = await prisma.issue.findFirst({
    where: { id: issueId, deletedAt: null },
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
      previousAssignee: {
        select: { id: true, name: true, email: true, image: true },
      },
      project: {
        select: {
          id: true,
          name: true,
          teamId: true,
          archivedAt: true,
          team: {
            select: { name: true },
          },
        },
      },
      labels: {
        include: {
          label: true,
        },
      },
      history: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })

  if (!issue) {
    notFound()
  }

  // Verify user is team member
  const userRole = await getUserTeamRole(issue.project.teamId, session.user.id)
  if (!userRole) {
    notFound()
  }

  const canManage = await canManageProject(issue.project.id, session.user.id)
  const isArchived = !!issue.project.archivedAt
  const canDelete = canManage || issue.ownerId === session.user.id
  const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN'

  // Get project labels
  const labels = await prisma.issueLabel.findMany({
    where: { projectId: issue.project.id },
    orderBy: { name: 'asc' },
  })

  // Get team members for assignee dropdown
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId: issue.project.teamId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  })

  const members = teamMembers.map((m) => m.user)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              Little Jira
            </Link>
            <nav className="flex gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/teams" className="text-gray-600 hover:text-gray-900">
                Teams
              </Link>
              <Link href={`/teams/${issue.project.teamId}`} className="text-gray-600 hover:text-gray-900">
                {issue.project.team.name}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href={`/projects/${issue.project.id}/board`} className="text-blue-600 hover:text-blue-800">
            &larr; Back to Board
          </Link>
        </div>

        <IssueDetail
          issue={{
            id: issue.id,
            title: issue.title,
            description: issue.description,
            status: issue.status,
            priority: issue.priority,
            dueDate: issue.dueDate,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            owner: issue.owner,
            assignee: issue.assignee,
            previousAssignee: issue.previousAssignee,
            project: issue.project,
            labels: issue.labels.map((l) => l.label),
            history: issue.history,
          }}
          labels={labels}
          members={members}
          isArchived={isArchived}
          canDelete={canDelete}
          currentUserId={session.user.id}
          isAdmin={isAdmin}
        />
      </main>
    </div>
  )
}
