import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserNotifications, getUnreadNotificationCount, markAllNotificationsAsRead } from '@/lib/notifications'

// GET - List user notifications
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const [notifications, unreadCount] = await Promise.all([
      getUserNotifications(session.user.id, limit, offset),
      getUnreadNotificationCount(session.user.id),
    ])

    return NextResponse.json({
      notifications,
      unreadCount,
      hasMore: notifications.length === limit,
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: 'Failed to get notifications' }, { status: 500 })
  }
}

// POST - Mark all notifications as read
export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await markAllNotificationsAsRead(session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark all notifications as read error:', error)
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
  }
}
