'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react'
import { IssueHistory } from './IssueHistory'
import { LabelBadge } from './LabelBadge'
import { SubtaskList } from './SubtaskList'
import { CommentList } from '@/components/comment/CommentList'
import { AISummary } from '@/components/ai/AISummary'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

interface Issue {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
  owner: { id: string; name: string | null; email: string; image?: string | null }
  assignee: { id: string; name: string | null; email: string; image?: string | null } | null
  previousAssignee: { id: string; name: string | null; email: string; image?: string | null } | null
  project: { id: string; name: string; teamId: string; archivedAt: Date | null; team?: { name: string } }
  labels: Array<{ id: string; name: string; color: string }>
  history: Array<{
    id: string
    field: string
    oldValue: string | null
    newValue: string | null
    createdAt: Date
    user: { id: string; name: string | null; email: string }
  }>
}

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

interface IssueDetailProps {
  issue: Issue
  labels: Label[]
  members: Member[]
  isArchived: boolean
  canDelete: boolean
  currentUserId: string
  isAdmin: boolean
}

const statusOptions = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
]

const priorityOptions = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

const priorityColors: Record<string, string> = {
  HIGH: 'text-red-600 bg-red-50',
  MEDIUM: 'text-yellow-600 bg-yellow-50',
  LOW: 'text-blue-600 bg-blue-50',
}

const fieldLabels: Record<string, string> = {
  status: 'Status',
  priority: 'Priority',
  title: 'Title',
  assigneeId: 'Assignee',
  dueDate: 'Due Date',
}

export function IssueDetail({
  issue,
  labels,
  members,
  isArchived,
  canDelete,
  currentUserId,
  isAdmin,
}: IssueDetailProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(issue.description || '')
  const [status, setStatus] = useState(issue.status)
  const [priority, setPriority] = useState(issue.priority)
  const [assigneeId, setAssigneeId] = useState(issue.assignee?.id || '')
  const [dueDate, setDueDate] = useState(
    issue.dueDate ? new Date(issue.dueDate).toISOString().split('T')[0] : ''
  )
  const [selectedLabels, setSelectedLabels] = useState<string[]>(issue.labels.map((l) => l.id))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  async function handleSave() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          status,
          priority,
          assigneeId: assigneeId || null,
          dueDate: dueDate || null,
          labelIds: selectedLabels,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update issue')
      }

      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/issues/${issue.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete issue')
      }

      router.push(`/projects/${issue.project.id}/board`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
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
    <div className="space-y-6">
      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {isArchived && (
        <Alert variant="warning">
          This project is archived. Issues cannot be modified.
        </Alert>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            {editing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="text-2xl font-bold w-full border rounded px-2 py-1"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">{issue.title}</h1>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {issue.project.name} • Created by {issue.owner.name || issue.owner.email} on{' '}
              {new Date(issue.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-2">
            {!isArchived && !editing && (
              <Button
                onClick={() => setEditing(true)}
                variant="secondary"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {canDelete && !isArchived && (
              <Button
                onClick={handleDelete}
                disabled={loading}
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
              </Button>
            )}
            {editing && (
              <>
                <Button
                  onClick={handleSave}
                  disabled={loading || !title.trim()}
                  loading={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setEditing(false)
                    setTitle(issue.title)
                    setDescription(issue.description || '')
                    setStatus(issue.status)
                    setPriority(issue.priority)
                    setAssigneeId(issue.assignee?.id || '')
                    setDueDate(issue.dueDate ? new Date(issue.dueDate).toISOString().split('T')[0] : '')
                    setSelectedLabels(issue.labels.map((l) => l.id))
                  }}
                  variant="ghost"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              {editing ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={5000}
                  rows={6}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Add a description..."
                />
              ) : (
                <div className="text-gray-700 whitespace-pre-wrap">
                  {issue.description || 'No description'}
                </div>
              )}
            </div>

            {/* Labels */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Labels</h2>
              {editing ? (
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedLabels.includes(label.id)
                          ? 'ring-2 ring-offset-1'
                          : 'opacity-50'
                      }`}
                      style={{
                        backgroundColor: label.color + '20',
                        color: label.color,
                        ...(selectedLabels.includes(label.id) && { ringColor: label.color }),
                      }}
                    >
                      {label.name}
                    </button>
                  ))}
                  {labels.length === 0 && (
                    <span className="text-gray-500 text-sm">No labels available</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {issue.labels.length > 0 ? (
                    issue.labels.map((label) => (
                      <LabelBadge key={label.id} label={label} />
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">No labels</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Reporter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reporter</label>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                  {(issue.owner.name || issue.owner.email)[0].toUpperCase()}
                </div>
                <span className="text-gray-700">
                  {issue.owner.name || issue.owner.email}
                </span>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              {editing ? (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={`px-3 py-1 rounded ${priorityColors[issue.priority]}`}>
                  {statusOptions.find((s) => s.value === issue.status)?.label || issue.status}
                </span>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              {editing ? (
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={`px-3 py-1 rounded ${priorityColors[issue.priority]}`}>
                  {priorityOptions.find((p) => p.value === issue.priority)?.label || issue.priority}
                </span>
              )}
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
              {editing ? (
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.email}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  {issue.assignee ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                        {(issue.assignee.name || issue.assignee.email)[0].toUpperCase()}
                      </div>
                      <span className="text-gray-700">
                        {issue.assignee.name || issue.assignee.email}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  )}
                </div>
              )}
            </div>

            {/* Defected Owner (Previous Assignee) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Defected Owner</label>
              <div className="flex items-center gap-2">
                {issue.previousAssignee ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-medium text-orange-600">
                      {(issue.previousAssignee.name || issue.previousAssignee.email)[0].toUpperCase()}
                    </div>
                    <span className="text-gray-700">
                      {issue.previousAssignee.name || issue.previousAssignee.email}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400">None</span>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              {editing ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              ) : (
                <span className="text-gray-700">
                  {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : 'No due date'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <AISummary issueId={issue.id} />

      {/* Subtasks */}
      <div className="bg-white shadow rounded-lg p-6">
        <SubtaskList issueId={issue.id} isArchived={isArchived} />
      </div>

      {/* Comments */}
      <div className="bg-white shadow rounded-lg p-6">
        <CommentList
          issueId={issue.id}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isArchived={isArchived}
        />
      </div>

      {/* Change History */}
      <div className="bg-white shadow rounded-lg p-6">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex justify-between items-center w-full text-left"
        >
          <h2 className="text-lg font-semibold">Change History ({issue.history.length})</h2>
          {showHistory ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showHistory && (
          <div className="mt-4">
            <IssueHistory history={issue.history} />
          </div>
        )}
      </div>
    </div>
  )
}
