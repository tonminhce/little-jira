import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessProjectIssues, isProjectArchived, countProjectIssues, isValidAssignee, ISSUE_PRIORITIES } from '@/lib/issues'
import { logTeamActivity, getUserTeamRole } from '@/lib/teams'
import { z } from 'zod'

const createIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(5000, 'Description must be 5000 characters or less').optional(),
  assigneeId: z.string().optional().nullable(),
  previousAssigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  labelIds: z.array(z.string()).max(5, 'Maximum 5 labels per issue').optional(),
})

const MAX_ISSUES_PER_PROJECT = 200

// GET - List issues for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const hasAccess = await canAccessProjectIssues(projectId, session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const priority = searchParams.get('priority') || undefined
    const assigneeIdParam = searchParams.get('assigneeId')
    // Handle "unassigned" special case - convert to null for database query
    const assigneeId = assigneeIdParam === 'unassigned' ? null : (assigneeIdParam || undefined)
    const search = searchParams.get('search') || undefined
    const labelId = searchParams.get('labelId') || undefined
    const hasDueDate = searchParams.get('hasDueDate') === 'true'
    const dueBefore = searchParams.get('dueBefore') ? new Date(searchParams.get('dueBefore')!) : undefined
    const dueAfter = searchParams.get('dueAfter') ? new Date(searchParams.get('dueAfter')!) : undefined
    const sortBy = (searchParams.get('sortBy') as 'createdAt' | 'updatedAt' | 'dueDate' | 'priority') || undefined
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined

    const issues = await prisma.issue.findMany({
      where: {
        projectId,
        deletedAt: null,
        ...(status && { status }),
        ...(priority && { priority }),
        // Handle both null (unassigned) and specific assigneeId
        ...(assigneeIdParam === 'unassigned' ? { assigneeId: null } : (assigneeId && { assigneeId })),
        ...(search && { title: { contains: search, mode: 'insensitive' } }),
        ...(labelId && { labels: { some: { labelId } } }),
        ...(hasDueDate && { dueDate: { not: null } }),
        ...(dueBefore && { dueDate: { lte: dueBefore } }),
        ...(dueAfter && { dueDate: { gte: dueAfter } }),
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        labels: {
          include: {
            label: true,
          },
        },
      },
      orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
    })

    return NextResponse.json({
      issues: issues.map((issue) => ({
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
        labels: issue.labels.map((l) => l.label),
      })),
    })
  } catch (error) {
    console.error('Get issues error:', error)
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
  }
}

// POST - Create a new issue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const hasAccess = await canAccessProjectIssues(projectId, session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if project is archived
    const archived = await isProjectArchived(projectId)
    if (archived) {
      return NextResponse.json(
        { error: 'Cannot create issues in archived project' },
        { status: 400 }
      )
    }

    // Check issue limit
    const issueCount = await countProjectIssues(projectId)
    if (issueCount >= MAX_ISSUES_PER_PROJECT) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ISSUES_PER_PROJECT} issues per project` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = createIssueSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { title, description, assigneeId, previousAssigneeId, dueDate, priority, labelIds } = validationResult.data

    // Validate assignee is team member
    if (assigneeId) {
      const validAssignee = await isValidAssignee(projectId, assigneeId)
      if (!validAssignee) {
        return NextResponse.json(
          { error: 'Assignee must be a team member' },
          { status: 400 }
        )
      }
    }

    // Validate labelIds if provided
    if (labelIds && labelIds.length > 0) {
      const validLabels = await prisma.issueLabel.count({
        where: { id: { in: labelIds }, projectId },
      })
      if (validLabels !== labelIds.length) {
        return NextResponse.json({ error: 'Invalid label IDs' }, { status: 400 })
      }
    }

    // Get project for team ID
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { teamId: true, name: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const issue = await prisma.$transaction(async (tx) => {
      const newIssue = await tx.issue.create({
        data: {
          projectId,
          ownerId: session.user.id,
          title,
          description,
          assigneeId: assigneeId || null,
          previousAssigneeId: previousAssigneeId || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          priority: priority || 'MEDIUM',
          status: 'BACKLOG',
          ...(labelIds && labelIds.length > 0 && {
            labels: {
              create: labelIds.map((labelId) => ({
                labelId,
              })),
            },
          }),
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
          labels: {
            include: { label: true },
          },
        },
      })

      // Log activity
      await logTeamActivity(
        project.teamId,
        'ISSUE_CREATED',
        session.user.id,
        { issueId: newIssue.id, issueTitle: newIssue.title, projectName: project.name },
        tx
      )

      return newIssue
    })

    return NextResponse.json({
      message: 'Issue created successfully',
      issue: {
        id: issue.id,
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        owner: issue.owner,
        labels: issue.labels.map((l) => l.label),
      },
    })
  } catch (error) {
    console.error('Create issue error:', error)
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
  }
}
