import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole } from '@/lib/teams'

// GET - Project dashboard statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Get project and verify access
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: {
        id: true,
        name: true,
        teamId: true,
        createdAt: true,
        archivedAt: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify user is team member
    const userRole = await getUserTeamRole(project.teamId, session.user.id)
    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all issues for the project
    const issues = await prisma.issue.findMany({
      where: { projectId, deletedAt: null },
      select: {
        id: true,
        status: true,
        priority: true,
        assigneeId: true,
        dueDate: true,
        createdAt: true,
        columnId: true,
      },
    })

    // Get custom columns
    const columns = await prisma.projectColumn.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { issues: { where: { deletedAt: null } } },
        },
      },
    })

    // Calculate statistics
    const totalIssues = issues.length

    // Issues by status
    const issuesByStatus = {
      BACKLOG: issues.filter((i) => i.status === 'BACKLOG' && !i.columnId).length,
      IN_PROGRESS: issues.filter((i) => i.status === 'IN_PROGRESS' && !i.columnId).length,
      DONE: issues.filter((i) => i.status === 'DONE' && !i.columnId).length,
    }

    // Issues by custom columns
    const issuesByColumn = columns.map((col) => ({
      id: col.id,
      name: col.name,
      color: col.color,
      count: col._count.issues,
    }))

    // Issues by priority
    const issuesByPriority = {
      HIGH: issues.filter((i) => i.priority === 'HIGH').length,
      MEDIUM: issues.filter((i) => i.priority === 'MEDIUM').length,
      LOW: issues.filter((i) => i.priority === 'LOW').length,
    }

    // Issues by assignee
    const assigneeCounts = issues.reduce((acc, issue) => {
      const key = issue.assigneeId || 'unassigned'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Get assignee details
    const assigneeIds = Object.keys(assigneeCounts).filter((id) => id !== 'unassigned')
    const assignees = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, name: true, email: true, image: true },
    })

    const issuesByAssignee = [
      ...assignees.map((a) => ({
        id: a.id,
        name: a.name || a.email,
        image: a.image,
        count: assigneeCounts[a.id] || 0,
      })),
      { id: 'unassigned', name: 'Unassigned', image: null, count: assigneeCounts['unassigned'] || 0 },
    ].sort((a, b) => b.count - a.count)

    // Overdue issues
    const now = new Date()
    const overdueIssues = issues.filter(
      (i) => i.dueDate && new Date(i.dueDate) < now && i.status !== 'DONE'
    ).length

    // Due this week
    const weekFromNow = new Date()
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    const dueThisWeek = issues.filter(
      (i) =>
        i.dueDate &&
        new Date(i.dueDate) >= now &&
        new Date(i.dueDate) <= weekFromNow &&
        i.status !== 'DONE'
    ).length

    // Issues created over time (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentIssues = issues.filter((i) => new Date(i.createdAt) >= thirtyDaysAgo)

    // Group by day
    const issuesByDay: { date: string; count: number }[] = []
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const count = recentIssues.filter(
        (issue) => new Date(issue.createdAt).toISOString().split('T')[0] === dateStr
      ).length
      issuesByDay.push({ date: dateStr, count })
    }
    issuesByDay.reverse()

    // Completion rate (last 30 days)
    const completedLast30Days = issues.filter(
      (i) => i.status === 'DONE' // Simplified - in reality you'd track when it was marked done
    ).length

    const completionRate = totalIssues > 0
      ? Math.round((issues.filter((i) => i.status === 'DONE').length / totalIssues) * 100)
      : 0

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        isArchived: !!project.archivedAt,
      },
      statistics: {
        totalIssues,
        issuesByStatus,
        issuesByColumn,
        issuesByPriority,
        issuesByAssignee,
        overdueIssues,
        dueThisWeek,
        issuesByDay,
        completionRate,
      },
    })
  } catch (error) {
    console.error('Get dashboard error:', error)
    return NextResponse.json({ error: 'Failed to get dashboard data' }, { status: 500 })
  }
}
