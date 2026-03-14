import { prisma } from '@/lib/prisma'
import {
  sendTaskAssignedEmail,
  sendCommentAddedEmail,
  sendTaskCompletedEmail,
  sendDueDateReminderEmail,
} from '@/lib/email'

// Check if email notifications are enabled (default: true)
const EMAIL_NOTIFICATIONS_ENABLED = process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'false'

export type NotificationType =
  | 'ISSUE_ASSIGNED'
  | 'ISSUE_UPDATED'
  | 'COMMENT_ADDED'
  | 'DUE_DATE_REMINDER'
  | 'ISSUE_MENTIONED'
  | 'ISSUE_COMPLETED'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body?: string
  issueId?: string
  projectId?: string
  teamId?: string
  actorId?: string
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      issueId: params.issueId,
      projectId: params.projectId,
      teamId: params.teamId,
      actorId: params.actorId,
    },
    include: {
      actor: {
        select: { id: true, name: true, email: true, image: true },
      },
      issue: {
        select: { id: true, title: true },
      },
      project: {
        select: { id: true, name: true },
      },
      team: {
        select: { id: true, name: true },
      },
    },
  })
}

interface NotifyIssueAssignedParams {
  issueId: string
  issueTitle: string
  assigneeId: string
  assigneeEmail: string
  actorId: string
  actorName: string
  projectId: string
  projectName: string
  teamId: string
}

export async function notifyIssueAssigned(params: NotifyIssueAssignedParams) {
  // Don't notify if user assigned to themselves
  if (params.assigneeId === params.actorId) return null

  // Create in-app notification
  const notification = await createNotification({
    userId: params.assigneeId,
    type: 'ISSUE_ASSIGNED',
    title: `Assigned to: ${params.issueTitle}`,
    body: 'You have been assigned to this issue.',
    issueId: params.issueId,
    projectId: params.projectId,
    teamId: params.teamId,
    actorId: params.actorId,
  })

  // Send email notification
  if (EMAIL_NOTIFICATIONS_ENABLED) {
    await sendTaskAssignedEmail({
      email: params.assigneeEmail,
      issueTitle: params.issueTitle,
      issueId: params.issueId,
      projectName: params.projectName,
      assignedBy: params.actorName,
    }).catch((error) => {
      console.error('Failed to send task assigned email:', error)
    })
  }

  return notification
}

interface NotifyIssueUpdatedParams {
  issueId: string
  issueTitle: string
  field: string
  oldValue: string | null
  newValue: string | null
  targetUserId: string
  actorId: string
  projectId: string
  teamId: string
}

export async function notifyIssueUpdated(params: NotifyIssueUpdatedParams) {
  // Don't notify if user made the change themselves
  if (params.targetUserId === params.actorId) return null

  const fieldLabels: Record<string, string> = {
    status: 'Status',
    priority: 'Priority',
    title: 'Title',
    dueDate: 'Due date',
    assigneeId: 'Assignee',
  }

  const fieldName = fieldLabels[params.field] || params.field

  return createNotification({
    userId: params.targetUserId,
    type: 'ISSUE_UPDATED',
    title: `Updated: ${params.issueTitle}`,
    body: `${fieldName} changed${params.oldValue ? ` from "${params.oldValue}"` : ''}${params.newValue ? ` to "${params.newValue}"` : ''}.`,
    issueId: params.issueId,
    projectId: params.projectId,
    teamId: params.teamId,
    actorId: params.actorId,
  })
}

interface NotifyCommentAddedParams {
  issueId: string
  issueTitle: string
  commentAuthorId: string
  commentAuthorName: string
  commentBody: string
  targetUsers: Array<{ id: string; email: string }>
  projectId: string
  teamId: string
}

export async function notifyCommentAdded(params: NotifyCommentAddedParams) {
  const filteredUsers = params.targetUsers.filter((user) => user.id !== params.commentAuthorId)

  // Create in-app notifications
  const notifications = filteredUsers.map((user) =>
    createNotification({
      userId: user.id,
      type: 'COMMENT_ADDED',
      title: `New comment on: ${params.issueTitle}`,
      body: 'A new comment was added to an issue you are involved with.',
      issueId: params.issueId,
      projectId: params.projectId,
      teamId: params.teamId,
      actorId: params.commentAuthorId,
    })
  )

  // Send email notifications
  if (EMAIL_NOTIFICATIONS_ENABLED) {
    const commentPreview = params.commentBody.length > 100
      ? params.commentBody.substring(0, 100) + '...'
      : params.commentBody

    await Promise.all(
      filteredUsers.map((user) =>
        sendCommentAddedEmail({
          email: user.email,
          issueTitle: params.issueTitle,
          issueId: params.issueId,
          commentAuthor: params.commentAuthorName,
          commentPreview,
        }).catch((error) => {
          console.error('Failed to send comment email:', error)
        })
      )
    )
  }

  return Promise.all(notifications)
}

interface NotifyIssueCompletedParams {
  issueId: string
  issueTitle: string
  ownerId: string
  ownerEmail: string
  actorId: string
  actorName: string
  projectId: string
  projectName: string
  teamId: string
}

export async function notifyIssueCompleted(params: NotifyIssueCompletedParams) {
  // Don't notify if user completed their own issue
  if (params.ownerId === params.actorId) return null

  // Create in-app notification
  const notification = await createNotification({
    userId: params.ownerId,
    type: 'ISSUE_COMPLETED',
    title: `Completed: ${params.issueTitle}`,
    body: 'This issue has been marked as done.',
    issueId: params.issueId,
    projectId: params.projectId,
    teamId: params.teamId,
    actorId: params.actorId,
  })

  // Send email notification
  if (EMAIL_NOTIFICATIONS_ENABLED) {
    await sendTaskCompletedEmail({
      email: params.ownerEmail,
      issueTitle: params.issueTitle,
      issueId: params.issueId,
      projectName: params.projectName,
      completedBy: params.actorName,
    }).catch((error) => {
      console.error('Failed to send task completed email:', error)
    })
  }

  return notification
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  })
}

export async function getUserNotifications(userId: string, limit = 20, offset = 0) {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    include: {
      actor: {
        select: { id: true, name: true, email: true, image: true },
      },
      issue: {
        select: { id: true, title: true },
      },
      project: {
        select: { id: true, name: true },
      },
      team: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  })
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      read: true,
    },
  })
}

export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  })
}
