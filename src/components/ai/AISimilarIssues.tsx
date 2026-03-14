'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Loader2, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface SimilarIssue {
  id: string
  title: string
  status: string
  priority: string
  similarity: string
  project: { id: string; name: string }
}

interface AISimilarIssuesProps {
  title: string
  description: string
  projectId: string
  onDismiss?: () => void
}

export function AISimilarIssues({ title, description, projectId, onDismiss }: AISimilarIssuesProps) {
  const [similarIssues, setSimilarIssues] = useState<SimilarIssue[]>([])
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // Debounce the check
    const timer = setTimeout(() => {
      if (title.trim().length >= 5) {
        checkSimilar()
      }
    }, 1000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description])

  const checkSimilar = async () => {
    if (loading || checked) return

    setLoading(true)

    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, projectId }),
      })

      if (response.ok) {
        const data = await response.json()
        setSimilarIssues(data.similarIssues || [])
      }
    } catch (error) {
      console.error('Failed to check similar issues:', error)
    } finally {
      setLoading(false)
      setChecked(true)
    }
  }

  if (loading) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Checking for similar issues...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (similarIssues.length === 0) {
    return null
  }

  const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    BACKLOG: { bg: 'bg-gray-100', text: 'text-gray-700' },
    IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700' },
    DONE: { bg: 'bg-green-100', text: 'text-green-700' },
  }

  return (
    <Card className="bg-amber-50 border-amber-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h4 className="font-medium text-amber-900">Similar Issues Found</h4>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-amber-600 hover:text-amber-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-sm text-amber-700 mb-3">
          These existing issues might be related to what you're creating:
        </p>

        <div className="space-y-2">
          {similarIssues.map((issue) => {
            const statusStyle = STATUS_STYLES[issue.status] || STATUS_STYLES.BACKLOG
            return (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                target="_blank"
                className="block p-3 bg-white rounded border hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{issue.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{issue.similarity}</p>
                  </div>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    {issue.status.replace('_', ' ')}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>

        <p className="text-xs text-amber-600 mt-3">
          Consider updating an existing issue instead of creating a duplicate.
        </p>
      </CardContent>
    </Card>
  )
}
