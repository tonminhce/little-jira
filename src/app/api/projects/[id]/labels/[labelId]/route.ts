import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageProject } from '@/lib/projects'
import { z } from 'zod'

const updateLabelSchema = z.object({
  name: z.string().min(1, 'Label name is required').max(30, 'Label name must be 30 characters or less').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid HEX color code').optional(),
})

// PATCH - Update a label
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, labelId } = await params
    const canManage = await canManageProject(projectId, session.user.id)

    if (!canManage) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const label = await prisma.issueLabel.findFirst({
      where: { id: labelId, projectId },
    })

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    const body = await request.json()
    const validationResult = updateLabelSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, color } = validationResult.data

    // Check for duplicate name if name is being changed
    if (name && name !== label.name) {
      const existing = await prisma.issueLabel.findFirst({
        where: { projectId, name, id: { not: labelId } },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Label with this name already exists' },
          { status: 400 }
        )
      }
    }

    const updatedLabel = await prisma.issueLabel.update({
      where: { id: labelId },
      data: {
        ...(name && { name }),
        ...(color && { color }),
      },
    })

    return NextResponse.json({
      message: 'Label updated successfully',
      label: updatedLabel,
    })
  } catch (error) {
    console.error('Update label error:', error)
    return NextResponse.json({ error: 'Failed to update label' }, { status: 500 })
  }
}

// DELETE - Delete a label
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId, labelId } = await params
    const canManage = await canManageProject(projectId, session.user.id)

    if (!canManage) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const label = await prisma.issueLabel.findFirst({
      where: { id: labelId, projectId },
    })

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    // Delete label (IssueAssignment will be cascade deleted)
    await prisma.issueLabel.delete({
      where: { id: labelId },
    })

    return NextResponse.json({ message: 'Label deleted successfully' })
  } catch (error) {
    console.error('Delete label error:', error)
    return NextResponse.json({ error: 'Failed to delete label' }, { status: 500 })
  }
}
