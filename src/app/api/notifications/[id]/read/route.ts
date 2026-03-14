import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { markNotificationAsRead } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH - Mark a single notification as read
export async function PATCH(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await markNotificationAsRead(session.user.id, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark notification as read error:', error)
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
  }
}
