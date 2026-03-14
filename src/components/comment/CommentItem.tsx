'use client'

import { useState } from 'react'
import { Edit, Trash2 } from 'lucide-react'
import { CommentForm } from './CommentForm'

interface Comment {
  id: string
  body: string
  createdAt: string | Date
  updatedAt: string | Date
  user: {
    id: string
    name: string | null
    email: string
    image?: string | null
  }
}

interface CommentItemProps {
  comment: Comment
  currentUserId: string
  isAdmin: boolean
  isArchived: boolean
  onUpdate: (body: string) => Promise<void>
  onDelete: () => Promise<void>
}

function formatTimeAgo(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

  return then.toLocaleDateString()
}

export function CommentItem({
  comment,
  currentUserId,
  isAdmin,
  isArchived,
  onUpdate,
  onDelete,
}: CommentItemProps) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const isOwner = comment.user.id === currentUserId
  const canEdit = isOwner && !isArchived
  const canDelete = (isOwner || isAdmin) && !isArchived

  async function handleUpdate(body: string) {
    setLoading(true)
    try {
      await onUpdate(body)
      setEditing(false)
    } finally {
      setLoading(false)
    }
  }

  const wasEdited = new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000

  if (editing) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
            {(comment.user.name || comment.user.email)[0].toUpperCase()}
          </div>
          <span className="font-medium text-gray-900">
            {comment.user.name || comment.user.email}
          </span>
        </div>
        <CommentForm
          initialBody={comment.body}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          submitLabel="Save"
        />
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {comment.user.image ? (
            <img
              src={comment.user.image}
              alt={comment.user.name || comment.user.email}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
              {(comment.user.name || comment.user.email)[0].toUpperCase()}
            </div>
          )}
          <div>
            <span className="font-medium text-gray-900">
              {comment.user.name || comment.user.email}
            </span>
            <div className="text-xs text-gray-500">
              {formatTimeAgo(comment.createdAt)}
              {wasEdited && ' (edited)'}
            </div>
          </div>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
              >
                <Edit className="w-3 h-3" />
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                disabled={loading}
                className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 text-gray-700 whitespace-pre-wrap pl-11">
        {comment.body}
      </div>
    </div>
  )
}
