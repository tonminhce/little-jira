'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

interface FavoriteButtonProps {
  projectId: string
  initialFavorited: boolean
  favoriteCount: number
}

export function FavoriteButton({
  projectId,
  initialFavorited,
  favoriteCount: initialCount,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited)
  const [favoriteCount, setFavoriteCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function toggleFavorite() {
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/favorite`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setIsFavorited(data.isFavorited)
        setFavoriteCount((prev) => (data.isFavorited ? prev + 1 : prev - 1))
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`flex items-center gap-1 px-2 py-1 rounded transition ${
        isFavorited
          ? 'text-yellow-500 hover:text-yellow-600'
          : 'text-gray-400 hover:text-yellow-500'
      }`}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={`w-5 h-5 ${loading ? 'animate-pulse' : ''}`}
        fill={isFavorited ? 'currentColor' : 'none'}
      />
      {favoriteCount > 0 && (
        <span className="text-xs">{favoriteCount}</span>
      )}
    </button>
  )
}
