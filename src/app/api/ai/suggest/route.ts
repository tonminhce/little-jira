import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findSimilarIssues } from '@/lib/ai'

// POST - Find similar issues
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, projectId } = await request.json()

    if (!title || !projectId) {
      return NextResponse.json({ error: 'Title and project ID are required' }, { status: 400 })
    }

    // Get user's team memberships to verify access
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { team: { include: { members: true } } },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const isMember = project.team.members.some((m) => m.userId === session.user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get existing issues in the project
    const existingIssues = await prisma.issue.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
      },
      take: 50,
    })

    // Find similar issues using AI
    const similar = await findSimilarIssues({
      title,
      description,
      existingIssues,
    })

    // Get full details of similar issues
    const similarIssueIds = similar.map((s) => s.id)
    const similarIssues = await prisma.issue.findMany({
      where: { id: { in: similarIssueIds } },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        project: { select: { id: true, name: true } },
      },
    })

    // Merge with similarity reasons
    const result = similarIssues.map((issue) => ({
      ...issue,
      similarity: similar.find((s) => s.id === issue.id)?.similarity || 'Similar topic',
    }))

    return NextResponse.json({ similarIssues: result })
  } catch (error) {
    console.error('AI suggest error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to find similar issues' },
      { status: 500 }
    )
  }
}
