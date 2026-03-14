import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getUserTeamRole,
  isAtLeastAdmin,
  logTeamActivity,
  generateInviteToken,
  isTeamMember,
} from '@/lib/teams'
import { sendTeamInviteEmail } from '@/lib/email'
import { z } from 'zod'

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email format'),
})

// GET - List team members
export async function GET(
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
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
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
    })

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    })
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

// POST - Invite a new member (OWNER or ADMIN only)
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

    if (!userRole || !isAtLeastAdmin(userRole)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const body = await request.json()
    const validationResult = inviteMemberSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    // Check if user is already a member
    const existingMember = await prisma.user.findUnique({
      where: { email },
      include: {
        teamMemberships: {
          where: { teamId },
        },
      },
    })

    if (existingMember && existingMember.teamMemberships.length > 0) {
      return NextResponse.json(
        { error: 'User is already a member' },
        { status: 400 }
      )
    }

    // Check for existing pending invite
    const existingInvite = await prisma.teamInvite.findUnique({
      where: { teamId_email: { teamId, email } },
    })

    if (existingInvite && existingInvite.expiresAt > new Date()) {
      return NextResponse.json(
        { error: 'An invite has already been sent to this email' },
        { status: 400 }
      )
    }

    // Generate invite token
    const token = generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    await prisma.$transaction(async (tx) => {
      // Delete expired invite if exists
      if (existingInvite) {
        await tx.teamInvite.delete({
          where: { id: existingInvite.id },
        })
      }

      // Create new invite
      await tx.teamInvite.create({
        data: {
          teamId,
          email,
          token,
          expiresAt,
        },
      })

      await logTeamActivity(teamId, 'INVITE_SENT', session.user.id, { email }, tx)
    })

    // Send invite email
    await sendTeamInviteEmail({
      email,
      teamName: team.name,
      inviteToken: token,
    })

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invite: {
        email,
        expiresAt,
      },
    })
  } catch (error) {
    console.error('Invite member error:', error)
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }
}
