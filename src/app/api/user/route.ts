import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  image: z.string().url().max(500).optional().or(z.literal('')),
})

// GET - Get current user profile
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has password (for OAuth users)
    const userWithPassword = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    return NextResponse.json({
      ...user,
      hasPassword: !!userWithPassword?.password,
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    )
  }
}

// PATCH - Update profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const validationResult = updateProfileSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, image } = validationResult.data

    const updateData: { name?: string; image?: string | null } = {}
    if (name !== undefined) updateData.name = name
    if (image !== undefined) updateData.image = image || null

    const user = await prisma.user.update({
      where: {
        id: session.user.id,
        deletedAt: null,
      },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
