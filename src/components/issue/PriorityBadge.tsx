interface PriorityBadgeProps {
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const priorityConfig = {
  HIGH: {
    label: 'High',
    bgClass: 'bg-red-100 text-red-700',
    dotClass: 'bg-red-500',
    icon: '🔴',
  },
  MEDIUM: {
    label: 'Medium',
    bgClass: 'bg-yellow-100 text-yellow-700',
    dotClass: 'bg-yellow-500',
    icon: '🟡',
  },
  LOW: {
    label: 'Low',
    bgClass: 'bg-blue-100 text-blue-700',
    dotClass: 'bg-blue-500',
    icon: '🔵',
  },
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
}

export function PriorityBadge({
  priority,
  size = 'md',
  showLabel = true,
}: PriorityBadgeProps) {
  const config = priorityConfig[priority]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${config.bgClass}`}
      title={`${config.label} Priority`}
    >
      <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
      {showLabel && config.label}
    </span>
  )
}

export function getPriorityIcon(priority: 'HIGH' | 'MEDIUM' | 'LOW'): string {
  return priorityConfig[priority].icon
}

export function getPriorityLabel(priority: 'HIGH' | 'MEDIUM' | 'LOW'): string {
  return priorityConfig[priority].label
}
