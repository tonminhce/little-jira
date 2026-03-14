import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserTeamRole, logTeamActivity } from '@/lib/teams'
import { getTeamProjects, countTeamProjects } from '@/lib/projects'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name must be 100 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
})

const MAX_PROJECTS_PER_TEAM = 15

// GET - List all projects for a team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params
    const userRole = await getUserTeamRole(teamId, session.user.id)

    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const projects = await getTeamProjects(teamId, session.user.id)

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

// POST - Create a new project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params
    const userRole = await getUserTeamRole(teamId, session.user.id)

    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check project limit
    const projectCount = await countTeamProjects(teamId)
    if (projectCount >= MAX_PROJECTS_PER_TEAM) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PROJECTS_PER_TEAM} projects per team` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = createProjectSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, description } = validationResult.data

    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          teamId,
          ownerId: session.user.id,
          name,
          description,
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      await logTeamActivity(teamId, 'PROJECT_CREATED', session.user.id, {
        projectId: newProject.id,
        projectName: newProject.name,
      }, tx)

      return newProject
    })

    return NextResponse.json({
      message: 'Project created successfully',
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        owner: project.owner,
      },
    })
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
