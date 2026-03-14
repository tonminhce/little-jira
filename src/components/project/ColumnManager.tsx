'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, X, Check, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import { useConfirm } from '@/components/ui/confirm-dialog'

interface Column {
  id: string
  name: string
  color: string
  order: number
  wipLimit: number | null
  _count?: { issues: number }
}

interface ColumnManagerProps {
  projectId: string
}

const MAX_COLUMNS = 5

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

export function ColumnManager({ projectId }: ColumnManagerProps) {
  const [columns, setColumns] = useState<Column[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[5]) // blue
  const [newWipLimit, setNewWipLimit] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editWipLimit, setEditWipLimit] = useState('')
  const [saving, setSaving] = useState(false)
  const { confirm, dialog } = useConfirm()

  useEffect(() => {
    fetchColumns()
  }, [projectId])

  async function fetchColumns() {
    try {
      const response = await fetch(`/api/projects/${projectId}/columns`)
      if (response.ok) {
        const data = await response.json()
        setColumns(data.columns)
      }
    } catch (err) {
      console.error('Failed to fetch columns:', err)
      setError('Failed to load columns')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return

    setCreating(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          color: newColor,
          wipLimit: newWipLimit ? parseInt(newWipLimit) : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create column')
      }

      setColumns([...columns, data.column])
      setNewName('')
      setNewColor(PRESET_COLORS[5])
      setNewWipLimit('')
      setShowCreateForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setCreating(false)
    }
  }

  function startEdit(column: Column) {
    setEditingId(column.id)
    setEditName(column.name)
    setEditColor(column.color)
    setEditWipLimit(column.wipLimit?.toString() || '')
  }

  async function handleSaveEdit(columnId: string) {
    if (!editName.trim()) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          color: editColor,
          wipLimit: editWipLimit ? parseInt(editWipLimit) : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update column')
      }

      setColumns(columns.map(c => c.id === columnId ? data.column : c))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(column: Column) {
    const confirmed = await confirm({
      title: 'Delete Column',
      description: `Are you sure you want to delete "${column.name}"?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/projects/${projectId}/columns/${column.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete column')
      }

      setColumns(columns.filter(c => c.id !== column.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-32"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Custom Columns</h3>
        {!showCreateForm && columns.length < MAX_COLUMNS && (
          <Button
            onClick={() => setShowCreateForm(true)}
            variant="secondary"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Column
          </Button>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {/* Create form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div>
            <Label className="mb-1">Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Column name..."
              maxLength={30}
              required
            />
          </div>

          <div>
            <Label className="mb-1">Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    newColor === color ? 'border-gray-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1">WIP Limit (optional)</Label>
            <Input
              type="number"
              value={newWipLimit}
              onChange={(e) => setNewWipLimit(e.target.value)}
              placeholder="No limit"
              min={1}
              max={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum issues allowed in this column
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={creating || !newName.trim()}>
              {creating ? 'Creating...' : 'Create Column'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowCreateForm(false)
                setNewName('')
                setError(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Column list */}
      {columns.length === 0 && !showCreateForm ? (
        <EmptyState
          title="No custom columns"
          description="Add custom columns to organize your Kanban board beyond the default Backlog, In Progress, and Done."
        />
      ) : (
        <div className="space-y-2">
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex items-center gap-3 p-3 bg-white border rounded-lg group"
            >
              {/* Color indicator */}
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: column.color }}
              />

              {editingId === column.id ? (
                // Edit mode
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-8"
                    maxLength={30}
                  />
                  <div className="flex gap-1">
                    {PRESET_COLORS.slice(0, 5).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditColor(color)}
                        className={`w-6 h-6 rounded-full border ${
                          editColor === color ? 'border-gray-900' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSaveEdit(column.id)}
                    disabled={saving || !editName.trim()}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                // View mode
                <>
                  <span className="flex-1 font-medium">{column.name}</span>
                  {column.wipLimit && (
                    <span className="text-sm text-gray-500">
                      WIP: {column._count?.issues || 0}/{column.wipLimit}
                    </span>
                  )}
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button
                      onClick={() => startEdit(column)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(column)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {columns.length >= MAX_COLUMNS && (
        <p className="text-sm text-gray-500">
          Maximum {MAX_COLUMNS} custom columns per project.
        </p>
      )}

      {dialog}
    </div>
  )
}
