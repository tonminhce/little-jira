interface StatusBadgeProps {
  status: 'BACKLOG' | 'IN_PROGRESS' | 'DONE'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const statusConfig = {
  BACKLOG: {
    label: 'Backlog',
    bgClass: 'bg-gray-100 text-gray-700',
    dotClass: 'bg-gray-400',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bgClass: 'bg-blue-100 text-blue-700',
    dotClass: 'bg-blue-500',
  },
  DONE: {
    label: 'Done',
    bgClass: 'bg-green-100 text-green-700',
    dotClass: 'bg-green-500',
  },
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
}

export function StatusBadge({
  status,
  size = 'md',
  showLabel = true,
}: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${config.bgClass}`}
      title={config.label}
    >
      <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
      {showLabel && config.label}
    </span>
  )
}

export function getStatusLabel(status: 'BACKLOG' | 'IN_PROGRESS' | 'DONE'): string {
  return statusConfig[status].label
}

export function getAllStatuses() {
  return Object.entries(statusConfig).map(([key, value]) => ({
    value: key,
    label: value.label,
  }))
}
