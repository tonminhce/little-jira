'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { AIEnhanceButton } from '@/components/ai/AIEnhanceButton'
import { AISimilarIssues } from '@/components/ai/AISimilarIssues'

interface Label {
  id: string
  name: string
  color: string
}

interface Member {
  id: string
  name: string | null
  email: string
  image?: string | null
}

interface IssueFormProps {
  projectId: string
  labels: Label[]
  members: Member[]
}

export function IssueForm({ projectId, labels, members }: IssueFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [previousAssigneeId, setPreviousAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSimilarIssues, setShowSimilarIssues] = useState(true)

  // AI Enhancement handlers
  const handleEnhanceDescription = (enhanced: string) => {
    setDescription(enhanced)
    toast.success('Description enhanced!')
  }

  const handleSuggestPriority = (suggestion: { priority: string; reason: string }) => {
    setPriority(suggestion.priority)
    toast.success(`Priority set to ${suggestion.priority}: ${suggestion.reason}`)
  }

  const handleSuggestSubtasks = (subtasks: string[]) => {
    if (subtasks.length > 0) {
      toast.success(`Suggested ${subtasks.length} subtasks. Create the issue first, then add them!`)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          assigneeId: assigneeId || undefined,
          previousAssigneeId: previousAssigneeId || undefined,
          dueDate: dueDate || undefined,
          priority,
          labelIds: selectedLabels.length > 0 ? selectedLabels : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create issue')
      }

      toast.success('Issue created successfully')
      router.push(`/issues/${data.issue.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  function toggleLabel(labelId: string) {
    if (selectedLabels.includes(labelId)) {
      setSelectedLabels(selectedLabels.filter((id) => id !== labelId))
    } else if (selectedLabels.length < 5) {
      setSelectedLabels([...selectedLabels, labelId])
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      {/* Title */}
      <div>
        <Label required>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          placeholder="Issue title..."
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">{title.length}/200 characters</p>
      </div>

      {/* Description */}
      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={5}
          showCount
          placeholder="Describe the issue..."
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">Markdown supported</p>
      </div>

      {/* AI Enhancement */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">✨</span>
          <span className="font-medium text-purple-900">AI Assistant</span>
        </div>
        <AIEnhanceButton
          title={title}
          description={description}
          onEnhance={handleEnhanceDescription}
          onSuggestPriority={handleSuggestPriority}
          onSuggestSubtasks={handleSuggestSubtasks}
        />
      </div>

      {/* Similar Issues Check */}
      {title.length >= 5 && showSimilarIssues && (
        <AISimilarIssues
          title={title}
          description={description}
          projectId={projectId}
          onDismiss={() => setShowSimilarIssues(false)}
        />
      )}

      {/* Priority */}
      <div>
        <Label>Priority</Label>
        <Select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          options={[
            { value: 'HIGH', label: 'High' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'LOW', label: 'Low' },
          ]}
          className="mt-1"
        />
      </div>

      {/* Assignee */}
      <div>
        <Label>Assignee</Label>
        <Select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          options={[
            { value: '', label: 'Unassigned' },
            ...members.map((member) => ({
              value: member.id,
              label: member.name || member.email,
            })),
          ]}
          className="mt-1"
        />
      </div>

      {/* Defected Owner (Previous Assignee) */}
      <div>
        <Label>Defected Owner</Label>
        <Select
          value={previousAssigneeId}
          onChange={(e) => setPreviousAssigneeId(e.target.value)}
          options={[
            { value: '', label: 'None' },
            ...members.map((member) => ({
              value: member.id,
              label: member.name || member.email,
            })),
          ]}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">The person who previously owned this issue</p>
      </div>

      {/* Due Date */}
      <div>
        <Label>Due Date</Label>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Labels */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Labels ({selectedLabels.length}/5)
        </label>
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <button
              key={label.id}
              type="button"
              onClick={() => toggleLabel(label.id)}
              disabled={!selectedLabels.includes(label.id) && selectedLabels.length >= 5}
              className={`px-3 py-1 rounded-full text-sm transition-opacity ${
                selectedLabels.includes(label.id)
                  ? 'ring-2 ring-offset-1'
                  : 'opacity-50 hover:opacity-75'
              } disabled:opacity-30`}
              style={{
                backgroundColor: label.color + '20',
                color: label.color,
              }}
            >
              {label.name}
            </button>
          ))}
          {labels.length === 0 && (
            <span className="text-gray-500 text-sm">No labels available</span>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={loading || !title.trim()}
          loading={loading}
        >
          Create Issue
        </Button>
        <Button
          type="button"
          onClick={() => router.back()}
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
