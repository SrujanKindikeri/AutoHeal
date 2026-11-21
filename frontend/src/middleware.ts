import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Paths that do NOT require authentication
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/email-verification-success',
  '/_next',
  '/favicon.ico',
  '/api',
]

function isSafeRedirect(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  if (!url.startsWith('/')) return false
  if (url.startsWith('//')) return false
  if (url.includes('://')) return false
  return true
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Check for mf_auth_present cookie set by the frontend after setAuth.
  const authCookie = request.cookies.get('mf_auth_present')
  if (!authCookie?.value) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    if (isSafeRedirect(pathname)) {
      loginUrl.searchParams.set(
        'next',
        pathname + (searchParams.toString() ? '?' + searchParams.toString() : '')
      )
    }
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
