import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getUserTeamRole, TeamRole, logTeamActivity } from '@/lib/teams'

type TransactionClient = Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

// Check if user can manage a project (OWNER/ADMIN or project owner)
export async function canManageProject(
  projectId: string,
  userId: string
): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { team: true },
  })

  if (!project) return false

  // Check if user is project owner
  if (project.ownerId === userId) return true

  // Check if user is team OWNER or ADMIN
  const teamRole = await getUserTeamRole(project.teamId, userId)
  if (teamRole === 'OWNER' || teamRole === 'ADMIN') return true

  return false
}

// Check if user is team member (can view projects)
export async function canViewProject(
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

// Get project with team info
export async function getProjectById(projectId: string, userId?: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: {
      team: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      },
      owner: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  })

  if (!project) return null

  // Check if favorited by user
  let isFavorited = false
  if (userId) {
    const favorite = await prisma.projectFavorite.findUnique({
      where: { projectId_userId: { projectId, userId } },
    })
    isFavorited = !!favorite
  }

  // Explicitly return to preserve TypeScript types
  return {
    id: project.id,
    teamId: project.teamId,
    ownerId: project.ownerId,
    name: project.name,
    description: project.description,
    archivedAt: project.archivedAt,
    deletedAt: project.deletedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    team: project.team,
    owner: project.owner,
    isFavorited,
  }
}

// Get all projects for a team
export async function getTeamProjects(teamId: string, userId: string) {
  const projects = await prisma.project.findMany({
    where: {
      teamId,
      deletedAt: null,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      favorites: {
        where: { userId },
        select: { id: true },
      },
      _count: {
        select: { favorites: true },
      },
    },
    orderBy: [
      { archivedAt: 'asc' }, // Non-archived first (null first)
      { createdAt: 'desc' },
    ],
  })

  // Get favorite project IDs for sorting
  const favoriteIds = new Set(
    projects.filter((p) => p.favorites.length > 0).map((p) => p.id)
  )

  // Sort: favorites first, then non-archived, then by date
  const sortedProjects = projects.sort((a, b) => {
    // Favorites first
    const aFav = a.favorites.length > 0
    const bFav = b.favorites.length > 0
    if (aFav && !bFav) return -1
    if (!aFav && bFav) return 1

    // Non-archived first
    if (!a.archivedAt && b.archivedAt) return -1
    if (a.archivedAt && !b.archivedAt) return 1

    // Then by date
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  return sortedProjects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    archivedAt: p.archivedAt,
    createdAt: p.createdAt,
    owner: p.owner,
    isFavorited: p.favorites.length > 0,
    favoriteCount: p._count.favorites,
  }))
}

// Count projects in team (for limit check)
export async function countTeamProjects(teamId: string): Promise<number> {
  return prisma.project.count({
    where: { teamId, deletedAt: null },
  })
}

// Toggle project favorite
export async function toggleProjectFavorite(
  projectId: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.projectFavorite.findUnique({
    where: { projectId_userId: { projectId, userId } },
  })

  if (existing) {
    await prisma.projectFavorite.delete({
      where: { id: existing.id },
    })
    return false
  } else {
    await prisma.projectFavorite.create({
      data: { projectId, userId },
    })
    return true
  }
}

// Log project activity (reuses team activity log)
export async function logProjectActivity(
  projectId: string,
  teamId: string,
  type: string,
  userId?: string,
  metadata?: Record<string, unknown>,
  tx?: TransactionClient
): Promise<void> {
  await logTeamActivity(
    teamId,
    type as any,
    userId,
    { ...metadata, projectId },
    tx
  )
}
