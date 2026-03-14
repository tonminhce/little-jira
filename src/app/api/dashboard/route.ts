import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Personal dashboard statistics
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's teams
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          select: { id: true, name: true, deletedAt: true },
        },
      },
    })

    const teamIds = teamMemberships
      .filter((m) => !m.team.deletedAt)
      .map((m) => m.teamId)

    // Get projects from user's teams
    const projects = await prisma.project.findMany({
      where: {
        teamId: { in: teamIds },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        teamId: true,
        archivedAt: true,
        team: { select: { name: true } },
      },
    })

    const projectIds = projects.map((p) => p.id)

    // Issues assigned to user
    const assignedIssues = await prisma.issue.findMany({
      where: {
        assigneeId: userId,
        projectId: { in: projectIds },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Issues created by user
    const createdIssues = await prisma.issue.findMany({
      where: {
        ownerId: userId,
        projectId: { in: projectIds },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Statistics
    const totalAssigned = await prisma.issue.count({
      where: {
        assigneeId: userId,
        projectId: { in: projectIds },
        deletedAt: null,
      },
    })

    const totalCreated = await prisma.issue.count({
      where: {
        ownerId: userId,
        projectId: { in: projectIds },
        deletedAt: null,
      },
    })

    const completedByMe = await prisma.issue.count({
      where: {
        assigneeId: userId,
        status: 'DONE',
        projectId: { in: projectIds },
        deletedAt: null,
      },
    })

    const inProgressByMe = await prisma.issue.count({
      where: {
        assigneeId: userId,
        status: 'IN_PROGRESS',
        projectId: { in: projectIds },
        deletedAt: null,
      },
    })

    // Overdue issues
    const now = new Date()
    const overdueIssues = await prisma.issue.count({
      where: {
        assigneeId: userId,
        dueDate: { lt: now },
        status: { not: 'DONE' },
        projectId: { in: projectIds },
        deletedAt: null,
      },
    })

    // Due this week
    const weekFromNow = new Date()
    weekFromNow.setDate(weekFromNow.getDate() + 7)
    const dueThisWeek = await prisma.issue.count({
      where: {
        assigneeId: userId,
        dueDate: { gte: now, lte: weekFromNow },
        status: { not: 'DONE' },
        projectId: { in: projectIds },
        deletedAt: null,
      },
    })

    // Recent activity (from issue history)
    const recentActivity = await prisma.issueHistory.findMany({
      where: {
        userId,
        issue: {
          projectId: { in: projectIds },
          deletedAt: null,
        },
      },
      include: {
        issue: {
          select: { id: true, title: true, project: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Project summaries
    const projectSummaries = await Promise.all(
      projects.slice(0, 6).map(async (project) => {
        const totalIssues = await prisma.issue.count({
          where: { projectId: project.id, deletedAt: null },
        })
        const doneIssues = await prisma.issue.count({
          where: { projectId: project.id, status: 'DONE', deletedAt: null },
        })
        const myIssues = await prisma.issue.count({
          where: { projectId: project.id, assigneeId: userId, deletedAt: null },
        })

        return {
          id: project.id,
          name: project.name,
          teamName: project.team.name,
          isArchived: !!project.archivedAt,
          totalIssues,
          doneIssues,
          myIssues,
          completionRate: totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0,
        }
      })
    )

    return NextResponse.json({
      user: {
        id: userId,
      },
      statistics: {
        totalAssigned,
        totalCreated,
        completedByMe,
        inProgressByMe,
        overdueIssues,
        dueThisWeek,
      },
      teams: teamMemberships
        .filter((m) => !m.team.deletedAt)
        .map((m) => ({
          id: m.team.id,
          name: m.team.name,
          role: m.role,
        })),
      projects: projectSummaries,
      assignedIssues,
      createdIssues,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        field: a.field,
        oldValue: a.oldValue,
        newValue: a.newValue,
        createdAt: a.createdAt,
        issue: a.issue,
      })),
    })
  } catch (error) {
    console.error('Get personal dashboard error:', error)
    return NextResponse.json({ error: 'Failed to get dashboard data' }, { status: 500 })
  }
}
