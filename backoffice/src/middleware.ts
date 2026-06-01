import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/unauthorized', '/_next', '/favicon.ico']

export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  const { pathname } = request.nextUrl

  // Laisser passer tous les fichiers statiques publics (images, fonts, etc.)
  // Détection : path qui contient un "." dans le dernier segment (ex: /logo2.png)
  const isStaticAsset = /\.[a-zA-Z0-9]+$/.test(pathname)
  if (isStaticAsset) {
    return NextResponse.next()
  }

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
