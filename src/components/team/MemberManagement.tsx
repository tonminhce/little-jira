'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserX, LogOut, Crown } from 'lucide-react'
import { RoleBadge } from './RoleBadge'
import { TeamRole } from '@/lib/teams'
import { useConfirm } from '@/components/ui/confirm-dialog'

interface Member {
  id: string
  role: TeamRole
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface MemberListClientProps {
  teamId: string
  members: Member[]
  currentUserId: string
  currentUserRole: TeamRole
}

export function MemberListClient({
  teamId,
  members: initialMembers,
  currentUserId,
  currentUserRole,
}: MemberListClientProps) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { confirm, dialog } = useConfirm()

  const canKick = (member: Member) => {
    if (member.role === 'OWNER') return false
    if (currentUserRole === 'OWNER') return true
    if (currentUserRole === 'ADMIN' && member.role === 'MEMBER') return true
    return false
  }

  const canChangeRole = currentUserRole === 'OWNER'

  const handleKick = async (memberId: string) => {
    const confirmed = await confirm({
      title: 'Remove Member',
      description: 'Are you sure you want to remove this member from the team?',
      confirmLabel: 'Remove',
      variant: 'danger',
    })
    if (!confirmed) return
    setLoading(memberId)
    setError(null)
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to remove member')
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setLoading(null)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    setLoading(memberId)
    setError(null)
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to change role')
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role')
    } finally {
      setLoading(null)
    }
  }

  const handleTransfer = async (memberId: string) => {
    const confirmed = await confirm({
      title: 'Transfer Ownership',
      description: 'Are you sure you want to transfer ownership? You will become an ADMIN.',
      confirmLabel: 'Transfer',
      variant: 'warning',
    })
    if (!confirmed) return
    setLoading(memberId)
    setError(null)
    try {
      const response = await fetch(`/api/teams/${teamId}/transfer-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId: memberId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to transfer ownership')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer ownership')
    } finally {
      setLoading(null)
    }
  }

  const handleLeaveTeam = async () => {
    const confirmed = await confirm({
      title: 'Leave Team',
      description: 'Are you sure you want to leave this team? You will lose access to all projects and issues.',
      confirmLabel: 'Leave',
      variant: 'danger',
    })
    if (!confirmed) return
    try {
      const response = await fetch(`/api/teams/${teamId}/leave`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to leave team')
        return
      }
      toast.success('You have left the team')
      router.push('/teams')
    } catch {
      toast.error('Failed to leave team')
    }
  }

  return (
    <div className="space-y-4">
      {dialog}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg divide-y">
        {members.map((member) => (
          <div key={member.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                {member.user.image ? (
                  <img
                    src={member.user.image}
                    alt={member.user.name || ''}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <span className="text-gray-600 font-medium">
                    {(member.user.name || member.user.email)[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {member.user.name || member.user.email}
                  {member.user.id === currentUserId && (
                    <span className="ml-2 text-sm text-gray-500">(you)</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">{member.user.email}</p>
              </div>
              <RoleBadge role={member.role} />
            </div>

            {member.user.id !== currentUserId && (
              <div className="flex items-center gap-2">
                {canChangeRole && member.role !== 'OWNER' && (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as TeamRole)}
                    disabled={loading === member.id}
                    className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                  </select>
                )}

                {currentUserRole === 'OWNER' && member.role === 'ADMIN' && (
                  <button
                    onClick={() => handleTransfer(member.id)}
                    disabled={loading === member.id}
                    className="text-purple-600 hover:text-purple-800 text-sm disabled:opacity-50 flex items-center gap-1"
                  >
                    <Crown className="w-3 h-3" />
                    Make Owner
                  </button>
                )}

                {canKick(member) && (
                  <button
                    onClick={() => handleKick(member.id)}
                    disabled={loading === member.id}
                    className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50 flex items-center gap-1"
                  >
                    <UserX className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {currentUserRole !== 'OWNER' && (
        <button
          onClick={handleLeaveTeam}
          className="text-red-600 hover:text-red-800 flex items-center gap-1"
        >
          <LogOut className="w-4 h-4" />
          Leave Team
        </button>
      )}
    </div>
  )
}
