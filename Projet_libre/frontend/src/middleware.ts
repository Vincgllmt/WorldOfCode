import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/api']

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  const isAuthRoute = ['/login', '/register'].includes(pathname)

  // Non connecté et route privée  rediriger vers login
  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Déjà connecté et sur login/register → rediriger vers home
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return NextResponse.next()
}


export const config = {
  matcher: [
    /*
      Match all routes except:
      - _next (static assets)
      - favicon.ico
    */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
