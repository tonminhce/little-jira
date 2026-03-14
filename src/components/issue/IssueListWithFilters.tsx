'use client'

import { useState, useCallback, useEffect } from 'react'
import { IssueList } from './IssueList'

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

interface FilterState {
  status: string
  priority: string
  assigneeId: string
  search: string
  sortBy: string
  sortOrder: string
}

interface IssueListWithFiltersProps {
  projectId: string
  initialIssues: Issue[]
  labels: Label[]
  members: Member[]
  isArchived: boolean
  initialFilters: FilterState
}

export function IssueListWithFilters({
  projectId,
  initialIssues,
  labels,
  members,
  isArchived,
  initialFilters,
}: IssueListWithFiltersProps) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues)
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [loading, setLoading] = useState(false)

  const fetchIssues = useCallback(async (filterState: FilterState) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterState.status) params.set('status', filterState.status)
      if (filterState.priority) params.set('priority', filterState.priority)
      if (filterState.assigneeId) params.set('assigneeId', filterState.assigneeId)
      if (filterState.search) params.set('search', filterState.search)
      params.set('sortBy', filterState.sortBy)
      params.set('sortOrder', filterState.sortOrder)

      const response = await fetch(`/api/projects/${projectId}/issues?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setIssues(data.issues)
      }
    } catch (error) {
      console.error('Failed to fetch issues:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchIssues(filters)
    }, filters.search ? 300 : 0)

    return () => clearTimeout(timer)
  }, [filters, fetchIssues])

  function updateFilter(key: keyof FilterState, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters({
      status: '',
      priority: '',
      assigneeId: '',
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })
  }

  const hasActiveFilters = filters.status || filters.priority || filters.assigneeId || filters.search

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search issues..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="border rounded-lg px-3 py-2 text-gray-600"
          >
            <option value="">All Statuses</option>
            <option value="BACKLOG">Backlog</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>

          {/* Priority */}
          <select
            value={filters.priority}
            onChange={(e) => updateFilter('priority', e.target.value)}
            className="border rounded-lg px-3 py-2 text-gray-600"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Assignee */}
          <select
            value={filters.assigneeId}
            onChange={(e) => updateFilter('assigneeId', e.target.value)}
            className="border rounded-lg px-3 py-2 text-gray-600"
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name || member.email}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-')
              setFilters((prev) => ({ ...prev, sortBy, sortOrder }))
            }}
            className="border rounded-lg px-3 py-2 text-gray-600"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="updatedAt-desc">Recently Updated</option>
            <option value="dueDate-asc">Due Date (Soonest)</option>
            <option value="priority-desc">Priority (High to Low)</option>
            <option value="priority-asc">Priority (Low to High)</option>
          </select>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-500">
          {loading ? 'Loading...' : `${issues.length} issue${issues.length !== 1 ? 's' : ''} found`}
        </div>
      </div>

      {/* Issue List */}
      <IssueList projectId={projectId} issues={issues} isArchived={isArchived} />
    </div>
  )
}
