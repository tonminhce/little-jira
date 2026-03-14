import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canViewProject } from '@/lib/projects'
import { toggleProjectFavorite } from '@/lib/projects'

// POST - Toggle project favorite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const canView = await canViewProject(projectId, session.user.id)

    if (!canView) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const isFavorited = await toggleProjectFavorite(projectId, session.user.id)

    return NextResponse.json({
      message: isFavorited ? 'Project added to favorites' : 'Project removed from favorites',
      isFavorited,
    })
  } catch (error) {
    console.error('Toggle favorite error:', error)
    return NextResponse.json({ error: 'Failed to toggle favorite' }, { status: 500 })
  }
}
