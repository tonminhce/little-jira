import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole, TeamRole } from '@/lib/teams'
import { notFound } from 'next/navigation'
import { RoleBadge } from '@/components/team/RoleBadge'
import { MemberListClient } from '@/components/team/MemberManagement'
import { InviteFormClient } from '@/components/team/InviteFormClient'
import { PageLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'

interface Member {
  id: string
  role: TeamRole
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface MembersPageProps {
  params: Promise<{ id: string }>
}

export default async function MembersPage({ params }: MembersPageProps) {
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

  const members: Member[] = team.members.map((m) => ({
    id: m.id,
    role: m.role as TeamRole,
    joinedAt: m.joinedAt.toISOString(),
    user: m.user,
  }))

  const isAtLeastAdmin = userRole === 'OWNER' || userRole === 'ADMIN'

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
              <p className="text-gray-500 text-sm mt-1">Manage team members</p>
            </div>
            <div className="flex items-center gap-4">
              <RoleBadge role={userRole} />
            </div>
          </div>
        </CardContent>
      </Card>

      {isAtLeastAdmin && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Invite New Member</h2>
            <InviteFormClient teamId={teamId} />
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Members ({members.length})</h2>
        <MemberListClient
          teamId={teamId}
          members={members}
          currentUserId={session.user.id}
          currentUserRole={userRole}
        />
      </div>
    </PageLayout>
  )
}
