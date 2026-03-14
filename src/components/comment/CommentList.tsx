'use client'

import { useState, useEffect } from 'react'
import { CommentItem } from './CommentItem'
import { CommentForm } from './CommentForm'
import { Skeleton, SkeletonComment } from '@/components/ui/skeleton'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { MessageCircle } from 'lucide-react'

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

interface CommentListProps {
  issueId: string
  currentUserId: string
  isAdmin: boolean
  isArchived: boolean
}

export function CommentList({ issueId, currentUserId, isAdmin, isArchived }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { confirm, dialog } = useConfirm()

  async function fetchComments() {
    try {
      const response = await fetch(`/api/issues/${issueId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments)
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err)
      setError('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [issueId])

  async function handleCreate(body: string) {
    const response = await fetch(`/api/issues/${issueId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create comment')
    }

    setComments([...comments, data.comment])
  }

  async function handleUpdate(commentId: string, body: string) {
    const response = await fetch(`/api/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update comment')
    }

    setComments(comments.map((c) => (c.id === commentId ? data.comment : c)))
  }

  async function handleDelete(commentId: string) {
    const confirmed = await confirm({
      title: 'Delete Comment',
      description: 'Are you sure you want to delete this comment? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!confirmed) return

    const response = await fetch(`/api/comments/${commentId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete comment')
    }

    setComments(comments.filter((c) => c.id !== commentId))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="text" className="w-32 h-6" />
        <div className="space-y-4">
          <SkeletonComment />
          <SkeletonComment />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {dialog}
      <h2 className="text-lg font-semibold text-gray-900">
        Comments ({comments.length})
      </h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Comment list */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            isArchived={isArchived}
            onUpdate={(body) => handleUpdate(comment.id, body)}
            onDelete={() => handleDelete(comment.id)}
          />
        ))}

        {comments.length === 0 && (
          <EmptyState
            icon={MessageCircle}
            title="No comments yet"
            description="Be the first to comment!"
            className="py-8"
          />
        )}
      </div>

      {/* Add comment form */}
      {!isArchived && (
        <CommentForm onSubmit={handleCreate} />
      )}
    </div>
  )
}
