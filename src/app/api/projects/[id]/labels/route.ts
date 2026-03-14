import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessProjectIssues, countProjectLabels } from '@/lib/issues'
import { canManageProject } from '@/lib/projects'
import { z } from 'zod'

const createLabelSchema = z.object({
  name: z.string().min(1, 'Label name is required').max(30, 'Label name must be 30 characters or less'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid HEX color code'),
})

const updateLabelSchema = z.object({
  name: z.string().min(1, 'Label name is required').max(30, 'Label name must be 30 characters or less').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid HEX color code').optional(),
})

const MAX_LABELS_PER_PROJECT = 20

// GET - List labels for a project
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
    const hasAccess = await canAccessProjectIssues(projectId, session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const labels = await prisma.issueLabel.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ labels })
  } catch (error) {
    console.error('Get labels error:', error)
    return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 })
  }
}

// POST - Create a new label
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

    // Check label limit
    const labelCount = await countProjectLabels(projectId)
    if (labelCount >= MAX_LABELS_PER_PROJECT) {
      return NextResponse.json(
        { error: `Maximum ${MAX_LABELS_PER_PROJECT} labels per project` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = createLabelSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, color } = validationResult.data

    // Check for duplicate name
    const existing = await prisma.issueLabel.findFirst({
      where: { projectId, name },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Label with this name already exists' },
        { status: 400 }
      )
    }

    const label = await prisma.issueLabel.create({
      data: {
        projectId,
        name,
        color,
      },
    })

    return NextResponse.json({
      message: 'Label created successfully',
      label,
    })
  } catch (error) {
    console.error('Create label error:', error)
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 })
  }
}
