'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { IssueBoard } from './IssueBoard'
import { IssueFilters, FilterState } from './IssueFilters'

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

interface IssueBoardWrapperProps {
  projectId: string
  initialIssues: Issue[]
  customColumns: CustomColumn[]
  labels: Label[]
  members: Member[]
  isArchived: boolean
  canManage: boolean
}

export function IssueBoardWrapper({
  projectId,
  initialIssues,
  customColumns,
  labels,
  members,
  isArchived,
  canManage,
}: IssueBoardWrapperProps) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues)
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
  const [loading, setLoading] = useState(false)

  const fetchIssues = useCallback(async (filterState: FilterState) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterState.search) params.set('search', filterState.search)
      if (filterState.status) params.set('status', filterState.status)
      if (filterState.priority) params.set('priority', filterState.priority)
      if (filterState.assigneeId) params.set('assigneeId', filterState.assigneeId)
      if (filterState.labelId) params.set('labelId', filterState.labelId)
      if (filterState.hasDueDate) params.set('hasDueDate', 'true')
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

  function handleFilterChange(newFilters: FilterState) {
    setFilters(newFilters)
  }

  const backlogIssues = issues.filter((i) => i.status === 'BACKLOG')
  const inProgressIssues = issues.filter((i) => i.status === 'IN_PROGRESS')
  const doneIssues = issues.filter((i) => i.status === 'DONE')

  return (
    <div className="space-y-6">
      <IssueFilters
        labels={labels}
        members={members}
        onFilterChange={handleFilterChange}
      />

      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      <IssueBoard
        projectId={projectId}
        backlogIssues={backlogIssues}
        inProgressIssues={inProgressIssues}
        doneIssues={doneIssues}
        customColumns={customColumns}
        labels={labels}
        members={members}
        isArchived={isArchived}
        canManage={canManage}
      />
    </div>
  )
}
