import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole } from '@/lib/teams'
import { z } from 'zod'

const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  completed: z.boolean().optional(),
})

// PATCH - Update a subtask
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: issueId, subtaskId } = await params

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
      return NextResponse.json({ error: 'Cannot update subtasks in archived project' }, { status: 400 })
    }

    // Check user is team member
    const userRole = await getUserTeamRole(issue.project.teamId, session.user.id)
    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check subtask exists and belongs to this issue
    const subtask = await prisma.subtask.findFirst({
      where: { id: subtaskId, issueId },
    })

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    const body = await request.json()
    const validationResult = updateSubtaskSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { title, completed } = validationResult.data

    const updatedSubtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        ...(title !== undefined && { title }),
        ...(completed !== undefined && { completed }),
      },
    })

    return NextResponse.json({ subtask: updatedSubtask })
  } catch (error) {
    console.error('Update subtask error:', error)
    return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 })
  }
}

// DELETE - Delete a subtask
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: issueId, subtaskId } = await params

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
      return NextResponse.json({ error: 'Cannot delete subtasks in archived project' }, { status: 400 })
    }

    // Check user is team member
    const userRole = await getUserTeamRole(issue.project.teamId, session.user.id)
    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check subtask exists and belongs to this issue
    const subtask = await prisma.subtask.findFirst({
      where: { id: subtaskId, issueId },
    })

    if (!subtask) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 })
    }

    await prisma.subtask.delete({
      where: { id: subtaskId },
    })

    return NextResponse.json({ message: 'Subtask deleted successfully' })
  } catch (error) {
    console.error('Delete subtask error:', error)
    return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 })
  }
}
