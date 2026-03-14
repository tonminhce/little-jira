'use client'

import { useState, useEffect } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { Activity } from 'lucide-react'

interface Activity {
  id: string
  type: string
  userId: string | null
  metadata: string | null
  createdAt: string
}

interface ActivityLogProps {
  teamId: string
}

const activityLabels: Record<string, string> = {
  MEMBER_JOINED: 'Member joined',
  MEMBER_LEFT: 'Member left',
  MEMBER_KICKED: 'Member removed',
  ROLE_CHANGED: 'Role changed',
  TEAM_CREATED: 'Team created',
  TEAM_UPDATED: 'Team updated',
  TEAM_DELETED: 'Team deleted',
  INVITE_SENT: 'Invitation sent',
  OWNERSHIP_TRANSFERRED: 'Ownership transferred',
}

const activityColors: Record<string, string> = {
  MEMBER_JOINED: 'bg-green-100 text-green-800',
  MEMBER_LEFT: 'bg-gray-100 text-gray-800',
  MEMBER_KICKED: 'bg-red-100 text-red-800',
  ROLE_CHANGED: 'bg-blue-100 text-blue-800',
  TEAM_CREATED: 'bg-purple-100 text-purple-800',
  TEAM_UPDATED: 'bg-yellow-100 text-yellow-800',
  TEAM_DELETED: 'bg-red-100 text-red-800',
  INVITE_SENT: 'bg-blue-100 text-blue-800',
  OWNERSHIP_TRANSFERRED: 'bg-purple-100 text-purple-800',
}

export function ActivityLog({ teamId }: ActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchActivities()
  }, [teamId])

  async function fetchActivities() {
    try {
      const response = await fetch(`/api/teams/${teamId}/activity`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities)
      } else {
        setError('Failed to load activity log')
      }
    } catch {
      setError('Failed to load activity log')
    } finally {
      setLoading(false)
    }
  }

  function getMetadataDisplay(metadata: string | null): string {
    if (!metadata) return ''
    try {
      const data = JSON.parse(metadata)
      if (data.email) return `(${data.email})`
      if (data.targetUserName && data.newRole) return `(${data.targetUserName} → ${data.newRole})`
      if (data.kickedUserName) return `(${data.kickedUserName})`
      if (data.newName) return `(renamed to "${data.newName}")`
      return ''
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
        {error}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Activity will appear here as team members interact with the team."
        />
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg divide-y">
      {activities.map((activity) => (
        <div key={activity.id} className="p-4 flex items-center gap-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              activityColors[activity.type] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {activityLabels[activity.type] || activity.type}
          </span>
          <span className="text-gray-600">
            {getMetadataDisplay(activity.metadata)}
          </span>
          <span className="text-sm text-gray-400 ml-auto">
            {new Date(activity.createdAt).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}
