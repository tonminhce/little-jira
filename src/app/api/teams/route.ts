import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logTeamActivity, getUserTeams } from '@/lib/teams'
import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(50, 'Team name must be 50 characters or less'),
})

// GET - List all teams for current user
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teams = await getUserTeams(session.user.id)

    return NextResponse.json({
      teams: teams.map((tm) => ({
        id: tm.team.id,
        name: tm.team.name,
        role: tm.role,
        joinedAt: tm.joinedAt,
        createdAt: tm.team.createdAt,
      })),
    })
  } catch (error) {
    console.error('Get teams error:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

// POST - Create a new team
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = createTeamSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name } = validationResult.data

    // Create team and add creator as OWNER in a transaction
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name,
        },
      })

      // Add creator as OWNER
      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: session.user.id,
          role: 'OWNER',
        },
      })

      // Log team creation
      await logTeamActivity(newTeam.id, 'TEAM_CREATED', session.user.id, undefined, tx)

      return newTeam
    })

    return NextResponse.json({
      message: 'Team created successfully',
      team: {
        id: team.id,
        name: team.name,
        createdAt: team.createdAt,
      },
    })
  } catch (error) {
    console.error('Create team error:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}
