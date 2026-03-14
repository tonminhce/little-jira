import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getUserTeamRole,
  isOwner,
  canKick,
  logTeamActivity,
} from '@/lib/teams'
import { z } from 'zod'

const changeRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
})

// PATCH - Change member role (OWNER only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId, memberId } = await params
    const userRole = await getUserTeamRole(teamId, session.user.id)

    if (userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const validationResult = changeRoleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { role: newRole } = validationResult.data

    const targetMember = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    })

    if (!targetMember || targetMember.teamId !== teamId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Cannot change OWNER's role
    if (targetMember.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 400 }
      )
    }

    const updatedMember = await prisma.$transaction(async (tx) => {
      const updated = await tx.teamMember.update({
        where: { id: memberId },
        data: { role: newRole },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      await logTeamActivity(teamId, 'ROLE_CHANGED', session.user.id, {
        targetUserId: targetMember.userId,
        targetUserName: targetMember.user.name,
        oldRole: targetMember.role,
        newRole,
      }, tx)

      return updated
    })

    return NextResponse.json({
      message: 'Role updated successfully',
      member: {
        id: updatedMember.id,
        role: updatedMember.role,
        user: updatedMember.user,
      },
    })
  } catch (error) {
    console.error('Change role error:', error)
    return NextResponse.json({ error: 'Failed to change role' }, { status: 500 })
  }
}

// DELETE - Kick member (OWNER can kick anyone, ADMIN can kick MEMBERs only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId, memberId } = await params
    const userRole = await getUserTeamRole(teamId, session.user.id)

    if (!userRole || !isOwner(userRole) && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const targetMember = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    })

    if (!targetMember || targetMember.teamId !== teamId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Cannot kick OWNER
    if (targetMember.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Owner cannot be kicked' },
        { status: 400 }
      )
    }

    // Check permission to kick this member
    if (!canKick(targetMember.role as 'OWNER' | 'ADMIN' | 'MEMBER', userRole)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.teamMember.delete({
        where: { id: memberId },
      })

      await logTeamActivity(teamId, 'MEMBER_KICKED', session.user.id, {
        kickedUserId: targetMember.userId,
        kickedUserName: targetMember.user.name,
        kickedUserEmail: targetMember.user.email,
      }, tx)
    })

    return NextResponse.json({ message: 'Member removed successfully' })
  } catch (error) {
    console.error('Kick member error:', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
