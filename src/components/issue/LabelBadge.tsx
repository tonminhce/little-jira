import { X } from 'lucide-react'

interface LabelBadgeProps {
  label: {
    id: string
    name: string
    color: string
  }
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'solid'
  onClick?: () => void
  onRemove?: () => void
  maxLength?: number
}

export function LabelBadge({
  label,
  size = 'md',
  variant = 'default',
  onClick,
  onRemove,
  maxLength,
}: LabelBadgeProps) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  const displayName = maxLength && label.name.length > maxLength
    ? label.name.slice(0, maxLength) + '...'
    : label.name

  const getVariantStyles = () => {
    switch (variant) {
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: label.color,
          border: `2px solid ${label.color}`,
        }
      case 'solid':
        return {
          backgroundColor: label.color,
          color: '#ffffff',
          border: 'none',
        }
      default:
        return {
          backgroundColor: label.color + '20',
          color: label.color,
          border: 'none',
        }
    }
  }

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${
        onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
      }`}
      style={getVariantStyles()}
      title={label.name}
    >
      {displayName}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-1 hover:opacity-70"
          aria-label={`Remove ${label.name}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}
