'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Wand2, ListTodo, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AIEnhanceButtonProps {
  title: string
  description: string
  onEnhance: (enhanced: string) => void
  onSuggestPriority: (priority: { priority: string; reason: string }) => void
  onSuggestSubtasks: (subtasks: string[]) => void
}

export function AIEnhanceButton({
  title,
  description,
  onEnhance,
  onSuggestPriority,
  onSuggestSubtasks,
}: AIEnhanceButtonProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (action: 'enhance' | 'suggest-priority' | 'suggest-subtasks') => {
    if (!title.trim()) {
      setError('Please enter a title first')
      return
    }

    setLoading(action)
    setError(null)

    try {
      const response = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, title, description }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process request')
      }

      const data = await response.json()

      switch (action) {
        case 'enhance':
          onEnhance(data.enhanced)
          break
        case 'suggest-priority':
          onSuggestPriority(data)
          break
        case 'suggest-subtasks':
          onSuggestSubtasks(data.subtasks)
          break
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process request')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAction('enhance')}
          disabled={loading !== null || !title.trim()}
          className="text-purple-600 border-purple-300 hover:bg-purple-50"
        >
          {loading === 'enhance' ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 mr-1" />
          )}
          Enhance Description
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAction('suggest-priority')}
          disabled={loading !== null || !title.trim()}
          className="text-blue-600 border-blue-300 hover:bg-blue-50"
        >
          {loading === 'suggest-priority' ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-1" />
          )}
          Suggest Priority
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAction('suggest-subtasks')}
          disabled={loading !== null || !title.trim()}
          className="text-green-600 border-green-300 hover:bg-green-50"
        >
          {loading === 'suggest-subtasks' ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <ListTodo className="w-4 h-4 mr-1" />
          )}
          Suggest Subtasks
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-1 text-red-600 text-xs">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  )
}
