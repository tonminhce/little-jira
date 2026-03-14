'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Bell, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  read: boolean
  createdAt: string
  actor: { id: string; name: string | null; email: string; image: string | null } | null
  issue: { id: string; title: string } | null
  project: { id: string; name: string } | null
  team: { id: string; name: string } | null
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
  hasMore: boolean
}

const TYPE_ICONS: Record<string, string> = {
  ISSUE_ASSIGNED: '📋',
  ISSUE_UPDATED: '✏️',
  COMMENT_ADDED: '💬',
  DUE_DATE_REMINDER: '⏰',
  ISSUE_MENTIONED: '📣',
  ISSUE_COMPLETED: '✅',
}

const TYPE_LABELS: Record<string, string> = {
  ISSUE_ASSIGNED: 'Issue Assigned',
  ISSUE_UPDATED: 'Issue Updated',
  COMMENT_ADDED: 'New Comment',
  DUE_DATE_REMINDER: 'Due Date Reminder',
  ISSUE_MENTIONED: 'Mentioned',
  ISSUE_COMPLETED: 'Issue Completed',
}

export function NotificationsList() {
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingRead, setMarkingRead] = useState(false)
  const [offset, setOffset] = useState(0)
  const limit = 20

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notifications?limit=${limit}&offset=${offset}`)
      if (response.ok) {
        const json = await response.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAllAsRead = async () => {
    setMarkingRead(true)
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
      })
      if (response.ok) {
        fetchNotifications()
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    } finally {
      setMarkingRead(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      })
      if (response.ok) {
        fetchNotifications()
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const getNotificationLink = (notification: Notification) => {
    if (notification.issue) {
      return `/issues/${notification.issue.id}`
    }
    if (notification.project) {
      return `/projects/${notification.project.id}`
    }
    if (notification.team) {
      return `/teams/${notification.team.id}`
    }
    return '#'
  }

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0
  const hasMore = data?.hasMore || false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} disabled={markingRead} variant="secondary">
            {markingRead ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No notifications yet</p>
              <p className="text-gray-400 text-sm mt-1">
                When you get notifications, they'll show up here
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-2xl flex-shrink-0">
                      {TYPE_ICONS[notification.type] || '📌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="inline-block text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded mb-1">
                            {TYPE_LABELS[notification.type] || notification.type}
                          </span>
                          <Link
                            href={getNotificationLink(notification)}
                            onClick={() => !notification.read && markAsRead(notification.id)}
                            className="block font-medium text-gray-900 hover:text-blue-600"
                          >
                            {notification.title}
                          </Link>
                        </div>
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex-shrink-0"
                          >
                            Mark read
                          </button>
                        )}
                      </div>

                      {notification.body && (
                        <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {notification.actor && (
                          <span>
                            by {notification.actor.name || notification.actor.email}
                          </span>
                        )}
                        {notification.issue && (
                          <Link
                            href={`/issues/${notification.issue.id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View issue
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {offset + 1} to {offset + notifications.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOffset(offset + limit)}
              disabled={!hasMore}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
