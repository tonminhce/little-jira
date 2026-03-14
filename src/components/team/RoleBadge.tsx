import { TeamRole } from '@/lib/teams'

interface RoleBadgeProps {
  role: TeamRole | string
}

const roleColors: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  MEMBER: 'bg-gray-100 text-gray-800',
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[role] || roleColors.MEMBER}`}
    >
      {role}
    </span>
  )
}
