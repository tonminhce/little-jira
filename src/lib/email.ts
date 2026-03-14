import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const APP_NAME = 'Little Jira'
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

// Base email template
function getEmailTemplate(title: string, content: string, actionUrl?: string, actionText?: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
      <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #111827; font-size: 24px; margin: 0;">${APP_NAME}</h1>
        </div>
        <h2 style="color: #374151; font-size: 20px; margin-bottom: 16px;">${title}</h2>
        ${content}
        ${actionUrl && actionText ? `
          <div style="text-align: center; margin: 24px 0;">
            <a href="${actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
              ${actionText}
            </a>
          </div>
        ` : ''}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          You received this email because you have notifications enabled for ${APP_NAME}.
          <br />
          <a href="${APP_URL}/notifications" style="color: #6b7280;">Manage notification preferences</a>
        </p>
      </div>
    </div>
  `
}

export interface PasswordResetEmailData {
  email: string
  token: string
}

export async function sendPasswordResetEmail({ email, token }: PasswordResetEmailData) {
  const resetUrl = `${APP_URL}/reset-password/confirm?token=${token}`

  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <noreply@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Reset Your Password</h1>
          <p>You requested to reset your password for your ${APP_NAME} account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
          <p style="color: #666; margin-top: 20px;">
            This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Failed to send password reset email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    return { success: false, error }
  }
}

export async function sendTeamInviteEmail({
  email,
  teamName,
  inviteToken,
}: {
  email: string
  teamName: string
  inviteToken: string
}) {
  const inviteUrl = `${APP_URL}/teams/join?token=${inviteToken}`

  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <noreply@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: email,
      subject: `You've been invited to join ${teamName}`,
      html: getEmailTemplate(
        'Team Invitation',
        `<p>You've been invited to join <strong style="color: #3b82f6;">${teamName}</strong> on ${APP_NAME}.</p>
         <p style="color: #6b7280;">Click the button below to accept the invitation and join the team.</p>`,
        inviteUrl,
        'Accept Invitation'
      ),
    })

    if (error) {
      console.error('Failed to send team invite email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send team invite email:', error)
    return { success: false, error }
  }
}

// Task Assigned Email
export async function sendTaskAssignedEmail({
  email,
  issueTitle,
  issueId,
  projectName,
  assignedBy,
}: {
  email: string
  issueTitle: string
  issueId: string
  projectName: string
  assignedBy: string
}) {
  const issueUrl = `${APP_URL}/issues/${issueId}`

  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <noreply@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: email,
      subject: `📋 New task assigned: ${issueTitle}`,
      html: getEmailTemplate(
        'New Task Assigned to You',
        `<p><strong>${assignedBy}</strong> has assigned you to a new task:</p>
         <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
           <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #111827;">${issueTitle}</p>
           <p style="margin: 0; color: #6b7280; font-size: 14px;">📁 ${projectName}</p>
         </div>`,
        issueUrl,
        'View Task'
      ),
    })

    if (error) {
      console.error('Failed to send task assigned email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send task assigned email:', error)
    return { success: false, error }
  }
}

// Comment Added Email
export async function sendCommentAddedEmail({
  email,
  issueTitle,
  issueId,
  commentAuthor,
  commentPreview,
}: {
  email: string
  issueTitle: string
  issueId: string
  commentAuthor: string
  commentPreview: string
}) {
  const issueUrl = `${APP_URL}/issues/${issueId}`

  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <noreply@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: email,
      subject: `💬 New comment on: ${issueTitle}`,
      html: getEmailTemplate(
        'New Comment',
        `<p><strong>${commentAuthor}</strong> commented on a task you're following:</p>
         <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
           <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">${issueTitle}</p>
           <p style="margin: 0; color: #374151; font-style: italic;">"${commentPreview}"</p>
         </div>`,
        issueUrl,
        'View Comment'
      ),
    })

    if (error) {
      console.error('Failed to send comment email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send comment email:', error)
    return { success: false, error }
  }
}

// Due Date Reminder Email
export async function sendDueDateReminderEmail({
  email,
  issueTitle,
  issueId,
  projectName,
  dueDate,
  isOverdue = false,
}: {
  email: string
  issueTitle: string
  issueId: string
  projectName: string
  dueDate: Date
  isOverdue?: boolean
}) {
  const issueUrl = `${APP_URL}/issues/${issueId}`
  const dueDateStr = dueDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <noreply@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: email,
      subject: isOverdue ? `⚠️ Overdue: ${issueTitle}` : `⏰ Due Soon: ${issueTitle}`,
      html: getEmailTemplate(
        isOverdue ? 'Task Overdue!' : 'Due Date Reminder',
        `<p>${isOverdue ? 'This task is <strong style="color: #ef4444;">overdue</strong>!' : 'This task is due soon:'}</p>
         <div style="background: ${isOverdue ? '#fef2f2' : '#fffbeb'}; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid ${isOverdue ? '#ef4444' : '#f59e0b'};">
           <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">${issueTitle}</p>
           <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">📁 ${projectName}</p>
           <p style="margin: 0; color: ${isOverdue ? '#ef4444' : '#f59e0b'}; font-size: 14px; font-weight: 500;">
             📅 ${isOverdue ? 'Was due:' : 'Due:'} ${dueDateStr}
           </p>
         </div>`,
        issueUrl,
        'View Task'
      ),
    })

    if (error) {
      console.error('Failed to send due date reminder email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send due date reminder email:', error)
    return { success: false, error }
  }
}

// Task Completed Email
export async function sendTaskCompletedEmail({
  email,
  issueTitle,
  issueId,
  projectName,
  completedBy,
}: {
  email: string
  issueTitle: string
  issueId: string
  projectName: string
  completedBy: string
}) {
  const issueUrl = `${APP_URL}/issues/${issueId}`

  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <noreply@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: email,
      subject: `✅ Task completed: ${issueTitle}`,
      html: getEmailTemplate(
        'Task Completed',
        `<p>Great news! <strong>${completedBy}</strong> has completed a task:</p>
         <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #22c55e;">
           <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #111827;">✓ ${issueTitle}</p>
           <p style="margin: 0; color: #6b7280; font-size: 14px;">📁 ${projectName}</p>
         </div>`,
        issueUrl,
        'View Task'
      ),
    })

    if (error) {
      console.error('Failed to send task completed email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send task completed email:', error)
    return { success: false, error }
  }
}
