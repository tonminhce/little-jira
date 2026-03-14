'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

interface Invite {
  id: string
  token: string
  teamId: string
  teamName: string
  expiresAt: string
  createdAt: string
}

export function InvitesContent() {
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInvites()
  }, [])

  async function fetchInvites() {
    try {
      const response = await fetch('/api/invites')
      if (response.ok) {
        const data = await response.json()
        setInvites(data.invites)
      } else {
        setError('Failed to load invites')
      }
    } catch {
      setError('Failed to load invites')
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept(token: string) {
    try {
      const response = await fetch(`/api/invites/${token}`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to accept invite')
        return
      }

      toast.success(`You've joined ${data.team.name}`)
      // Remove from list and redirect
      setInvites((prev) => prev.filter((i) => i.token !== token))
      router.push(`/teams/${data.team.id}`)
    } catch {
      toast.error('Failed to accept invite')
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pending Invites</h1>

      {error && (
        <Alert variant="error" className="mb-6">{error}</Alert>
      )}

      {invites.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-600">You have no pending invites.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="bg-white shadow rounded-lg p-6 flex justify-between items-center"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {invite.teamName}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Invited on {new Date(invite.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-400">
                  Expires {new Date(invite.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <Button onClick={() => handleAccept(invite.token)}>
                Accept
              </Button>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
