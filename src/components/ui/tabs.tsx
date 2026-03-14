'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Tab {
  label: string
  href: string
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  className?: string
}

export function Tabs({ tabs, className }: TabsProps) {
  const pathname = usePathname()

  return (
    <div className={cn('border-b border-gray-200', className)}>
      <nav className="flex gap-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors',
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
