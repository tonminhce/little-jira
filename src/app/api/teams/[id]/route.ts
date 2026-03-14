import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole, isAtLeastAdmin, logTeamActivity, getTeamById } from '@/lib/teams'
import { z } from 'zod'

const updateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(50, 'Team name must be 50 characters or less'),
})

// GET - Get team details
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

    const team = await getTeamById(teamId)

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if user is a member
    const userRole = await getUserTeamRole(teamId, session.user.id)
    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        members: team.members.map((m) => ({
          id: m.id,
          role: m.role,
          joinedAt: m.joinedAt,
          user: m.user,
        })),
        userRole,
      },
    })
  } catch (error) {
    console.error('Get team error:', error)
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}

// PATCH - Update team name (OWNER or ADMIN only)
export async function PATCH(
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

    const body = await request.json()
    const validationResult = updateTeamSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name } = validationResult.data

    const team = await prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const updatedTeam = await prisma.$transaction(async (tx) => {
      const updated = await tx.team.update({
        where: { id: teamId },
        data: { name },
      })

      await logTeamActivity(teamId, 'TEAM_UPDATED', session.user.id, { newName: name }, tx)

      return updated
    })

    return NextResponse.json({
      message: 'Team updated successfully',
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        updatedAt: updatedTeam.updatedAt,
      },
    })
  } catch (error) {
    console.error('Update team error:', error)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}

// DELETE - Soft delete team (OWNER only)
export async function DELETE(
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

    if (userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Only owner can delete team' }, { status: 403 })
    }

    const team = await prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await logTeamActivity(teamId, 'TEAM_DELETED', session.user.id, undefined, tx)

      await tx.team.update({
        where: { id: teamId },
        data: { deletedAt: new Date() },
      })
    })

    return NextResponse.json({ message: 'Team deleted successfully' })
  } catch (error) {
    console.error('Delete team error:', error)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}
