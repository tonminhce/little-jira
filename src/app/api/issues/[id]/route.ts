import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canDeleteIssue, canAccessProjectIssues, isProjectArchived, logIssueChange, isValidAssignee, ISSUE_STATUSES, ISSUE_PRIORITIES } from '@/lib/issues'
import { logTeamActivity } from '@/lib/teams'
import { notifyIssueAssigned, notifyIssueUpdated, notifyIssueCompleted } from '@/lib/notifications'
import { z } from 'zod'

const updateIssueSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional(),
  description: z.string().max(5000, 'Description must be 5000 characters or less').optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(['BACKLOG', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  labelIds: z.array(z.string()).max(5, 'Maximum 5 labels per issue').optional(),
})

// GET - Get issue details
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

    const issue = await prisma.issue.findFirst({
      where: { id: issueId, deletedAt: null },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        project: {
          select: {
            id: true,
            name: true,
            teamId: true,
            archivedAt: true,
          },
        },
        labels: {
          include: {
            label: true,
          },
        },
        history: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // Check access
    const hasAccess = await canAccessProjectIssues(issue.projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      issue: {
        id: issue.id,
        projectId: issue.projectId,
        title: issue.title,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        dueDate: issue.dueDate,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        owner: issue.owner,
        assignee: issue.assignee,
        project: issue.project,
        labels: issue.labels.map((l) => l.label),
        history: issue.history,
      },
    })
  } catch (error) {
    console.error('Get issue error:', error)
    return NextResponse.json({ error: 'Failed to fetch issue' }, { status: 500 })
  }
}

