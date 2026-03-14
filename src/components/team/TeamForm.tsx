'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'

interface TeamFormProps {
  onSubmit: (name: string) => Promise<void>
  onCancel?: () => void
  initialName?: string
  submitLabel?: string
}

export function TeamForm({
  onSubmit,
  onCancel,
  initialName = '',
  submitLabel = 'Create Team',
}: TeamFormProps) {
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await onSubmit(name)
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <Label className="mb-2">Team Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter team name"
          maxLength={50}
          required
        />
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
