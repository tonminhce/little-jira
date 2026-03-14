import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const requestResetSchema = z.object({
  email: z.string().email().max(255),
})

const confirmResetSchema = z.object({
  token: z.string(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
})

// POST - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validationResult = requestResetSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    // Always return success message to prevent email enumeration
    const successResponse = NextResponse.json({
      message: 'If an account with that email exists, a reset link has been sent.',
    })

    // Check if user exists and has a password (not OAuth-only)
    const user = await prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
        password: { not: null },
      },
    })

    if (!user) {
      return successResponse
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    })

    // Send email
    await sendPasswordResetEmail({ email, token })

    return successResponse
  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// PATCH - Confirm password reset
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    const validationResult = confirmResetSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { token, password } = validationResult.data

    // Find and validate token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      )
    }

    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await prisma.verificationToken.delete({ where: { token } })
      return NextResponse.json(
        { error: 'Reset link has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email: verificationToken.identifier,
        deletedAt: null,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update password and delete token atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ])

    return NextResponse.json({
      message: 'Password updated successfully',
    })
  } catch (error) {
    console.error('Password reset confirmation error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
