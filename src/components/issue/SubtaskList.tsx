'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, X, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'

interface Subtask {
  id: string
  title: string
  completed: boolean
  order: number
  createdAt: string
}

interface SubtaskListProps {
  issueId: string
  isArchived: boolean
}

const MAX_SUBTASKS = 20

export function SubtaskList({ issueId, isArchived }: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    fetchSubtasks()
  }, [issueId])

  async function fetchSubtasks() {
    try {
      const response = await fetch(`/api/issues/${issueId}/subtasks`)
      if (response.ok) {
        const data = await response.json()
        setSubtasks(data.subtasks)
      }
    } catch (err) {
      console.error('Failed to fetch subtasks:', err)
      setError('Failed to load subtasks')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return

    setAddingSubtask(true)
    setError(null)

    try {
      const response = await fetch(`/api/issues/${issueId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add subtask')
      }

      setSubtasks([...subtasks, data.subtask])
      setNewTitle('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setAddingSubtask(false)
    }
  }

  async function handleToggleComplete(subtaskId: string, completed: boolean) {
    try {
      const response = await fetch(`/api/issues/${issueId}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      })

      if (response.ok) {
        setSubtasks(subtasks.map(st =>
          st.id === subtaskId ? { ...st, completed: !completed } : st
        ))
      }
    } catch (err) {
      console.error('Failed to toggle subtask:', err)
    }
  }

  async function handleUpdateTitle(subtaskId: string) {
    if (!editTitle.trim()) {
      setEditingId(null)
      return
    }

    try {
      const response = await fetch(`/api/issues/${issueId}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      })

      if (response.ok) {
        setSubtasks(subtasks.map(st =>
          st.id === subtaskId ? { ...st, title: editTitle.trim() } : st
        ))
        setEditingId(null)
      }
    } catch (err) {
      console.error('Failed to update subtask:', err)
    }
  }

  async function handleDelete(subtaskId: string) {
    try {
      const response = await fetch(`/api/issues/${issueId}/subtasks/${subtaskId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSubtasks(subtasks.filter(st => st.id !== subtaskId))
      }
    } catch (err) {
      console.error('Failed to delete subtask:', err)
    }
  }

  function startEditing(subtask: Subtask) {
    setEditingId(subtask.id)
    setEditTitle(subtask.title)
  }

  const completedCount = subtasks.filter(st => st.completed).length
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          Subtasks
          {subtasks.length > 0 && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({completedCount}/{subtasks.length})
            </span>
          )}
        </h2>
      </div>

      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mb-4">{error}</p>
      )}

      {/* Subtask list */}
      <div className="space-y-2 mb-4">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors ${
              subtask.completed ? 'opacity-75' : ''
            }`}
          >
            {/* Checkbox */}
            <button
              onClick={() => !isArchived && handleToggleComplete(subtask.id, subtask.completed)}
              disabled={isArchived}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                subtask.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-green-400'
              } ${isArchived ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {subtask.completed && <Check className="w-3 h-3" />}
            </button>

            {/* Title */}
            {editingId === subtask.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleUpdateTitle(subtask.id)
                }}
                className="flex-1 flex gap-2"
              >
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 h-8"
                  autoFocus
                />
                <Button type="submit" size="sm" className="h-8">
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => setEditingId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              <span
                className={`flex-1 ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}
                onDoubleClick={() => !isArchived && startEditing(subtask)}
              >
                {subtask.title}
              </span>
            )}

            {/* Actions */}
            {!isArchived && editingId !== subtask.id && (
              <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                <button
                  onClick={() => startEditing(subtask)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(subtask.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add subtask form */}
      {!isArchived && subtasks.length < MAX_SUBTASKS && (
        <form onSubmit={handleAddSubtask} className="flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a subtask..."
            disabled={addingSubtask}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={addingSubtask || !newTitle.trim()}
            loading={addingSubtask}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </form>
      )}

      {/* Empty state */}
      {subtasks.length === 0 && isArchived && (
        <p className="text-gray-500 text-sm">No subtasks</p>
      )}
    </div>
  )
}
