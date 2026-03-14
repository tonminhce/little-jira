import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole } from '@/lib/teams'
import { getProjectById } from '@/lib/projects'
import { countProjectIssues, isProjectArchived } from '@/lib/issues'
import { notFound } from 'next/navigation'
import { IssueForm } from '@/components/issue/IssueForm'

interface NewIssuePageProps {
  params: Promise<{ id: string }>
}

export default async function NewIssuePage({ params }: NewIssuePageProps) {
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

  // Check if project is archived
  const archived = await isProjectArchived(projectId)
  if (archived) {
    redirect(`/projects/${projectId}/board`)
  }

  // Check issue limit
  const issueCount = await countProjectIssues(projectId)
  if (issueCount >= 200) {
    redirect(`/projects/${projectId}/board`)
  }

  // Get project labels
  const labels = await prisma.issueLabel.findMany({
    where: { projectId },
    orderBy: { name: 'asc' },
  })

  // Get team members for assignee dropdown
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId: project.teamId },
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
              <Link href={`/teams/${project.teamId}`} className="text-gray-600 hover:text-gray-900">
                {project.team.name}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href={`/projects/${projectId}/board`} className="text-blue-600 hover:text-blue-800">
            &larr; Back to Board
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">New Issue</h1>

          <IssueForm
            projectId={projectId}
            labels={labels}
            members={members}
          />
        </div>
      </main>
    </div>
  )
}
