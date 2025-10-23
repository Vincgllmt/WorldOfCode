import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/api', '/reset-password', '/forgot-password']

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value
    const { pathname } = request.nextUrl

    const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
    const isAuthRoute = ['/login', '/register'].includes(pathname)

    // Non connecté et route privée → rediriger vers login
    if (!isPublic && !token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Déjà connecté et sur login/register → rediriger vers la page d'accueil
    if (isAuthRoute && token) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
    ],
}

