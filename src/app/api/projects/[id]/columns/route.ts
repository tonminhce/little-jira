import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageProject } from '@/lib/projects'
import { z } from 'zod'

const MAX_COLUMNS_PER_PROJECT = 5

const createColumnSchema = z.object({
  name: z.string().min(1, 'Name is required').max(30, 'Name must be 30 characters or less'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  wipLimit: z.number().int().min(1).max(100).nullable().optional(),
})

// GET - List columns for a project
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

    // Get project to verify access
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { teamId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const columns = await prisma.projectColumn.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { issues: { where: { deletedAt: null } } },
        },
      },
    })

    return NextResponse.json({ columns })
  } catch (error) {
    console.error('Get columns error:', error)
    return NextResponse.json({ error: 'Failed to get columns' }, { status: 500 })
  }
}

// POST - Create a new column
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

    // Check if user can manage project
    const canManage = await canManageProject(projectId, session.user.id)
    if (!canManage) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if project is archived
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { archivedAt: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.archivedAt) {
      return NextResponse.json({ error: 'Cannot add columns to archived project' }, { status: 400 })
    }

    // Check column limit
    const existingCount = await prisma.projectColumn.count({
      where: { projectId },
    })

    if (existingCount >= MAX_COLUMNS_PER_PROJECT) {
      return NextResponse.json(
        { error: `Maximum ${MAX_COLUMNS_PER_PROJECT} custom columns per project` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = createColumnSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, color, wipLimit } = validationResult.data

    const column = await prisma.projectColumn.create({
      data: {
        projectId,
        name,
        color: color || '#6B7280',
        wipLimit,
        order: existingCount,
      },
    })

    return NextResponse.json({ column }, { status: 201 })
  } catch (error) {
    console.error('Create column error:', error)
    return NextResponse.json({ error: 'Failed to create column' }, { status: 500 })
  }
}

// PATCH - Reorder columns
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

    // Check if user can manage project
    const canManage = await canManageProject(projectId, session.user.id)
    if (!canManage) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { columnOrders } = body as { columnOrders: { id: string; order: number }[] }

    if (!Array.isArray(columnOrders)) {
      return NextResponse.json({ error: 'Invalid column orders' }, { status: 400 })
    }

    // Update orders in transaction
    await prisma.$transaction(
      columnOrders.map(({ id, order }) =>
        prisma.projectColumn.update({
          where: { id, projectId },
          data: { order },
        })
      )
    )

    return NextResponse.json({ message: 'Columns reordered successfully' })
  } catch (error) {
    console.error('Reorder columns error:', error)
    return NextResponse.json({ error: 'Failed to reorder columns' }, { status: 500 })
  }
}
