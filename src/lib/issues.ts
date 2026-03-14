import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getUserTeamRole } from '@/lib/teams'

type TransactionClient = Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

// Valid status values
export const ISSUE_STATUSES = ['BACKLOG', 'IN_PROGRESS', 'DONE'] as const
export type IssueStatus = typeof ISSUE_STATUSES[number]

// Valid priority values
export const ISSUE_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
export type IssuePriority = typeof ISSUE_PRIORITIES[number]

// Check if user can delete an issue (owner, project owner, team OWNER/ADMIN)
export async function canDeleteIssue(
  issueId: string,
  userId: string
): Promise<boolean> {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, deletedAt: null },
    include: { project: true },
  })

  if (!issue) return false

  // Check if user is issue owner
  if (issue.ownerId === userId) return true

  // Check if user is project owner
  if (issue.project.ownerId === userId) return true

  // Check if user is team OWNER or ADMIN
  const teamRole = await getUserTeamRole(issue.project.teamId, userId)
  if (teamRole === 'OWNER' || teamRole === 'ADMIN') return true

  return false
}

// Check if user can view/modify issues in a project (team member)
export async function canAccessProjectIssues(
  projectId: string,
  userId: string
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
  })

  if (!project) return false

  const teamRole = await getUserTeamRole(project.teamId, userId)
  return !!teamRole
}

// Check if project is archived (no issue modifications allowed)
export async function isProjectArchived(projectId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { archivedAt: true },
  })

  return !!project?.archivedAt
}

// Count issues in project (for limit check)
export async function countProjectIssues(projectId: string): Promise<number> {
  return prisma.issue.count({
    where: { projectId, deletedAt: null },
  })
}

// Get issue with details
export async function getIssueById(issueId: string) {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, deletedAt: null },
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
      project: {
        select: {
          id: true,
          name: true,
          teamId: true,
          archivedAt: true,
        },
      },
      labels: {
        include: {
          label: true,
        },
      },
      history: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })

  if (!issue) return null

  return {
    id: issue.id,
    projectId: issue.projectId,
    ownerId: issue.ownerId,
    assigneeId: issue.assigneeId,
    title: issue.title,
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    dueDate: issue.dueDate,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    owner: issue.owner,
    assignee: issue.assignee,
    project: issue.project,
    labels: issue.labels.map((l) => l.label),
    history: issue.history,
  }
}

// Get project issues with filtering and sorting
export async function getProjectIssues(
  projectId: string,
  options?: {
    status?: string
    priority?: string
    assigneeId?: string
    search?: string
    labelId?: string
    hasDueDate?: boolean
    dueBefore?: Date
    dueAfter?: Date
    sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority'
    sortOrder?: 'asc' | 'desc'
  }
) {
  const where: Prisma.IssueWhereInput = {
    projectId,
    deletedAt: null,
  }

  if (options?.status) {
    where.status = options.status
  }

  if (options?.priority) {
    where.priority = options.priority
  }

  if (options?.assigneeId) {
    where.assigneeId = options.assigneeId
  }

  if (options?.search) {
    where.title = { contains: options.search, mode: 'insensitive' }
  }

  if (options?.labelId) {
    where.labels = { some: { labelId: options.labelId } }
  }

  if (options?.hasDueDate) {
    where.dueDate = { not: null }
  }

  if (options?.dueBefore) {
    where.dueDate = { ...((where.dueDate as object) || {}), lte: options.dueBefore }
  }

  if (options?.dueAfter) {
    where.dueDate = { ...((where.dueDate as object) || {}), gte: options.dueAfter }
  }

  const sortBy = options?.sortBy || 'createdAt'
  const sortOrder = options?.sortOrder || 'desc'

  const issues = await prisma.issue.findMany({
    where,
    include: {
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
      labels: {
        include: {
          label: true,
        },
      },
    },
    orderBy: { [sortBy]: sortOrder },
  })

  return issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    dueDate: issue.dueDate,
    createdAt: issue.createdAt,
    owner: issue.owner,
    assignee: issue.assignee,
    labels: issue.labels.map((l) => l.label),
  }))
}

// Log issue change to history
export async function logIssueChange(
  issueId: string,
  userId: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  tx?: TransactionClient
): Promise<void> {
  const client = tx || prisma

  await client.issueHistory.create({
    data: {
      issueId,
      userId,
      field,
      oldValue,
      newValue,
    },
  })
}

// Get project labels
export async function getProjectLabels(projectId: string) {
  return prisma.issueLabel.findMany({
    where: { projectId },
    orderBy: { name: 'asc' },
  })
}

// Count project labels (for limit check)
export async function countProjectLabels(projectId: string): Promise<number> {
  return prisma.issueLabel.count({
    where: { projectId },
  })
}

// Check if user is valid assignee (team member)
export async function isValidAssignee(
  projectId: string,
  userId: string
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { teamId: true },
  })

  if (!project) return false

  const teamRole = await getUserTeamRole(project.teamId, userId)
  return !!teamRole
}
