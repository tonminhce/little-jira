'use client'

import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { LabelBadge } from './LabelBadge'
import { EmptyState } from '@/components/ui/empty-state'

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

interface IssueListProps {
  projectId: string
  issues: Issue[]
  isArchived: boolean
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  BACKLOG: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Backlog' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' },
  DONE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Done' },
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  HIGH: { bg: 'bg-red-100', text: 'text-red-700', label: 'High' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medium' },
  LOW: { bg: 'bg-green-100', text: 'text-green-700', label: 'Low' },
}

export function IssueList({ projectId, issues, isArchived }: IssueListProps) {
  if (issues.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No issues found"
        description="Get started by creating your first issue."
        action={
          !isArchived && (
            <Link
              href={`/projects/${projectId}/issues/new`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Create your first issue
            </Link>
          )
        }
      />
    )
  }

  return (
    <>
      {/* Desktop: Table view */}
      <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Issue
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Priority
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Assignee
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Labels
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due Date
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {issues.map((issue) => {
            const statusStyle = STATUS_STYLES[issue.status] || STATUS_STYLES.BACKLOG
            const priorityStyle = PRIORITY_STYLES[issue.priority] || PRIORITY_STYLES.MEDIUM

            return (
              <tr key={issue.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <Link
                    href={`/issues/${issue.id}`}
                    className="text-gray-900 hover:text-blue-600 font-medium"
                  >
                    {issue.title}
                  </Link>
                  <div className="text-xs text-gray-500 mt-1">
                    by {issue.owner.name || issue.owner.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
                    {priorityStyle.label}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {issue.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium">
                        {(issue.assignee.name || issue.assignee.email)[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700">
                        {issue.assignee.name || issue.assignee.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {issue.labels.slice(0, 3).map((label) => (
                      <LabelBadge key={label.id} label={label} size="sm" />
                    ))}
                    {issue.labels.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{issue.labels.length - 3} more
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>

      {/* Mobile: Card view */}
      <div className="md:hidden space-y-3">
        {issues.map((issue) => {
            const statusStyle = STATUS_STYLES[issue.status] || STATUS_STYLES.BACKLOG
            const priorityStyle = PRIORITY_STYLES[issue.priority] || PRIORITY_STYLES.MEDIUM

            const leftBorderColor =
              issue.status === 'BACKLOG' ? 'border-gray-300' :
              issue.status === 'IN_PROGRESS' ? 'border-blue-400' :
              issue.status === 'DONE' ? 'border-green-400' :
              'border-gray-300'

            return (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                className="bg-white rounded-lg border-l-4 p-4 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 block"
                style={{ borderLeftColor: leftBorderColor }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 line-clamp-2">
                      {issue.title}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
                        {priorityStyle.label}
                      </span>
                      {issue.labels.slice(0, 2).map((label) => (
                        <span
                          key={label.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${label.color}20`, color: label.color }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700">
                      {issue.assignee ? (issue.assignee.name || issue.assignee.email)[0].toUpperCase() : (issue.owner.name || issue.owner.email)[0].toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  {issue.dueDate && (
                    <span>Due: {new Date(issue.dueDate).toLocaleDateString()}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </>
    )
  }
