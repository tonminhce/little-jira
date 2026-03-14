import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole } from '@/lib/teams'
import { isProjectArchived } from '@/lib/issues'
import { logTeamActivity } from '@/lib/teams'
import { z } from 'zod'

const updateCommentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment must be 5000 characters or less'),
})

// PATCH - Update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: commentId } = await params

    const comment = await prisma.comment.findFirst({
      where: { id: commentId, deletedAt: null },
      include: {
        issue: {
          include: {
            project: { include: { team: true } },
          },
        },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Only comment owner can edit
    if (comment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Check if project is archived
    const archived = await isProjectArchived(comment.issue.projectId)
    if (archived) {
      return NextResponse.json(
        { error: 'Cannot modify comments in archived project' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = updateCommentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { body: newBody } = validationResult.data

    const updatedComment = await prisma.$transaction(async (tx) => {
      const updated = await tx.comment.update({
        where: { id: commentId },
        data: { body: newBody },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      })

      // Log activity
      await logTeamActivity(
        comment.issue.project.teamId,
        'COMMENT_UPDATED',
        session.user.id,
        { issueId: comment.issue.id, issueTitle: comment.issue.title, commentId },
        tx
      )

      return updated
    })

    return NextResponse.json({
      message: 'Comment updated successfully',
      comment: {
        id: updatedComment.id,
        body: updatedComment.body,
        createdAt: updatedComment.createdAt,
        updatedAt: updatedComment.updatedAt,
        user: updatedComment.user,
      },
    })
  } catch (error) {
    console.error('Update comment error:', error)
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })
  }
}

// DELETE - Soft delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: commentId } = await params

    const comment = await prisma.comment.findFirst({
      where: { id: commentId, deletedAt: null },
      include: {
        issue: {
          include: {
            project: { include: { team: true } },
          },
        },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Check if user is comment owner or team admin
    const userRole = await getUserTeamRole(comment.issue.project.teamId, session.user.id)
    const isOwner = comment.userId === session.user.id
    const isTeamAdmin = userRole === 'OWNER' || userRole === 'ADMIN'

    if (!isOwner && !isTeamAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Check if project is archived
    const archived = await isProjectArchived(comment.issue.projectId)
    if (archived) {
      return NextResponse.json(
        { error: 'Cannot delete comments in archived project' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.comment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() },
      })

      // Log activity
      await logTeamActivity(
        comment.issue.project.teamId,
        'COMMENT_DELETED',
        session.user.id,
        { issueId: comment.issue.id, issueTitle: comment.issue.title, commentId },
        tx
      )
    })

    return NextResponse.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
