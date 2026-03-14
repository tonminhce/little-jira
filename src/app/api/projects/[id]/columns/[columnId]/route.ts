import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageProject } from '@/lib/projects'
import { z } from 'zod'

const updateColumnSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  wipLimit: z.number().int().min(1).max(100).nullable().optional(),
})

// PATCH - Update a column
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, columnId } = await params

    // Check if user can manage project
    const canManage = await canManageProject(projectId, session.user.id)
    if (!canManage) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check column exists and belongs to project
    const column = await prisma.projectColumn.findFirst({
      where: { id: columnId, projectId },
    })

    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    const body = await request.json()
    const validationResult = updateColumnSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, color, wipLimit } = validationResult.data

    const updatedColumn = await prisma.projectColumn.update({
      where: { id: columnId },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(wipLimit !== undefined && { wipLimit }),
      },
    })

    return NextResponse.json({ column: updatedColumn })
  } catch (error) {
    console.error('Update column error:', error)
    return NextResponse.json({ error: 'Failed to update column' }, { status: 500 })
  }
}

// DELETE - Delete a column
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, columnId } = await params

    // Check if user can manage project
    const canManage = await canManageProject(projectId, session.user.id)
    if (!canManage) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check column exists and belongs to project
    const column = await prisma.projectColumn.findFirst({
      where: { id: columnId, projectId },
      include: {
        _count: {
          select: { issues: { where: { deletedAt: null } } },
        },
      },
    })

    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    // Check if column has issues
    if (column._count.issues > 0) {
      return NextResponse.json(
        { error: 'Cannot delete column with issues. Move issues first.' },
        { status: 400 }
      )
    }

    await prisma.projectColumn.delete({
      where: { id: columnId },
    })

    return NextResponse.json({ message: 'Column deleted successfully' })
  } catch (error) {
    console.error('Delete column error:', error)
    return NextResponse.json({ error: 'Failed to delete column' }, { status: 500 })
  }
}
