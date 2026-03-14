import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessProjectIssues, isProjectArchived, logIssueChange, ISSUE_STATUSES } from '@/lib/issues'
import { logTeamActivity } from '@/lib/teams'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['BACKLOG', 'IN_PROGRESS', 'DONE']),
})

// PATCH - Update issue status
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
      include: { project: true },
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
    const validationResult = updateStatusSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { status: newStatus } = validationResult.data

    // No change needed
    if (newStatus === issue.status) {
      return NextResponse.json({ message: 'Status unchanged', issue })
    }

    const updatedIssue = await prisma.$transaction(async (tx) => {
      // Log change to history
      await logIssueChange(issueId, session.user.id, 'status', issue.status, newStatus, tx)

      // Update issue
      const updated = await tx.issue.update({
        where: { id: issueId },
        data: { status: newStatus },
        include: {
          owner: { select: { id: true, name: true, email: true, image: true } },
          assignee: { select: { id: true, name: true, email: true, image: true } },
          labels: { include: { label: true } },
        },
      })

      // Log team activity
      await logTeamActivity(
        issue.project.teamId,
        'ISSUE_UPDATED',
        session.user.id,
        { issueId: updated.id, issueTitle: updated.title, field: 'status', newStatus },
        tx
      )

      return updated
    })

    return NextResponse.json({
      message: 'Status updated successfully',
      issue: {
        ...updatedIssue,
        labels: updatedIssue.labels.map((l) => l.label),
      },
    })
  } catch (error) {
    console.error('Update status error:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
