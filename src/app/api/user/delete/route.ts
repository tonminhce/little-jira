import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const deleteAccountSchema = z.object({
  password: z.string().optional(), // Optional for OAuth users
})

// DELETE - Delete user account (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const validationResult = deleteAccountSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
        deletedAt: null,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If user has password, verify it
    if (user.password) {
      const { password } = validationResult.data
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required' },
          { status: 400 }
        )
      }

      const passwordMatch = await bcrypt.compare(password, user.password)
      if (!passwordMatch) {
        return NextResponse.json(
          { error: 'Password is incorrect' },
          { status: 400 }
        )
      }
    }

    // TODO: Check for owned teams when team feature is implemented
    // const ownedTeams = await prisma.team.count({
    //   where: { ownerId: session.user.id, deletedAt: null }
    // })
    // if (ownedTeams > 0) {
    //   return NextResponse.json(
    //     { error: 'Please delete or transfer owned teams first' },
    //     { status: 400 }
    //   )
    // }

    // Soft delete user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
