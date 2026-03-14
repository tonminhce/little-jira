import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole, logTeamActivity } from '@/lib/teams'

// POST - Leave team (ADMIN or MEMBER only, OWNER cannot leave)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params
    const userRole = await getUserTeamRole(teamId, session.user.id)

    if (!userRole) {
      return NextResponse.json({ error: 'You are not a member of this team' }, { status: 400 })
    }

    if (userRole === 'OWNER') {
      return NextResponse.json(
        { error: 'Owner cannot leave, transfer ownership first' },
        { status: 400 }
      )
    }

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: session.user.id },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.teamMember.delete({
        where: { id: membership.id },
      })

      await logTeamActivity(teamId, 'MEMBER_LEFT', session.user.id, undefined, tx)
    })

    return NextResponse.json({ message: 'You have left the team' })
  } catch (error) {
    console.error('Leave team error:', error)
    return NextResponse.json({ error: 'Failed to leave team' }, { status: 500 })
  }
}
