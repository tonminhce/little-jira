'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface CommentFormProps {
  onSubmit: (body: string) => Promise<void>
  initialBody?: string
  onCancel?: () => void
  submitLabel?: string
}

export function CommentForm({ onSubmit, initialBody = '', onCancel, submitLabel = 'Comment' }: CommentFormProps) {
  const [body, setBody] = useState(initialBody)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      await onSubmit(body.trim())
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment..."
        maxLength={5000}
        rows={3}
        showCount
        className="resize-none"
      />

      <div className="flex justify-between items-center">
        <div />
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              variant="ghost"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading || !body.trim()}
            loading={loading}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}
