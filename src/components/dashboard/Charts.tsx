'use client'

import { cn } from '@/lib/utils'

interface BarChartProps {
  data: { label: string; value: number; color: string }[]
  maxValue?: number
  className?: string
}

export function BarChart({ data, maxValue: propMaxValue, className }: BarChartProps) {
  const maxValue = propMaxValue || Math.max(...data.map((d) => d.value), 1)

  return (
    <div className={cn('space-y-3', className)}>
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{item.label}</span>
            <span className="font-medium text-gray-900">{item.value}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[]
  size?: number
  strokeWidth?: number
  className?: string
}

export function DonutChart({ data, size = 120, strokeWidth = 20, className }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI

  let accumulatedOffset = 0

  const segments = data.map((item) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0
    const strokeDasharray = (percentage / 100) * circumference
    const strokeDashoffset = -accumulatedOffset
    accumulatedOffset += strokeDasharray

    return {
      ...item,
      percentage,
      strokeDasharray: `${strokeDasharray} ${circumference}`,
      strokeDashoffset,
    }
  })

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
        />
        {/* Data segments */}
        {segments.map((segment, index) => (
          <circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={segment.strokeDasharray}
            strokeDashoffset={segment.strokeDashoffset}
            className="transition-all duration-500"
          />
        ))}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="block text-xs text-gray-500">Total</span>
        </div>
      </div>
    </div>
  )
}

interface LineChartProps {
  data: { date: string; value: number }[]
  className?: string
}

export function LineChart({ data, className }: LineChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const width = 100
  const height = 40
  const padding = 2

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - (d.value / maxValue) * (height - padding * 2) - padding
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`

  // Create area path
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`

  return (
    <div className={cn('w-full', className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" preserveAspectRatio="none">
        {/* Area fill */}
        <path d={areaD} fill="url(#gradient)" opacity="0.3" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="1" />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{data[0]?.date ? new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
        <span>{data[data.length - 1]?.date ? new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  className?: string
}

export function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-lg shadow p-6', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.value >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-sm text-gray-500 ml-2">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-gray-50 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
