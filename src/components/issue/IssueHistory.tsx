import { ArrowRight, History } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface HistoryEntry {
  id: string
  field: string
  oldValue: string | null
  newValue: string | null
  createdAt: string | Date
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface IssueHistoryProps {
  history: HistoryEntry[]
}

const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  priority: 'Priority',
  assigneeId: 'Assignee',
  title: 'Title',
  dueDate: 'Due Date',
}

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: 'Backlog',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
}

const PRIORITY_LABELS: Record<string, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

function formatValue(field: string, value: string | null): string {
  if (!value) return 'None'

  if (field === 'status') return STATUS_LABELS[value] || value
  if (field === 'priority') return PRIORITY_LABELS[value] || value
  if (field === 'dueDate') return new Date(value).toLocaleDateString()

  return value
}

function formatTimeAgo(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

  return then.toLocaleDateString()
}

export function IssueHistory({ history }: IssueHistoryProps) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No changes recorded"
        description="Changes to this issue will appear here."
        className="py-6"
      />
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Change History</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {history.map((entry) => (
            <div key={entry.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div className="relative z-10 w-4 h-4 rounded-full bg-blue-500 border-2 border-white mt-1" />

              <div className="flex-1 bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-900">
                    {entry.user.name || entry.user.email}
                  </span>
                  <span className="text-gray-500">changed</span>
                  <span className="font-medium text-gray-700">
                    {FIELD_LABELS[entry.field] || entry.field}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="px-2 py-0.5 bg-gray-200 rounded text-gray-600">
                    {formatValue(entry.field, entry.oldValue)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="px-2 py-0.5 bg-blue-100 rounded text-blue-700">
                    {formatValue(entry.field, entry.newValue)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {formatTimeAgo(entry.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
