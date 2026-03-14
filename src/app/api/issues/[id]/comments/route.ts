import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessProjectIssues, isProjectArchived } from '@/lib/issues'
import { logTeamActivity } from '@/lib/teams'
import { notifyCommentAdded } from '@/lib/notifications'
import { z } from 'zod'

const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment must be 5000 characters or less'),
})

// GET - List comments for an issue
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

    // Get issue to verify access
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, deletedAt: null },
      include: { project: { include: { team: true } } },
    })

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // Check access
    const hasAccess = await canAccessProjectIssues(issue.projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get comments
    const comments = await prisma.comment.findMany({
      where: {
        issueId,
        deletedAt: null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      comments: comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        user: comment.user,
      })),
    })
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

// POST - Create a new comment
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

    // Get issue to verify access
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
        { error: 'Cannot add comments to issues in archived project' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = createCommentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { body: commentBody } = validationResult.data

    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          issueId,
          userId: session.user.id,
          body: commentBody,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      })

      // Log activity
      await logTeamActivity(
        issue.project.teamId,
        'COMMENT_CREATED',
        session.user.id,
        { issueId: issue.id, issueTitle: issue.title, commentId: newComment.id },
        tx
      )

      return newComment
    })

    // Send notification for new comment
    const targetUsers = [
      issue.owner,
      issue.assignee,
    ]
      .filter((user): user is NonNullable<typeof user> => user !== null && user.id !== session.user.id)
      .map((user) => ({ id: user.id, email: user.email }))

    if (targetUsers.length > 0) {
      await notifyCommentAdded({
        issueId,
        issueTitle: issue.title,
        commentAuthorId: session.user.id,
        commentAuthorName: session.user.name || session.user.email || 'Someone',
        commentBody: commentBody,
        targetUsers,
        projectId: issue.projectId,
        teamId: issue.project.teamId,
      })
    }

    return NextResponse.json({
      message: 'Comment created successfully',
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        user: comment.user,
      },
    })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}
