import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

type TransactionClient = Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export type ActivityType =
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'MEMBER_KICKED'
  | 'ROLE_CHANGED'
  | 'TEAM_CREATED'
  | 'TEAM_UPDATED'
  | 'TEAM_DELETED'
  | 'INVITE_SENT'
  | 'OWNERSHIP_TRANSFERRED'
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_DELETED'
  | 'PROJECT_ARCHIVED'
  | 'PROJECT_RESTORED'
  | 'ISSUE_CREATED'
  | 'ISSUE_UPDATED'
  | 'ISSUE_DELETED'
  | 'COMMENT_CREATED'
  | 'COMMENT_UPDATED'
  | 'COMMENT_DELETED'

// Permission hierarchy: OWNER > ADMIN > MEMBER
const rolePriority: Record<TeamRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
}

export function isOwner(role: TeamRole): boolean {
  return role === 'OWNER'
}

export function isAdmin(role: TeamRole): boolean {
  return role === 'ADMIN'
}

export function isAtLeastAdmin(role: TeamRole): boolean {
  return rolePriority[role] >= rolePriority['ADMIN']
}

export function isAtLeastOwner(role: TeamRole): boolean {
  return rolePriority[role] >= rolePriority['OWNER']
}

export function canManage(targetRole: TeamRole, actorRole: TeamRole): boolean {
  // Can only manage users with lower or equal role priority
  // But OWNER is special - only OWNER can manage ADMIN
  if (targetRole === 'OWNER') return false
  if (actorRole === 'OWNER') return true
  if (actorRole === 'ADMIN' && targetRole === 'MEMBER') return true
  return false
}

export function canKick(targetRole: TeamRole, actorRole: TeamRole): boolean {
  // OWNER can kick anyone (except themselves - handled elsewhere)
  // ADMIN can only kick MEMBERs
  if (actorRole === 'OWNER') return targetRole !== 'OWNER'
  if (actorRole === 'ADMIN') return targetRole === 'MEMBER'
  return false
}

// Get user's role in a team
export async function getUserTeamRole(
  teamId: string,
  userId: string
): Promise<TeamRole | null> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
    select: { role: true },
  })
  return membership?.role as TeamRole | null
}

// Check if user is a member of the team
export async function isTeamMember(
  teamId: string,
  userId: string
): Promise<boolean> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  })
  return !!membership
}

// Log team activity
export async function logTeamActivity(
  teamId: string,
  type: ActivityType,
  userId?: string,
  metadata?: Record<string, unknown>,
  tx?: TransactionClient
): Promise<void> {
  const client = tx || prisma
  await client.teamActivity.create({
    data: {
      teamId,
      type,
      userId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
}

// Generate a random token for invites
export function generateInviteToken(): string {
  return Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join('')
}

// Get team by ID (excluding deleted teams)
export async function getTeamById(teamId: string) {
  return prisma.team.findFirst({
    where: {
      id: teamId,
      deletedAt: null,
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      },
    },
  })
}

// Get all teams for a user
export async function getUserTeams(userId: string) {
  return prisma.teamMember.findMany({
    where: {
      userId,
      team: {
        deletedAt: null,
      },
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'desc',
    },
  })
}
