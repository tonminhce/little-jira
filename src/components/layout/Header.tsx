'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface NavLink {
  label: string
  href: string
}

interface HeaderProps {
  breadcrumbs?: NavLink[]
}

export function Header({ breadcrumbs }: HeaderProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const mainLinks: NavLink[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Teams', href: '/teams' },
    { label: 'Invites', href: '/invites' },
  ]

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and main nav */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold text-gray-900 flex-shrink-0">
              Little Jira
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {mainLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive(link.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}

              {/* Breadcrumbs/context links */}
              {breadcrumbs && breadcrumbs.length > 0 && (
                <>
                  <span className="text-gray-300 mx-2">/</span>
                  {breadcrumbs.map((crumb, index) => (
                    <span key={crumb.href} className="flex items-center">
                      {index > 0 && <span className="text-gray-300 mx-2">/</span>}
                      <Link
                        href={crumb.href}
                        className={cn(
                          'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          isActive(crumb.href)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        )}
                      >
                        {crumb.label}
                      </Link>
                    </span>
                  ))}
                </>
              )}
            </nav>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <NotificationBell />

            {/* Desktop user menu */}
            <div className="hidden md:relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-medium text-sm">
                    {(session?.user?.name || session?.user?.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <span className="max-w-32 truncate">
                  {session?.user?.name || session?.user?.email}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <hr className="my-1 border-gray-200" />
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col gap-1">
              {mainLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive(link.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile breadcrumbs */}
              {breadcrumbs && breadcrumbs.length > 0 && (
                <div className="border-t border-gray-200 mt-2 pt-2">
                  {breadcrumbs.map((crumb) => (
                    <Link
                      key={crumb.href}
                      href={crumb.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'px-3 py-2 rounded-md text-sm font-medium transition-colors block',
                        isActive(crumb.href)
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      )}
                    >
                      {crumb.label}
                    </Link>
                  ))}
                </div>
              )}
            </nav>

            {/* Mobile user section */}
            <div className="border-t border-gray-200 mt-4 pt-4">
              <div className="flex items-center gap-3 px-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-medium">
                    {(session?.user?.name || session?.user?.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-sm text-gray-500">{session?.user?.email}</p>
                </div>
              </div>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 w-full"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
