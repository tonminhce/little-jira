import { Header } from './Header'

interface NavLink {
  label: string
  href: string
}

interface PageLayoutProps {
  children: React.ReactNode
  breadcrumbs?: NavLink[]
  className?: string
}

export function PageLayout({ children, breadcrumbs, className }: PageLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      <Header breadcrumbs={breadcrumbs} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
