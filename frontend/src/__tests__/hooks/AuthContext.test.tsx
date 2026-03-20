import { render, screen, act, waitFor } from '@testing-library/react'
import { AuthProvider, AuthContext } from '@/contexts/AuthContext'
import * as authService from '@/services/authService'
import { useContext } from 'react'
import type { TwoFactorRequiredResponse, TokenResponse, AuthenticatedUser } from '@/interfaces/Authentification'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock authService
jest.mock('@/services/authService')
const mockedAuthService = authService as jest.Mocked<typeof authService>

// Mock cookies-next
jest.mock('cookies-next', () => ({
  getCookie: jest.fn(),
  setCookie: jest.fn(),
  deleteCookie: jest.fn(),
}))

// Mock react-hot-toast
const mockToastError = jest.fn()
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    error: (...args: unknown[]) => mockToastError(...args),
    success: jest.fn(),
  }),
}))

// SessionStorage mock
const sessionStore: Record<string, string> = {}
beforeAll(() => {
  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: jest.fn((key: string) => sessionStore[key] ?? null),
      setItem: jest.fn((key: string, val: string) => { sessionStore[key] = val }),
      removeItem: jest.fn((key: string) => { delete sessionStore[key] }),
    },
    writable: true,
  })
})

// Composant utilitaire pour lire le contexte
function AuthConsumer({ onRender }: { onRender: (ctx: ReturnType<typeof useContext<typeof AuthContext>>) => void }) {
  const ctx = useContext(AuthContext)
  onRender(ctx)
  return null
}

const fakeUser: AuthenticatedUser = {
  id: 1,
  username: 'V',
  token: 'jwt-real',
  role: 'ROLE_USER',
  creationDate: '2026-01-01',
  updatedDate: '2026-01-01',
}

beforeEach(() => {
  jest.clearAllMocks()
  Object.keys(sessionStore).forEach((k) => delete sessionStore[k])
  // Par defaut, pas de token stocke
  const { getCookie } = require('cookies-next')
  ;(getCookie as jest.Mock).mockReturnValue(undefined)
})

