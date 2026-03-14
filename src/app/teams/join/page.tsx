'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface InviteData {
  email: string
  teamName: string
  teamId: string
  expiresAt: string
}

function JoinTeamContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('No invite token provided')
      setLoading(false)
      return
    }

    fetchInvite()
  }, [token])

  async function fetchInvite() {
    if (!token) return

    try {
      const response = await fetch(`/api/invites/${token}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid invite')
        setLoading(false)
        return
      }

      setInvite(data.invite)
    } catch {
      setError('Failed to load invite')
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept() {
    if (!token) return

    setAccepting(true)
    setError(null)

    try {
      const response = await fetch(`/api/invites/${token}`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to accept invite')
        setAccepting(false)
        return
      }

      router.push(`/teams/${data.team.id}`)
    } catch {
      setError('Failed to accept invite')
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-4">Invalid Invite</h1>
            <p className="text-red-600 mb-4">{error}</p>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!invite) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Team Invitation</h1>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded mb-4">
              {error}
            </div>
          )}

          <p className="text-gray-600 mb-2">
            You've been invited to join
          </p>
          <p className="text-2xl font-bold text-gray-900 mb-4">
            {invite.teamName}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Invite sent to: {invite.email}
          </p>

          <div className="flex gap-4">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </button>
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-800 py-2"
            >
              Decline
            </Link>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Expires: {new Date(invite.expiresAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function JoinTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <JoinTeamContent />
    </Suspense>
  )
}
