'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ClipboardList,
  AlertCircle,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
  Calendar,
  Settings,
} from 'lucide-react'
import { BarChart, DonutChart, StatCard } from './Charts'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ProjectDashboardProps {
  projectId: string
}

interface DashboardData {
  project: {
    id: string
    name: string
    createdAt: string
    isArchived: boolean
  }
  statistics: {
    totalIssues: number
    issuesByStatus: { BACKLOG: number; IN_PROGRESS: number; DONE: number }
    issuesByColumn: Array<{ id: string; name: string; color: string; count: number }>
    issuesByPriority: { HIGH: number; MEDIUM: number; LOW: number }
    issuesByAssignee: Array<{ id: string; name: string; image: string | null; count: number }>
    overdueIssues: number
    dueThisWeek: number
    issuesByDay: Array<{ date: string; count: number }>
    completionRate: number
  }
}

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
  }, [projectId])

  async function fetchDashboard() {
    try {
      const response = await fetch(`/api/projects/${projectId}/dashboard`)
      if (response.ok) {
        const dashboardData = await response.json()
        setData(dashboardData)
      } else {
        setError('Failed to load dashboard')
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
      setError('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p>{error || 'Failed to load dashboard'}</p>
      </div>
    )
  }

  const { project, statistics } = data

  // Prepare chart data
  const statusChartData = [
    { label: 'Backlog', value: statistics.issuesByStatus.BACKLOG, color: '#6B7280' },
    { label: 'In Progress', value: statistics.issuesByStatus.IN_PROGRESS, color: '#3B82F6' },
    { label: 'Done', value: statistics.issuesByStatus.DONE, color: '#22C55E' },
  ]

  const priorityChartData = [
    { label: 'High', value: statistics.issuesByPriority.HIGH, color: '#EF4444' },
    { label: 'Medium', value: statistics.issuesByPriority.MEDIUM, color: '#F59E0B' },
    { label: 'Low', value: statistics.issuesByPriority.LOW, color: '#22C55E' },
  ]

  // Combine status and custom columns for donut chart
  const donutData = statistics.issuesByColumn.length > 0
    ? statistics.issuesByColumn.map((col) => ({
        label: col.name,
        value: col.count,
        color: col.color,
      }))
    : statusChartData.filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name} Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/settings`}
          className="text-gray-400 hover:text-gray-600"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Issues"
          value={statistics.totalIssues}
          icon={<ClipboardList className="w-6 h-6 text-blue-600" />}
        />
        <StatCard
          title="Completion Rate"
          value={`${statistics.completionRate}%`}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
        />
        <StatCard
          title="Overdue"
          value={statistics.overdueIssues}
          subtitle={statistics.overdueIssues > 0 ? 'Needs attention' : 'All on track'}
          icon={<AlertCircle className={`w-6 h-6 ${statistics.overdueIssues > 0 ? 'text-red-600' : 'text-gray-400'}`} />}
        />
        <StatCard
          title="Due This Week"
          value={statistics.dueThisWeek}
          icon={<Calendar className="w-6 h-6 text-orange-500" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Status Distribution</h2>
            <div className="flex items-center justify-center">
              <DonutChart data={donutData} size={140} strokeWidth={24} />
            </div>
            <div className="mt-4 space-y-2">
              {donutData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-600">{item.label}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Priority Distribution</h2>
            <BarChart
              data={priorityChartData}
              maxValue={Math.max(...Object.values(statistics.issuesByPriority), 1)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Assignee Distribution */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Issues by Assignee
          </h2>
          {statistics.issuesByAssignee.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {statistics.issuesByAssignee.slice(0, 12).map((assignee) => (
                <div
                  key={assignee.id}
                  className="bg-gray-50 rounded-lg p-4 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-medium text-gray-600 mx-auto mb-2">
                    {assignee.image ? (
                      <img
                        src={assignee.image}
                        alt={assignee.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      assignee.name[0].toUpperCase()
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {assignee.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-700 mt-1">
                    {assignee.count}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No issues yet</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href={`/projects/${projectId}/board`}>
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Kanban Board</p>
                  <p className="font-medium text-gray-900">View all issues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/projects/${projectId}/issues`}>
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <ClipboardList className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Issue List</p>
                  <p className="font-medium text-gray-900">Detailed view</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/projects/${projectId}/settings`}>
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Settings className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Settings</p>
                  <p className="font-medium text-gray-900">Manage project</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
