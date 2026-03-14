import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole } from '@/lib/teams'
import { z } from 'zod'

const MAX_SUBTASKS_PER_ISSUE = 20

const createSubtaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
})

// GET - List subtasks for an issue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: issueId } = await params

    // Get issue to check access
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, deletedAt: null },
      include: {
        project: {
          select: { teamId: true },
        },
      },
    })

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // Check user is team member
    const userRole = await getUserTeamRole(issue.project.teamId, session.user.id)
    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const subtasks = await prisma.subtask.findMany({
      where: { issueId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ subtasks })
  } catch (error) {
    console.error('Get subtasks error:', error)
    return NextResponse.json({ error: 'Failed to get subtasks' }, { status: 500 })
  }
}

// POST - Create a new subtask
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: issueId } = await params

    // Get issue to check access
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, deletedAt: null },
      include: {
        project: {
          select: { teamId: true, archivedAt: true },
        },
      },
    })

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // Check if project is archived
    if (issue.project.archivedAt) {
      return NextResponse.json({ error: 'Cannot add subtasks to archived project' }, { status: 400 })
    }

    // Check user is team member
    const userRole = await getUserTeamRole(issue.project.teamId, session.user.id)
    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check subtask limit
    const existingCount = await prisma.subtask.count({
      where: { issueId },
    })

    if (existingCount >= MAX_SUBTASKS_PER_ISSUE) {
      return NextResponse.json(
        { error: `Maximum ${MAX_SUBTASKS_PER_ISSUE} subtasks per issue` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = createSubtaskSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { title } = validationResult.data

    const subtask = await prisma.subtask.create({
      data: {
        issueId,
        title,
        order: existingCount,
      },
    })

    return NextResponse.json({ subtask }, { status: 201 })
  } catch (error) {
    console.error('Create subtask error:', error)
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 })
  }
}
