import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logTeamActivity } from '@/lib/teams'
import { canManageProject } from '@/lib/projects'

// POST - Archive or restore project
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
    const canManage = await canManageProject(projectId, session.user.id)

    if (!canManage) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const { restore } = body

    if (restore && project.archivedAt) {
      // Restore project
      await prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id: projectId },
          data: { archivedAt: null },
        })

        await logTeamActivity(project.teamId, 'PROJECT_RESTORED', session.user.id, {
          projectId,
          projectName: project.name,
        }, tx)
      })

      return NextResponse.json({ message: 'Project restored successfully', archived: false })
    } else if (!restore && !project.archivedAt) {
      // Archive project
      await prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id: projectId },
          data: { archivedAt: new Date() },
        })

        await logTeamActivity(project.teamId, 'PROJECT_ARCHIVED', session.user.id, {
          projectId,
          projectName: project.name,
        }, tx)
      })

      return NextResponse.json({ message: 'Project archived successfully', archived: true })
    } else {
      return NextResponse.json(
        { error: project.archivedAt ? 'Project is already archived' : 'Project is not archived' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Archive project error:', error)
    return NextResponse.json({ error: 'Failed to archive/restore project' }, { status: 500 })
  }
}
