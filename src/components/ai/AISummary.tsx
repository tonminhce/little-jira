'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface AISummaryProps {
  issueId: string
}

export function AISummary({ issueId }: AISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSummary = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate summary')
      }

      const data = await response.json()
      setSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">AI Summary</h3>
          </div>
          {!loading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={generateSummary}
              className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
            >
              {summary ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Regenerate
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Generate
                </>
              )}
            </Button>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-purple-600 py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating summary...</span>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm py-2">
            {error}
          </div>
        )}

        {summary && !loading && (
          <p className="text-gray-700 text-sm leading-relaxed">
            {summary}
          </p>
        )}

        {!summary && !loading && !error && (
          <p className="text-gray-500 text-sm">
            Click generate to get an AI-powered summary of this issue.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
