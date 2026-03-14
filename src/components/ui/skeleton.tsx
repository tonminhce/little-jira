import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  }

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200',
        variantClasses[variant],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      {...props}
    />
  )
}

// Pre-built skeleton patterns

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  )
}

export function SkeletonButton({ className }: { className?: string }) {
  return (
    <Skeleton
      width={80}
      height={36}
      className={className}
    />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-lg border shadow-sm p-6 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/3" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        <Skeleton width={60} height={24} />
        <Skeleton width={80} height={24} />
      </div>
    </div>
  )
}

export function SkeletonIssueCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-lg border-l-4 p-3 space-y-3', className)}>
      <Skeleton variant="text" className="w-full h-5" />
      <div className="flex gap-1">
        <Skeleton width={60} height={20} className="rounded-full" />
        <Skeleton width={80} height={20} className="rounded-full" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton width={70} height={16} />
        <Skeleton width={60} height={16} />
      </div>
    </div>
  )
}

export function SkeletonProjectCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-lg border shadow-sm p-6 space-y-4', className)}>
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/2 h-6" />
          <SkeletonText lines={2} />
        </div>
        <SkeletonAvatar size={32} />
      </div>
      <div className="flex gap-4">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="text" className="w-32" />
      </div>
    </div>
  )
}

export function SkeletonTeamCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-lg border shadow-sm p-6 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/2 h-6" />
          <Skeleton variant="text" className="w-1/3" />
        </div>
      </div>
      <div className="flex gap-4">
        <Skeleton width={80} height={24} />
        <Skeleton width={100} height={24} />
      </div>
    </div>
  )
}

export function SkeletonComment({ className }: { className?: string }) {
  return (
    <div className={cn('bg-gray-50 rounded-lg p-4 space-y-3', className)}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={32} />
        <div className="space-y-2">
          <Skeleton variant="text" className="w-32" />
          <Skeleton variant="text" className="w-20 h-3" />
        </div>
      </div>
      <SkeletonText lines={2} className="pl-11" />
    </div>
  )
}

export function SkeletonTableRow({ columns = 4, className }: { columns?: number; className?: string }) {
  return (
    <tr className={className}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton variant="text" className={i === 0 ? 'w-48' : 'w-24'} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTable({ rows = 5, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn('bg-white shadow rounded-lg overflow-hidden', className)}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <Skeleton variant="text" className="w-16 h-4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SkeletonBoard({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-6', className)}>
      {['Backlog', 'In Progress', 'Done'].map((title) => (
        <div key={title} className="bg-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="text" className="w-24 h-5" />
            <Skeleton variant="circular" width={24} height={24} />
          </div>
          <div className="space-y-3">
            <SkeletonIssueCard />
            <SkeletonIssueCard />
            <SkeletonIssueCard />
          </div>
        </div>
      ))}
    </div>
  )
}

// Loading wrapper component
interface LoadingSkeletonProps {
  loading: boolean
  children: React.ReactNode
  skeleton: React.ReactNode
}

export function LoadingSkeleton({ loading, children, skeleton }: LoadingSkeletonProps) {
  if (loading) {
    return <>{skeleton}</>
  }
  return <>{children}</>
}