// PATCH - Update issue
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: issueId } = await params

    const issue = await prisma.issue.findFirst({
      where: { id: issueId, deletedAt: null },
      include: {
        project: { include: { team: true } },
        owner: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    })

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // Check access
    const hasAccess = await canAccessProjectIssues(issue.projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if project is archived
    const archived = await isProjectArchived(issue.projectId)
    if (archived) {
      return NextResponse.json(
        { error: 'Cannot modify issues in archived project' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = updateIssueSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { title, description, assigneeId, dueDate, status, priority, labelIds } = validationResult.data

    // Validate assignee is team member
    if (assigneeId !== undefined && assigneeId !== null) {
      const validAssignee = await isValidAssignee(issue.projectId, assigneeId)
      if (!validAssignee) {
        return NextResponse.json(
          { error: 'Assignee must be a team member' },
          { status: 400 }
        )
      }
    }

    // Validate labelIds if provided
    if (labelIds !== undefined && labelIds.length > 0) {
      const validLabels = await prisma.issueLabel.count({
        where: { id: { in: labelIds }, projectId: issue.projectId },
      })
      if (validLabels !== labelIds.length) {
        return NextResponse.json({ error: 'Invalid label IDs' }, { status: 400 })
      }
    }

    const updatedIssue = await prisma.$transaction(async (tx) => {
      // Log changes for history
      if (status !== undefined && status !== issue.status) {
        await logIssueChange(issueId, session.user.id, 'status', issue.status, status, tx)
      }
      if (priority !== undefined && priority !== issue.priority) {
        await logIssueChange(issueId, session.user.id, 'priority', issue.priority, priority, tx)
      }
      if (title !== undefined && title !== issue.title) {
        await logIssueChange(issueId, session.user.id, 'title', issue.title, title, tx)
      }
      if (assigneeId !== undefined && assigneeId !== issue.assigneeId) {
        await logIssueChange(issueId, session.user.id, 'assigneeId', issue.assigneeId || null, assigneeId, tx)
      }
      if (dueDate !== undefined) {
        const oldDue = issue.dueDate ? issue.dueDate.toISOString() : null
        const newDue = dueDate ? new Date(dueDate).toISOString() : null
        if (oldDue !== newDue) {
          await logIssueChange(issueId, session.user.id, 'dueDate', oldDue, newDue, tx)
        }
      }

      // Update issue
      const updated = await tx.issue.update({
        where: { id: issueId },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(assigneeId !== undefined && { assigneeId }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(status !== undefined && { status }),
          ...(priority !== undefined && { priority }),
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          labels: { include: { label: true } },
        },
      })

      // Update labels if provided
      if (labelIds !== undefined) {
        // Remove existing labels
        await tx.issueAssignment.deleteMany({
          where: { issueId },
        })
        // Add new labels
        if (labelIds.length > 0) {
          await tx.issueAssignment.createMany({
            data: labelIds.map((labelId) => ({ issueId, labelId })),
          })
        }
      }

      // Log activity
      await logTeamActivity(
        issue.project.teamId,
        'ISSUE_UPDATED',
        session.user.id,
        { issueId: updated.id, issueTitle: updated.title },
        tx
      )

      return updated
    })

    // Send notifications (after transaction completes)
    const teamId = issue.project.teamId
    const projectId = issue.projectId
    const projectName = issue.project.name
    const actorName = session.user.name || session.user.email || 'Someone'

    // Notify on assignment change
    if (assigneeId !== undefined && assigneeId !== issue.assigneeId) {
      if (assigneeId && updatedIssue.assignee) {
        await notifyIssueAssigned({
          issueId,
          issueTitle: updatedIssue.title,
          assigneeId,
          assigneeEmail: updatedIssue.assignee.email,
          actorId: session.user.id,
          actorName,
          projectId,
          projectName,
          teamId,
        })
      }
    }

    // Notify on status change
    if (status !== undefined && status !== issue.status) {
      // Notify issue owner of status changes
      if (issue.ownerId !== session.user.id) {
        await notifyIssueUpdated({
          issueId,
          issueTitle: updatedIssue.title,
          field: 'status',
          oldValue: issue.status,
          newValue: status,
          targetUserId: issue.ownerId,
          actorId: session.user.id,
          projectId,
          teamId,
        })
      }

      // Notify on completion
      if (status === 'DONE' && issue.owner) {
        await notifyIssueCompleted({
          issueId,
          issueTitle: updatedIssue.title,
          ownerId: issue.ownerId,
          ownerEmail: issue.owner.email,
          actorId: session.user.id,
          actorName,
          projectId,
          projectName,
          teamId,
        })
      }
    }

    // Notify on priority change
    if (priority !== undefined && priority !== issue.priority) {
      if (issue.assigneeId && issue.assigneeId !== session.user.id) {
        await notifyIssueUpdated({
          issueId,
          issueTitle: updatedIssue.title,
          field: 'priority',
          oldValue: issue.priority,
          newValue: priority,
          targetUserId: issue.assigneeId,
          actorId: session.user.id,
          projectId,
          teamId,
        })
      }
    }

    return NextResponse.json({
      message: 'Issue updated successfully',
      issue: updatedIssue,
    })
  } catch (error) {
    console.error('Update issue error:', error)
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 })
  }
}

// DELETE - Soft delete issue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: issueId } = await params

    const issue = await prisma.issue.findFirst({
      where: { id: issueId, deletedAt: null },
      include: { project: true },
    })

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // Check delete permission
    const canDelete = await canDeleteIssue(issueId, session.user.id)
    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Check if project is archived
    const archived = await isProjectArchived(issue.projectId)
    if (archived) {
      return NextResponse.json(
        { error: 'Cannot delete issues in archived project' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.issue.update({
        where: { id: issueId },
        data: { deletedAt: new Date() },
      })

      // Log activity
      await logTeamActivity(
        issue.project.teamId,
        'ISSUE_DELETED',
        session.user.id,
        { issueId: issue.id, issueTitle: issue.title },
        tx
      )
    })

    return NextResponse.json({ message: 'Issue deleted successfully' })
  } catch (error) {
    console.error('Delete issue error:', error)
    return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 })
  }
}
