import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateIssueSummary } from '@/lib/ai'
import { canAccessProjectIssues } from '@/lib/issues'

// POST - Generate AI summary for an issue
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { issueId } = await request.json()

    if (!issueId) {
      return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 })
    }

    // Get issue with comments and history
    const issue = await prisma.issue.findFirst({
      where: { id: issueId, deletedAt: null },
      include: {
        project: true,
        comments: {
          where: { deletedAt: null },
          include: {
            user: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 10,
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

    // Generate summary
    const summary = await generateIssueSummary({
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      comments: issue.comments.map((c) => ({
        body: c.body,
        userName: c.user.name || 'User',
      })),
      history: issue.history.map((h) => ({
        field: h.field,
        oldValue: h.oldValue,
        newValue: h.newValue,
      })),
    })

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('AI summary error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