describe('AuthProvider', () => {
  describe('initialisation', () => {
    it('isLoading = true puis false sans token', async () => {
      let capturedCtx: any
      render(
        <AuthProvider>
          <AuthConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(capturedCtx.isLoading).toBe(false)
      })
      expect(capturedCtx.user).toBeNull()
      expect(capturedCtx.isAuthenticated).toBe(false)
    })

    it('charge le user si un token existe en cookie', async () => {
      const { getCookie } = require('cookies-next')
      ;(getCookie as jest.Mock).mockReturnValue('stored-jwt')
      mockedAuthService.getMe.mockResolvedValueOnce(fakeUser)

      let capturedCtx: any
      render(
        <AuthProvider>
          <AuthConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(capturedCtx.isLoading).toBe(false)
      })
      expect(capturedCtx.user).toEqual(fakeUser)
      expect(capturedCtx.isAuthenticated).toBe(true)
    })

    it('logout si le token stocke est invalide', async () => {
      const { getCookie } = require('cookies-next')
      ;(getCookie as jest.Mock).mockReturnValue('bad-jwt')
      mockedAuthService.getMe.mockRejectedValueOnce(new Error('Token invalide'))

      let capturedCtx: any
      render(
        <AuthProvider>
          <AuthConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(capturedCtx.isLoading).toBe(false)
      })
      expect(capturedCtx.user).toBeNull()
    })
  })

  describe('login()', () => {
    it('redirige vers /2fa si 2FA est requis', async () => {
      const twoFAResponse: TwoFactorRequiredResponse = {
        requires2FA: true,
        tempToken: 'temp-123',
        maskedEmail: 'v***@night.city',
      }
      mockedAuthService.login.mockResolvedValueOnce(twoFAResponse)
      mockedAuthService.isTwoFactorRequired.mockReturnValueOnce(true)

      let capturedCtx: any
      render(
        <AuthProvider>
          <AuthConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </AuthProvider>
      )

      await waitFor(() => expect(capturedCtx.isLoading).toBe(false))

      await act(async () => {
        await capturedCtx.login({ username: 'V', password: 'night2077' })
      })

      expect(sessionStore['2fa_tempToken']).toBe('temp-123')
      expect(sessionStore['2fa_maskedEmail']).toBe('v***@night.city')
      expect(mockPush).toHaveBeenCalledWith('/2fa')
    })

    it('affiche un toast erreur si les credentials sont mauvais', async () => {
      mockedAuthService.login.mockRejectedValueOnce(new Error('Bad credentials'))

      let capturedCtx: any
      render(
        <AuthProvider>
          <AuthConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </AuthProvider>
      )

      await waitFor(() => expect(capturedCtx.isLoading).toBe(false))

      await expect(
        act(async () => {
          await capturedCtx.login({ username: 'V', password: 'wrong' })
        })
      ).rejects.toThrow()

      expect(mockToastError).toHaveBeenCalledWith('Bad credentials')
    })
  })

  describe('loginSilent()', () => {
    it('redirige vers /2fa et throw si 2FA requis', async () => {
      const twoFAResponse: TwoFactorRequiredResponse = {
        requires2FA: true,
        tempToken: 'temp-silent',
        maskedEmail: 'j***@test.com',
      }
      mockedAuthService.login.mockResolvedValueOnce(twoFAResponse)
      mockedAuthService.isTwoFactorRequired.mockReturnValueOnce(true)

      let capturedCtx: any
      render(
        <AuthProvider>
          <AuthConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </AuthProvider>
      )

      await waitFor(() => expect(capturedCtx.isLoading).toBe(false))

      await expect(
        act(async () => {
          await capturedCtx.loginSilent({ username: 'jackie', password: 'pass' })
        })
      ).rejects.toThrow('2FA required')

      expect(mockPush).toHaveBeenCalledWith('/2fa')
      expect(sessionStore['2fa_tempToken']).toBe('temp-silent')
    })
  })

  describe('verify2FA()', () => {
    it('set le user et redirige vers /home par defaut', async () => {
      mockedAuthService.verify2FA.mockResolvedValueOnce(fakeUser)
      sessionStore['2fa_tempToken'] = 'temp-token'

      let capturedCtx: any
      render(
        <AuthProvider>
          <AuthConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </AuthProvider>
      )

      await waitFor(() => expect(capturedCtx.isLoading).toBe(false))

      await act(async () => {
        await capturedCtx.verify2FA('847291')
      })

      expect(capturedCtx.user).toEqual(fakeUser)
      expect(mockPush).toHaveBeenCalledWith('/home')
    })

    it('redirige vers /onboarding si 2fa_redirect est set', async () => {
      mockedAuthService.verify2FA.mockResolvedValueOnce(fakeUser)
      sessionStore['2fa_tempToken'] = 'temp-token'
      sessionStore['2fa_redirect'] = '/onboarding'

      let capturedCtx: any
      render(
        <AuthProvider>
          <AuthConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </AuthProvider>
      )

      await waitFor(() => expect(capturedCtx.isLoading).toBe(false))

      await act(async () => {
        await capturedCtx.verify2FA('123456')
      })

      expect(mockPush).toHaveBeenCalledWith('/onboarding')
      // Le redirect est nettoyé
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('2fa_redirect')
    })

    it('lance une erreur si pas de tempToken en session', async () => {
      let capturedCtx: any
      render(
        <AuthProvider>
          <AuthConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </AuthProvider>
      )

      await waitFor(() => expect(capturedCtx.isLoading).toBe(false))

      await expect(
        act(async () => {
          await capturedCtx.verify2FA('123456')
        })
      ).rejects.toThrow('Aucun token temporaire trouvé')
    })
  })

  describe('logout()', () => {
    it('remet le user a null et redirige vers /login', async () => {
      const { getCookie } = require('cookies-next')
      ;(getCookie as jest.Mock).mockReturnValue('jwt')
      mockedAuthService.getMe.mockResolvedValueOnce(fakeUser)

      let capturedCtx: any
      render(
        <AuthProvider>
          <AuthConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </AuthProvider>
      )

      await waitFor(() => expect(capturedCtx.user).toEqual(fakeUser))

      act(() => {
        capturedCtx.logout()
      })

      expect(capturedCtx.user).toBeNull()
      expect(mockedAuthService.logout).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  describe('setUserTheme() / setUserAvatar()', () => {
    it('met a jour le theme du user', async () => {
      const { getCookie } = require('cookies-next')
      ;(getCookie as jest.Mock).mockReturnValue('jwt')
      mockedAuthService.getMe.mockResolvedValueOnce(fakeUser)

      let capturedCtx: any
      render(
        <AuthProvider>
          <AuthConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </AuthProvider>
      )

      await waitFor(() => expect(capturedCtx.user).toEqual(fakeUser))

      act(() => {
        capturedCtx.setUserTheme('dark')
      })

      expect(capturedCtx.user.theme).toBe('dark')
    })

    it('met a jour l\'avatar du user', async () => {
      const { getCookie } = require('cookies-next')
      ;(getCookie as jest.Mock).mockReturnValue('jwt')
      mockedAuthService.getMe.mockResolvedValueOnce(fakeUser)

      let capturedCtx: any
      render(
        <AuthProvider>
          <AuthConsumer onRender={(ctx) => { capturedCtx = ctx }} />
        </AuthProvider>
      )

      await waitFor(() => expect(capturedCtx.user).toEqual(fakeUser))

      act(() => {
        capturedCtx.setUserAvatar('https://cdn.woc.dev/avatar.png')
      })

      expect(capturedCtx.user.avatarUrl).toBe('https://cdn.woc.dev/avatar.png')
    })
  })
})
