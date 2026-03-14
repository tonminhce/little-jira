'use client'

import { useState } from 'react'
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

interface MemberListProps {
  members: Member[]
  currentUserId: string
  currentUserRole: TeamRole
  onKickMember: (memberId: string) => Promise<void>
  onChangeRole: (memberId: string, role: TeamRole) => Promise<void>
  onTransferOwnership: (memberId: string) => Promise<void>
}

export function MemberList({
  members,
  currentUserId,
  currentUserRole,
  onKickMember,
  onChangeRole,
  onTransferOwnership,
}: MemberListProps) {
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
      await onKickMember(memberId)
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
      await onChangeRole(memberId, newRole)
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
      await onTransferOwnership(memberId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer ownership')
    } finally {
      setLoading(null)
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
          <div
            key={member.id}
            className="p-4 flex items-center justify-between"
          >
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
                    className="text-purple-600 hover:text-purple-800 text-sm disabled:opacity-50"
                  >
                    Make Owner
                  </button>
                )}

                {canKick(member) && (
                  <button
                    onClick={() => handleKick(member.id)}
                    disabled={loading === member.id}
                    className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
