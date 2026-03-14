import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/reset-password', '/reset-password/confirm']

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isPublicRoute = publicRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )

  // Allow public routes
  if (isPublicRoute) {
    // Redirect logged-in users away from auth pages
    if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl))
    }
    return NextResponse.next()
  }

  // Allow API routes (they handle their own auth)
  if (nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Protect all other routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
  unstable_allowDynamic: ['**/node_modules/**', '**/lib/**'],
}
