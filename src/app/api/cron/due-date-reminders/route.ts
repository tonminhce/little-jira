import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { sendDueDateReminderEmail } from '@/lib/email'

const CRON_SECRET = process.env.CRON_SECRET

// POST - Send due date reminders (called by cron job)
// Can be configured to:
// - Send reminders for issues due in X days
// - Send reminders for overdue issues
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { daysAhead = 1, includeOverdue = true } = body

    const now = new Date()
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysAhead)
    targetDate.setHours(23, 59, 59, 999)

    const startOfTargetDay = new Date(targetDate)
    startOfTargetDay.setHours(0, 0, 0, 0)

    // Find issues due in X days (not done)
    const upcomingIssues = await prisma.issue.findMany({
      where: {
        deletedAt: null,
        status: { not: 'DONE' },
        dueDate: {
          gte: startOfTargetDay,
          lte: targetDate,
        },
        assigneeId: { not: null },
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    })

    // Find overdue issues
    let overdueIssues: typeof upcomingIssues = []
    if (includeOverdue) {
      overdueIssues = await prisma.issue.findMany({
        where: {
          deletedAt: null,
          status: { not: 'DONE' },
          dueDate: { lt: now },
          assigneeId: { not: null },
        },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
        },
      })
    }

    const results = {
      upcoming: { sent: 0, failed: 0 },
      overdue: { sent: 0, failed: 0 },
    }

    // Send upcoming reminders
    for (const issue of upcomingIssues) {
      if (!issue.assignee || !issue.dueDate) continue

      try {
        // Create in-app notification
        await createNotification({
          userId: issue.assignee.id,
          type: 'DUE_DATE_REMINDER',
          title: `Due Soon: ${issue.title}`,
          body: `This issue is due ${daysAhead === 1 ? 'tomorrow' : `in ${daysAhead} days`}.`,
          issueId: issue.id,
          projectId: issue.project.id,
          teamId: (await prisma.project.findUnique({
            where: { id: issue.project.id },
            select: { teamId: true },
          }))?.teamId || '',
        })

        // Send email
        await sendDueDateReminderEmail({
          email: issue.assignee.email,
          issueTitle: issue.title,
          issueId: issue.id,
          projectName: issue.project.name,
          dueDate: issue.dueDate,
          isOverdue: false,
        })

        results.upcoming.sent++
      } catch (error) {
        console.error(`Failed to send reminder for issue ${issue.id}:`, error)
        results.upcoming.failed++
      }
    }

    // Send overdue reminders
    for (const issue of overdueIssues) {
      if (!issue.assignee || !issue.dueDate) continue

      try {
        // Create in-app notification
        await createNotification({
          userId: issue.assignee.id,
          type: 'DUE_DATE_REMINDER',
          title: `Overdue: ${issue.title}`,
          body: 'This issue is past its due date.',
          issueId: issue.id,
          projectId: issue.project.id,
          teamId: (await prisma.project.findUnique({
            where: { id: issue.project.id },
            select: { teamId: true },
          }))?.teamId || '',
        })

        // Send email
        await sendDueDateReminderEmail({
          email: issue.assignee.email,
          issueTitle: issue.title,
          issueId: issue.id,
          projectName: issue.project.name,
          dueDate: issue.dueDate,
          isOverdue: true,
        })

        results.overdue.sent++
      } catch (error) {
        console.error(`Failed to send overdue reminder for issue ${issue.id}:`, error)
        results.overdue.failed++
      }
    }

    return NextResponse.json({
      message: 'Due date reminders processed',
      results: {
        upcomingIssues: upcomingIssues.length,
        overdueIssues: overdueIssues.length,
        notificationsSent: results,
      },
    })
  } catch (error) {
    console.error('Due date reminders error:', error)
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 })
  }
}
