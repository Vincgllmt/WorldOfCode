import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/unauthorized', '/_next', '/favicon.ico']

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  const isAuthRoute = ['/login'].includes(pathname)

  // Pas de token → login
  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Déjà connecté et sur login → accueil
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
