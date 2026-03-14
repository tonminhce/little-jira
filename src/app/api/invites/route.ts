import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List pending invites for current user
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invites = await prisma.teamInvite.findMany({
      where: {
        email: session.user.email,
        expiresAt: { gt: new Date() },
        team: { deletedAt: null },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      invites: invites.map((invite) => ({
        id: invite.id,
        token: invite.token,
        teamId: invite.team.id,
        teamName: invite.team.name,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      })),
    })
  } catch (error) {
    console.error('Get invites error:', error)
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
  }
}
