import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { enhanceIssueDescription, suggestPriority, suggestSubtasks } from '@/lib/ai'

// POST - AI enhance description or get suggestions
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, title, description } = await request.json()

    if (!action || !title) {
      return NextResponse.json({ error: 'Action and title are required' }, { status: 400 })
    }

    let result

    switch (action) {
      case 'enhance':
        result = await enhanceIssueDescription({ title, description })
        return NextResponse.json({ enhanced: result })

      case 'suggest-priority':
        result = await suggestPriority({ title, description })
        return NextResponse.json(result)

      case 'suggest-subtasks':
        result = await suggestSubtasks({ title, description })
        return NextResponse.json({ subtasks: result })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI enhance error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    )
  }
}
