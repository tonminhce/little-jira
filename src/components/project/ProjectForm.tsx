'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ProjectFormProps {
  onSubmit: (data: { name: string; description?: string }) => Promise<void>
  onCancel?: () => void
  initialData?: { name: string; description?: string }
  submitLabel?: string
}

export function ProjectForm({
  onSubmit,
  onCancel,
  initialData,
  submitLabel = 'Create Project',
}: ProjectFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await onSubmit({ name, description: description || undefined })
      if (!initialData) {
        setName('')
        setDescription('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <div>
        <Label required className="mb-2">Project Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter project name"
          maxLength={100}
          required
        />
      </div>

      <div>
        <Label className="mb-2">Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter project description (optional)"
          maxLength={2000}
          rows={4}
          showCount
        />
        <p className="text-xs text-gray-500 mt-1">Markdown supported</p>
      </div>

      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={loading || !name.trim()}
          loading={loading}
        >
          {submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            variant="ghost"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
