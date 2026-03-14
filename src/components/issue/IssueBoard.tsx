'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { IssueCard } from './IssueCard'

interface Issue {
  id: string
  title: string
  status: string
  columnId: string | null
  priority: string
  dueDate: Date | null
  owner: { id: string; name: string | null; email: string; image?: string | null }
  assignee: { id: string; name: string | null; email: string; image?: string | null } | null
  labels: Array<{ id: string; name: string; color: string }>
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

interface CustomColumn {
  id: string
  name: string
  color: string
  order: number
  wipLimit: number | null
}

interface IssueBoardProps {
  projectId: string
  backlogIssues: Issue[]
  inProgressIssues: Issue[]
  doneIssues: Issue[]
  customColumns: CustomColumn[]
  labels: Label[]
  members: Member[]
  isArchived: boolean
  canManage: boolean
}

const DEFAULT_COLUMNS = [
  { id: 'BACKLOG', title: 'Backlog', color: '#6B7280' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: '#3B82F6' },
  { id: 'DONE', title: 'Done', color: '#22C55E' },
]

export function IssueBoard({
  projectId,
  backlogIssues,
  inProgressIssues,
  doneIssues,
  customColumns,
  labels,
  members,
  isArchived,
  canManage,
}: IssueBoardProps) {
  // Use custom columns if available, otherwise use defaults
  const useCustomColumns = customColumns.length > 0

  const [issues, setIssues] = useState(() => {
    if (useCustomColumns) {
      // Group issues by columnId
      const grouped: Record<string, Issue[]> = {}
      customColumns.forEach((col) => {
        grouped[col.id] = []
      })
      // All issues that don't have a columnId go to first column
      const allIssues = [...backlogIssues, ...inProgressIssues, ...doneIssues]
      allIssues.forEach((issue) => {
        if (issue.columnId && grouped[issue.columnId]) {
          grouped[issue.columnId].push(issue)
        } else if (customColumns.length > 0) {
          // Put in first custom column if no columnId
          grouped[customColumns[0].id].push(issue)
        }
      })
      return grouped
    } else {
      return {
        BACKLOG: backlogIssues,
        IN_PROGRESS: inProgressIssues,
        DONE: doneIssues,
      }
    }
  })

  // Sync props to state when parent fetches new data
  useEffect(() => {
    if (useCustomColumns) {
      const grouped: Record<string, Issue[]> = {}
      customColumns.forEach((col) => {
        grouped[col.id] = []
      })
      const allIssues = [...backlogIssues, ...inProgressIssues, ...doneIssues]
      allIssues.forEach((issue) => {
        if (issue.columnId && grouped[issue.columnId]) {
          grouped[issue.columnId].push(issue)
        } else if (customColumns.length > 0) {
          grouped[customColumns[0].id].push(issue)
        }
      })
      setIssues(grouped)
    } else {
      setIssues({
        BACKLOG: backlogIssues,
        IN_PROGRESS: inProgressIssues,
        DONE: doneIssues,
      })
    }
  }, [backlogIssues, inProgressIssues, doneIssues, customColumns, useCustomColumns])

  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const dragNodeRef = useRef<HTMLDivElement | null>(null)

  async function handleColumnChange(issueId: string, columnId: string) {
    if (isArchived) return false

    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          useCustomColumns
            ? { columnId }
            : { status: columnId }
        ),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to update')
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to update:', error)
      toast.error('Failed to update')
      return false
    }
  }

  function handleDragStart(issue: Issue, e: React.DragEvent) {
    if (isArchived) {
      e.preventDefault()
      return
    }
    setDraggedIssue(issue)
    dragNodeRef.current = e.target as HTMLDivElement

    requestAnimationFrame(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5'
      }
    })
  }

  function handleDragEnd() {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1'
    }
    setDraggedIssue(null)
    setDragOverColumn(null)
    dragNodeRef.current = null
  }

  function handleDragOver(e: React.DragEvent, columnId: string) {
    e.preventDefault()
    if (!isArchived && draggedIssue) {
      setDragOverColumn(columnId)
    }
  }

  function handleDragLeave() {
    setDragOverColumn(null)
  }

  async function handleDrop(e: React.DragEvent, targetColumnId: string) {
    e.preventDefault()
    setDragOverColumn(null)

    if (!draggedIssue || isArchived) return

    const sourceColumnId = useCustomColumns
      ? (draggedIssue.columnId || (customColumns[0]?.id ?? ''))
      : draggedIssue.status

    // Don't do anything if dropped in same column
    if (sourceColumnId === targetColumnId) {
      setDraggedIssue(null)
      return
    }

    // Optimistically update UI
    setIssues((prev) => {
      const newIssues = { ...prev }

      // Remove from current column
      for (const colId of Object.keys(newIssues)) {
        newIssues[colId] = newIssues[colId].filter((i) => i.id !== draggedIssue.id)
      }

      // Add to new column
      const updatedIssue = useCustomColumns
        ? { ...draggedIssue, columnId: targetColumnId }
        : { ...draggedIssue, status: targetColumnId }
      newIssues[targetColumnId] = [updatedIssue, ...(newIssues[targetColumnId] || [])]

      return newIssues
    })

    // Make API call
    await handleColumnChange(draggedIssue.id, targetColumnId)
    setDraggedIssue(null)
  }

  // Build columns array
  const columns = useCustomColumns
    ? customColumns.map((col) => ({
        id: col.id,
        title: col.name,
        color: col.color,
        issues: issues[col.id] || [],
        wipLimit: col.wipLimit,
      }))
    : DEFAULT_COLUMNS.map((col) => ({
        id: col.id,
        title: col.title,
        color: col.color,
        issues: issues[col.id] || [],
        wipLimit: null,
      }))

  // Calculate column background color with opacity
  const getColumnBgColor = (color: string) => {
    // Convert hex to rgb and apply opacity
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, 0.1)`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((column) => {
        const issueCount = column.issues.length
        const isOverWipLimit = column.wipLimit && issueCount > column.wipLimit

        return (
          <div
            key={column.id}
            className={`rounded-lg p-4 min-h-[400px] transition-all ${
              dragOverColumn === column.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''
            } ${isOverWipLimit ? 'ring-2 ring-red-400' : ''}`}
            style={{ backgroundColor: getColumnBgColor(column.color) }}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <h2 className="font-semibold text-gray-700">
                  {column.title}
                  <span className="ml-2 text-sm text-gray-500">
                    ({issueCount}{column.wipLimit ? `/${column.wipLimit}` : ''})
                  </span>
                </h2>
              </div>
              {isOverWipLimit && (
                <span className="text-xs text-red-600 font-medium">
                  Over limit!
                </span>
              )}
            </div>

            <div className="space-y-3">
              {column.issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  projectId={projectId}
                  isArchived={isArchived}
                  isDragging={draggedIssue?.id === issue.id}
                  onDragStart={(e) => handleDragStart(issue, e)}
                  onDragEnd={handleDragEnd}
                />
              ))}

              {column.issues.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-300 rounded-lg">
                  {isArchived ? 'No issues' : 'Drop issues here'}
                </div>
              )}
            </div>

            {!isArchived && column.id === columns[0].id && !useCustomColumns && (
              <Link
                href={`/projects/${projectId}/issues/new`}
                className="mt-4 block text-center text-blue-600 hover:text-blue-800 text-sm"
              >
                + Add Issue
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
