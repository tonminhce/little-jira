import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

type AlertVariant = 'error' | 'success' | 'warning' | 'info'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: typeof AlertCircle }> = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: AlertCircle,
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: CheckCircle,
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: Info,
  },
}

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const styles = variantStyles[variant]
  const Icon = styles.icon

  return (
    <div
      className={cn(
        'p-4 rounded border flex gap-3',
        styles.bg,
        styles.border,
        styles.text,
        className
      )}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        {title && <p className="font-medium mb-1">{title}</p>}
        <div className={cn('text-sm', title && 'opacity-90')}>{children}</div>
      </div>
    </div>
  )
}
