import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/unauthorized', '/_next', '/favicon.ico']

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  // Routes publiques → on laisse passer
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  //  Pas de token → rediriger vers login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Vérification du rôle
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) throw new Error('Invalid token')

    const user = await res.json()

    if (user.role !== 'ROLE_ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('[Middleware Auth Error]', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
