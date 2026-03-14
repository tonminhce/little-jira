'use client'

import { useState } from 'react'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Tags } from 'lucide-react'

interface Label {
  id: string
  name: string
  color: string
}

interface LabelManagerProps {
  projectId: string
  initialLabels: Label[]
  canManage: boolean
}

const PRESET_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6B7280', // gray
]

export function LabelManager({ projectId, initialLabels, canManage }: LabelManagerProps) {
  const [labels, setLabels] = useState<Label[]>(initialLabels)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { confirm, dialog } = useConfirm()

  async function handleCreate() {
    if (!name.trim()) return
    if (labels.length >= 20) {
      setError('Maximum 20 labels per project')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create label')
      }

      setLabels([...labels, data.label])
      setName('')
      setColor(PRESET_COLORS[0])
      setIsCreating(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(labelId: string) {
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/labels/${labelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update label')
      }

      setLabels(labels.map((l) => (l.id === labelId ? data.label : l)))
      setEditingId(null)
      setName('')
      setColor(PRESET_COLORS[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(labelId: string) {
    const confirmed = await confirm({
      title: 'Delete Label',
      description: 'Delete this label? It will be removed from all issues.',
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!confirmed) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/labels/${labelId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete label')
      }

      setLabels(labels.filter((l) => l.id !== labelId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(label: Label) {
    setEditingId(label.id)
    setName(label.name)
    setColor(label.color)
    setIsCreating(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setName('')
    setColor(PRESET_COLORS[0])
  }

  function startCreate() {
    setIsCreating(true)
    setEditingId(null)
    setName('')
    setColor(PRESET_COLORS[0])
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {dialog}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Labels ({labels.length}/20)</h2>
        {canManage && !isCreating && !editingId && (
          <button
            onClick={startCreate}
            disabled={labels.length >= 20}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50"
          >
            New Label
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* Create form */}
        {isCreating && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  placeholder="Label name"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        color === c ? 'border-gray-900' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleCreate}
                  disabled={loading || !name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
            {/* Preview */}
            <div className="mt-3">
              <span className="text-sm text-gray-500 mr-2">Preview:</span>
              <span
                className="px-3 py-1 rounded-full text-sm"
                style={{ backgroundColor: color + '20', color }}
              >
                {name || 'Label name'}
              </span>
            </div>
          </div>
        )}

        {/* Existing labels */}
        {labels.map((label) => (
          <div key={label.id}>
            {editingId === label.id ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={30}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`w-8 h-8 rounded-full border-2 ${
                            color === c ? 'border-gray-900' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => handleUpdate(label.id)}
                      disabled={loading || !name.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span
                    className="px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: label.color + '20', color: label.color }}
                  >
                    {label.name}
                  </span>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(label)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(label.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {labels.length === 0 && !isCreating && (
          <EmptyState
            icon={Tags}
            title="No labels yet"
            description={canManage ? 'Create one to organize your issues.' : undefined}
            className="py-8"
          />
        )}
      </div>
    </div>
  )
}
