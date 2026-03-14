import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logTeamActivity } from '@/lib/teams'
import { getProjectById, canManageProject, canViewProject } from '@/lib/projects'
import { z } from 'zod'

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name must be 100 characters or less').optional(),
  description: z.string().max(2000, 'Description must be 2000 characters or less').nullable().optional(),
})

// GET - Get project details
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
    const canView = await canViewProject(projectId, session.user.id)

    if (!canView) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const project = await getProjectById(projectId, session.user.id)

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Get project error:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

// PATCH - Update project
export async function PATCH(
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

    const body = await request.json()
    const validationResult = updateProjectSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { name, description } = validationResult.data

    const updatedProject = await prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: projectId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
        },
      })

      await logTeamActivity(project.teamId, 'PROJECT_UPDATED', session.user.id, {
        projectId,
        projectName: updated.name,
        changes: { name, description },
      }, tx)

      return updated
    })

    return NextResponse.json({
      message: 'Project updated successfully',
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        updatedAt: updatedProject.updatedAt,
      },
    })
  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

// DELETE - Soft delete project
export async function DELETE(
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

    await prisma.$transaction(async (tx) => {
      await logTeamActivity(project.teamId, 'PROJECT_DELETED', session.user.id, {
        projectId,
        projectName: project.name,
      }, tx)

      await tx.project.update({
        where: { id: projectId },
        data: { deletedAt: new Date() },
      })
    })

    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}
