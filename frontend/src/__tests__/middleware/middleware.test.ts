/**
 * Tests du middleware Next.js (protection des routes)
 *
 * On teste la logique pure du middleware en mockant NextRequest/NextResponse.
 */

import { NextRequest, NextResponse } from 'next/server'

// Import après mocks
jest.mock('next/server', () => {
  const redirect = jest.fn().mockImplementation((url: URL) => ({
    type: 'redirect',
    url: url.toString(),
  }))
  const next = jest.fn().mockReturnValue({ type: 'next' })

  return {
    NextResponse: { redirect, next },
    NextRequest: jest.fn(),
  }
})

// Helper pour créer un faux NextRequest
function createRequest(pathname: string, hasToken: boolean) {
  return {
    cookies: {
      get: jest.fn((name: string) =>
        name === 'token' && hasToken ? { value: 'fake-jwt' } : undefined
      ),
    },
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
  } as unknown as NextRequest
}

// Import du middleware (après les mocks)
let middleware: (request: NextRequest) => ReturnType<typeof NextResponse.next>

beforeAll(async () => {
  const mod = await import('@/middleware')
  middleware = mod.middleware
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Middleware - Protection des routes', () => {
  describe('Landing page (/)', () => {
    it('redirige un utilisateur connecté vers /home', () => {
      const req = createRequest('/', true)
      middleware(req)
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/home' })
      )
    })

    it('laisse passer un utilisateur non connecté', () => {
      const req = createRequest('/', false)
      middleware(req)
      expect(NextResponse.next).toHaveBeenCalled()
    })
  })

  describe('Routes publiques', () => {
    const publicRoutes = ['/login', '/register', '/reset-password', '/forgot-password', '/2fa']

    publicRoutes.forEach((route) => {
      it(`laisse passer un non-connecté sur ${route}`, () => {
        const req = createRequest(route, false)
        middleware(req)
        expect(NextResponse.next).toHaveBeenCalled()
      })
    })
  })

  describe('Routes privées', () => {
    const privateRoutes = ['/home', '/profile', '/group/1', '/settings']

    privateRoutes.forEach((route) => {
      it(`redirige un non-connecté sur ${route} vers /login`, () => {
        const req = createRequest(route, false)
        middleware(req)
        expect(NextResponse.redirect).toHaveBeenCalledWith(
          expect.objectContaining({ pathname: '/login' })
        )
      })

      it(`laisse passer un connecté sur ${route}`, () => {
        const req = createRequest(route, true)
        middleware(req)
        expect(NextResponse.next).toHaveBeenCalled()
      })
    })
  })

  describe('Redirection login/register si déjà connecté', () => {
    it('redirige /login vers /home si connecté', () => {
      const req = createRequest('/login', true)
      middleware(req)
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/home' })
      )
    })

    it('redirige /register vers /home si connecté', () => {
      const req = createRequest('/register', true)
      middleware(req)
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/home' })
      )
    })
  })
})
