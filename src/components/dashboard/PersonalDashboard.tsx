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
  FolderKanban,
  Calendar,
  Plus,
} from 'lucide-react'
import { BarChart, StatCard } from './Charts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'

interface PersonalDashboardData {
  user: { id: string }
  statistics: {
    totalAssigned: number
    totalCreated: number
    completedByMe: number
    inProgressByMe: number
    overdueIssues: number
    dueThisWeek: number
  }
  teams: Array<{ id: string; name: string; role: string }>
  projects: Array<{
    id: string
    name: string
    teamName: string
    isArchived: boolean
    totalIssues: number
    doneIssues: number
    myIssues: number
    completionRate: number
  }>
  assignedIssues: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: string | null
    project: { id: string; name: string }
  }>
  createdIssues: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: string | null
    project: { id: string; name: string }
  }>
  recentActivity: Array<{
    id: string
    field: string
    oldValue: string | null
    newValue: string | null
    createdAt: string
    issue: { id: string; title: string; project: { id: string; name: string } }
  }>
}

export function PersonalDashboard() {
  const [data, setData] = useState<PersonalDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    try {
      const response = await fetch('/api/dashboard')
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

  const { statistics, teams, projects, assignedIssues, createdIssues, recentActivity } = data

  // Priority distribution for assigned issues
  const priorityData = [
    { label: 'High', value: assignedIssues.filter((i) => i.priority === 'HIGH').length, color: '#EF4444' },
    { label: 'Medium', value: assignedIssues.filter((i) => i.priority === 'MEDIUM').length, color: '#F59E0B' },
    { label: 'Low', value: assignedIssues.filter((i) => i.priority === 'LOW').length, color: '#22C55E' },
  ]

  // Status distribution for assigned issues
  const statusData = [
    { label: 'Backlog', value: assignedIssues.filter((i) => i.status === 'BACKLOG').length, color: '#6B7280' },
    { label: 'In Progress', value: assignedIssues.filter((i) => i.status === 'IN_PROGRESS').length, color: '#3B82F6' },
    { label: 'Done', value: assignedIssues.filter((i) => i.status === 'DONE').length, color: '#22C55E' },
  ]

  const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    BACKLOG: { bg: 'bg-gray-100', text: 'text-gray-700' },
    IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700' },
    DONE: { bg: 'bg-green-100', text: 'text-green-700' },
  }

  const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
    HIGH: { bg: 'bg-red-100', text: 'text-red-700' },
    MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    LOW: { bg: 'bg-green-100', text: 'text-green-700' },
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back! Here's your overview.</p>
        </div>
        {teams.length > 0 && (
          <Link href="/teams">
            <Button variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </Link>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Assigned to Me"
          value={statistics.totalAssigned}
          icon={<ClipboardList className="w-6 h-6 text-blue-600" />}
        />
        <StatCard
          title="In Progress"
          value={statistics.inProgressByMe}
          icon={<TrendingUp className="w-6 h-6 text-blue-500" />}
        />
        <StatCard
          title="Completed"
          value={statistics.completedByMe}
          icon={<CheckCircle className="w-6 h-6 text-green-600" />}
        />
        <StatCard
          title="Overdue"
          value={statistics.overdueIssues}
          subtitle={statistics.overdueIssues > 0 ? 'Needs attention' : 'All on track'}
          icon={<AlertCircle className={`w-6 h-6 ${statistics.overdueIssues > 0 ? 'text-red-600' : 'text-gray-400'}`} />}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Issues */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Issues */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                My Assigned Issues
              </h2>
              {assignedIssues.length > 0 ? (
                <div className="space-y-3">
                  {assignedIssues.slice(0, 5).map((issue) => {
                    const statusStyle = STATUS_STYLES[issue.status] || STATUS_STYLES.BACKLOG
                    const priorityStyle = PRIORITY_STYLES[issue.priority] || PRIORITY_STYLES.MEDIUM
                    const isOverdue = issue.dueDate && new Date(issue.dueDate) < new Date() && issue.status !== 'DONE'

                    return (
                      <Link
                        key={issue.id}
                        href={`/issues/${issue.id}`}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{issue.title}</p>
                          <p className="text-sm text-gray-500">{issue.project.name}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {issue.status.replace('_', ' ')}
                          </span>
                          {isOverdue && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </Link>
                    )
                  })}
                  {assignedIssues.length > 5 && (
                    <Link
                      href="/dashboard"
                      className="block text-center text-blue-600 hover:text-blue-800 text-sm py-2"
                    >
                      View all {assignedIssues.length} issues
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p>No issues assigned to you</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projects Overview */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FolderKanban className="w-5 h-5" />
                My Projects
              </h2>
              {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={`p-4 border rounded-lg hover:shadow-md transition ${project.isArchived ? 'opacity-60' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{project.name}</h3>
                          <p className="text-sm text-gray-500">{project.teamName}</p>
                        </div>
                        {project.isArchived && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{project.completionRate}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${project.completionRate}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <span>{project.doneIssues} done</span>
                          <span>{project.myIssues} assigned to me</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FolderKanban className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p>No projects yet</p>
                  <Link href="/teams" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">
                    Join a team to get started
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Distribution */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Status Distribution</h2>
              <BarChart data={statusData} />
            </CardContent>
          </Card>

          {/* Teams */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                My Teams
              </h2>
              {teams.length > 0 ? (
                <div className="space-y-2">
                  {teams.map((team) => (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <span className="font-medium text-gray-900">{team.name}</span>
                      <span className="text-xs text-gray-500">{team.role}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No teams yet</p>
                  <Link href="/teams" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">
                    Create a team
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="text-sm">
                      <Link
                        href={`/issues/${activity.issue.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {activity.issue.title}
                      </Link>
                      <p className="text-gray-500 text-xs mt-1">
                        {activity.field} changed
                        {activity.oldValue && ` from "${activity.oldValue}"`}
                        {activity.newValue && ` to "${activity.newValue}"`}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
