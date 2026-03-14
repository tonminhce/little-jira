'use client'

import Link from 'next/link'
import { Flag, Calendar, User, GripVertical } from 'lucide-react'
import { LabelBadge } from './LabelBadge'

interface Issue {
  id: string
  title: string
  status: string
  priority: string
  dueDate: Date | null
  owner: { id: string; name: string | null; email: string; image?: string | null }
  assignee: { id: string; name: string | null; email: string; image?: string | null } | null
  labels: Array<{ id: string; name: string; color: string }>
}

interface IssueCardProps {
  issue: Issue
  projectId: string
  isArchived: boolean
  isDragging?: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}

const priorityColors: Record<string, string> = {
  HIGH: 'border-l-red-500 bg-red-50',
  MEDIUM: 'border-l-yellow-500 bg-white',
  LOW: 'border-l-blue-500 bg-blue-50',
}

const priorityIconColors: Record<string, string> = {
  HIGH: 'text-red-500',
  MEDIUM: 'text-yellow-500',
  LOW: 'text-blue-500',
}

export function IssueCard({
  issue,
  projectId,
  isArchived,
  isDragging,
  onDragStart,
  onDragEnd,
}: IssueCardProps) {
  const isDraggable = !isArchived

  return (
    <div
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`border-l-4 rounded-lg p-3 shadow-sm transition-all cursor-grab active:cursor-grabbing ${
        priorityColors[issue.priority] || 'bg-white'
      } ${isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Link href={`/issues/${issue.id}`} className="block" onClick={(e) => {
            // Prevent navigation when dragging
            if (isDragging) e.preventDefault()
          }}>
            <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 hover:text-blue-600">
              {issue.title}
            </h3>
          </Link>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {issue.labels.slice(0, 3).map((label) => (
                <LabelBadge key={label.id} label={label} size="sm" />
              ))}
              {issue.labels.length > 3 && (
                <span className="text-xs text-gray-500">+{issue.labels.length - 3}</span>
              )}
            </div>
          )}

          {/* Priority and Assignee */}
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Flag className={`w-3 h-3 ${priorityIconColors[issue.priority] || 'text-gray-400'}`} />
              {issue.priority}
            </span>
            {issue.assignee && (
              <span className="flex items-center gap-1 truncate max-w-[100px]">
                <User className="w-3 h-3" />
                {issue.assignee.name || issue.assignee.email}
              </span>
            )}
          </div>

          {/* Due date */}
          {issue.dueDate && (
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Due: {new Date(issue.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
