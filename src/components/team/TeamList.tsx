'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TeamForm } from './TeamForm'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton, SkeletonTeamCard } from '@/components/ui/skeleton'

interface Team {
  id: string
  name: string
  role: string
  joinedAt: string
  createdAt: string
}

export function TeamList() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

  async function fetchTeams() {
    try {
      const response = await fetch('/api/teams')
      if (response.ok) {
        const data = await response.json()
        setTeams(data.teams)
      } else {
        setError('Failed to load teams')
      }
    } catch {
      setError('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTeam(name: string) {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create team')
    }

    setTeams([data.team, ...teams])
    setShowCreateForm(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton variant="text" className="w-32 h-8" />
          <Skeleton width={130} height={40} />
        </div>
        <div className="grid gap-4">
          <SkeletonTeamCard />
          <SkeletonTeamCard />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Teams</h2>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant={showCreateForm ? 'secondary' : 'primary'}
        >
          {showCreateForm ? 'Cancel' : 'Create Team'}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="p-6">
          <TeamForm
            onSubmit={handleCreateTeam}
            onCancel={() => setShowCreateForm(false)}
          />
        </Card>
      )}

      {teams.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">You don't have any teams yet.</p>
          <p className="text-gray-500 text-sm">
            Create a team to start collaborating with others.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="bg-white shadow rounded-lg p-6 hover:shadow-md hover:scale-[1.01] transition-all duration-200 block"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {team.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Role: {team.role}
                  </p>
                </div>
                <span className="text-sm text-gray-400">
                  Joined {new Date(team.joinedAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
