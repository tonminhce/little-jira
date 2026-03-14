'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Bell, Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
}

const TYPE_ICONS: Record<string, string> = {
  ISSUE_ASSIGNED: '📋',
  ISSUE_UPDATED: '✏️',
  COMMENT_ADDED: '💬',
  DUE_DATE_REMINDER: '⏰',
  ISSUE_MENTIONED: '📣',
  ISSUE_COMPLETED: '✅',
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10')
      if (response.ok) {
        const json = await response.json()
        setData(json)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000) // Poll every minute
    return () => clearInterval(interval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mark single notification as read
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

  // Mark all as read
  const markAllAsRead = async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }

  // Get link for notification
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

  const unreadCount = data?.unreadCount || 0

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {!data ? (
              <div className="p-4 text-center text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </div>
            ) : data.notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              data.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b hover:bg-gray-50 ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">
                      {TYPE_ICONS[notification.type] || '📌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={getNotificationLink(notification)}
                        onClick={() => {
                          markAsRead(notification.id)
                          setIsOpen(false)
                        }}
                        className="block"
                      >
                        <p className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2">
                          {notification.title}
                        </p>
                      </Link>
                      {notification.body && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t bg-gray-50">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-sm text-blue-600 hover:text-blue-800 py-1"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
