import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole, logTeamActivity } from '@/lib/teams'
import { z } from 'zod'

const transferOwnershipSchema = z.object({
  newOwnerId: z.string(),
})

// POST - Transfer ownership (OWNER only, to ADMIN only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params
    const userRole = await getUserTeamRole(teamId, session.user.id)

    if (userRole !== 'OWNER') {
      return NextResponse.json({ error: 'Only owner can transfer ownership' }, { status: 403 })
    }

    const body = await request.json()
    const validationResult = transferOwnershipSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { newOwnerId } = validationResult.data

    // Get current owner's membership
    const currentOwnerMembership = await prisma.teamMember.findFirst({
      where: { teamId, role: 'OWNER' },
    })

    if (!currentOwnerMembership) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 400 })
    }

    // Get target member
    const targetMember = await prisma.teamMember.findUnique({
      where: { id: newOwnerId },
      include: { user: true },
    })

    if (!targetMember || targetMember.teamId !== teamId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Can only transfer to ADMIN
    if (targetMember.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Can only transfer to ADMIN' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Demote current owner to ADMIN
      await tx.teamMember.update({
        where: { id: currentOwnerMembership.id },
        data: { role: 'ADMIN' },
      })

      // Promote new owner to OWNER
      await tx.teamMember.update({
        where: { id: newOwnerId },
        data: { role: 'OWNER' },
      })

      // Log activity
      await logTeamActivity(teamId, 'OWNERSHIP_TRANSFERRED', session.user.id, {
        previousOwnerName: session.user.name,
        newOwnerName: targetMember.user.name,
        newOwnerEmail: targetMember.user.email,
      }, tx)
    })

    return NextResponse.json({ message: 'Ownership transferred successfully' })
  } catch (error) {
    console.error('Transfer ownership error:', error)
    return NextResponse.json({ error: 'Failed to transfer ownership' }, { status: 500 })
  }
}
