'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

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

interface IssueFiltersProps {
  labels: Label[]
  members: Member[]
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  search: string
  status: string
  priority: string
  assigneeId: string
  labelId: string
  hasDueDate: boolean
  sortBy: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority'
  sortOrder: 'asc' | 'desc'
}

export function IssueFilters({ labels, members, onFilterChange }: IssueFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    priority: '',
    assigneeId: '',
    labelId: '',
    hasDueDate: false,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  function clearFilters() {
    const clearedFilters: FilterState = {
      search: '',
      status: '',
      priority: '',
      assigneeId: '',
      labelId: '',
      hasDueDate: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    }
    setFilters(clearedFilters)
    onFilterChange(clearedFilters)
  }

  const hasActiveFilters = filters.search || filters.status || filters.priority || filters.assigneeId || filters.labelId || filters.hasDueDate

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      {/* Search bar - always visible */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search issues by title..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors ${
            hasActiveFilters ? 'border-blue-500 text-blue-600' : 'text-gray-600'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          Filters
          {hasActiveFilters && (
            <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
              Active
            </span>
          )}
        </button>

        <select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-') as [FilterState['sortBy'], FilterState['sortOrder']]
            const newFilters = { ...filters, sortBy, sortOrder }
            setFilters(newFilters)
            onFilterChange(newFilters)
          }}
          className="border rounded-lg px-4 py-2 text-gray-600"
        >
          <option value="createdAt-desc">Newest First</option>
          <option value="createdAt-asc">Oldest First</option>
          <option value="updatedAt-desc">Recently Updated</option>
          <option value="dueDate-asc">Due Date (Soonest)</option>
          <option value="dueDate-desc">Due Date (Latest)</option>
          <option value="priority-asc">Priority (Low to High)</option>
          <option value="priority-desc">Priority (High to Low)</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="BACKLOG">Backlog</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => updateFilter('priority', e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
            <select
              value={filters.assigneeId}
              onChange={(e) => updateFilter('assigneeId', e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name || member.email}
                </option>
              ))}
            </select>
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <select
              value={filters.labelId}
              onChange={(e) => updateFilter('labelId', e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">All Labels</option>
              {labels.map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <label className="flex items-center gap-2 px-3 py-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                checked={filters.hasDueDate}
                onChange={(e) => updateFilter('hasDueDate', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Has due date</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
