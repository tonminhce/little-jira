import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logTeamActivity } from '@/lib/teams'

// GET - Validate invite token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            deletedAt: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    if (invite.team.deletedAt) {
      return NextResponse.json({ error: 'Team no longer exists' }, { status: 400 })
    }

    return NextResponse.json({
      invite: {
        email: invite.email,
        teamName: invite.team.name,
        teamId: invite.team.id,
        expiresAt: invite.expiresAt,
      },
    })
  } catch (error) {
    console.error('Validate invite error:', error)
    return NextResponse.json({ error: 'Failed to validate invite' }, { status: 500 })
  }
}

// POST - Accept invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'You must be logged in to accept an invite' }, { status: 401 })
    }

    const { token } = await params

    const invite = await prisma.teamInvite.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            deletedAt: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    if (invite.team.deletedAt) {
      return NextResponse.json({ error: 'Team no longer exists' }, { status: 400 })
    }

    // Verify logged-in email matches invited email
    if (session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invite is for another email address' },
        { status: 403 }
      )
    }

    // Check if already a member
    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: invite.teamId, userId: session.user.id },
      },
    })

    if (existingMembership) {
      // Clean up the invite
      await prisma.teamInvite.delete({ where: { id: invite.id } })
      return NextResponse.json({ error: 'You are already a member of this team' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // Create membership
      await tx.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId: session.user.id,
          role: 'MEMBER',
        },
      })

      // Delete the invite
      await tx.teamInvite.delete({ where: { id: invite.id } })

      // Log activity
      await logTeamActivity(invite.teamId, 'MEMBER_JOINED', session.user.id, undefined, tx)
    })

    return NextResponse.json({
      message: 'You have joined the team',
      team: {
        id: invite.team.id,
        name: invite.team.name,
      },
    })
  } catch (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}
