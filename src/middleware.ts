import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/reset-password', '/reset-password/confirm']

// Simple token check without heavy auth imports
async function getSessionToken(req: NextRequest): Promise<string | undefined> {
  // Check for session token in cookies (next-auth.jwt)
  const sessionToken = req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value
  return sessionToken
}

export async function middleware(req: NextRequest) {
  const { nextUrl } = req
  const sessionToken = await getSessionToken(req)
  const isLoggedIn = !!sessionToken

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
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
