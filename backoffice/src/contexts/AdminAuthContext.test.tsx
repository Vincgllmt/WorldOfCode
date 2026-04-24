import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { AdminAuthContext, AdminAuthProvider } from './AdminAuthContext'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('cookies-next', () => ({
  getCookie:    vi.fn(() => null),
  setCookie:    vi.fn(),
  deleteCookie: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error:   vi.fn(),
  }),
}))

vi.mock('@/services/authService', () => ({
  login:    vi.fn(),
  verify2FA: vi.fn(),
  getMe:    vi.fn(),
  logout:   vi.fn(),
}))

import * as authService from '@/services/authService'
import * as cookiesNext from 'cookies-next'
import toast from 'react-hot-toast'

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderContext() {
  return renderHook(() => useContext(AdminAuthContext), {
    wrapper: AdminAuthProvider,
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AdminAuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cookiesNext.getCookie).mockReturnValue(null)
  })

  // ── État initial ─────────────────────────────────────────────────────────────

  describe('initialisation', () => {
    it('part sans utilisateur ni 2FA pending quand aucun cookie', async () => {
      const { result } = renderContext()

      await waitFor(() => expect(result.current?.isLoading).toBe(false))

      expect(result.current?.user).toBeNull()
      expect(result.current?.twoFAPending).toBeNull()
    })

    it('charge le profil si un token existe en cookie', async () => {
      const user = { id: 1, username: 'admin', role: 'ROLE_ADMIN' as const, creationDate: '', updatedDate: '' }
      vi.mocked(cookiesNext.getCookie).mockReturnValue('existing-token')
      vi.mocked(authService.getMe).mockResolvedValue(user)

      const { result } = renderContext()

      await waitFor(() => expect(result.current?.user).not.toBeNull())

      expect(result.current?.user?.username).toBe('admin')
    })

    it('redirige vers /unauthorized si le rôle n\'est pas ROLE_ADMIN', async () => {
      const user = { id: 2, username: 'user', role: 'ROLE_USER' as const, creationDate: '', updatedDate: '' }
      vi.mocked(cookiesNext.getCookie).mockReturnValue('tok')
      vi.mocked(authService.getMe).mockResolvedValue(user)

      renderContext()

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/unauthorized'))
    })
  })

  // ── login() ──────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('définit twoFAPending sur réponse 2FA', async () => {
      const twoFA = { requires2FA: true as const, tempToken: 'tmp', maskedEmail: 'a***@test.fr' }
      vi.mocked(authService.login).mockResolvedValue(twoFA)

      const { result } = renderContext()
      await waitFor(() => expect(result.current?.isLoading).toBe(false))

      await act(async () => {
        await result.current?.login({ username: 'admin', password: 'pass' })
      })

      expect(result.current?.twoFAPending).toEqual({ tempToken: 'tmp', maskedEmail: 'a***@test.fr' })
      expect(result.current?.user).toBeNull()
    })

    it('connecte directement l\'utilisateur sur appareil de confiance (token direct)', async () => {
      const trusted = { token: 'jwt.trusted' }
      const user = { id: 1, username: 'admin', role: 'ROLE_ADMIN' as const, creationDate: '', updatedDate: '' }
      vi.mocked(authService.login).mockResolvedValue(trusted)
      vi.mocked(authService.getMe).mockResolvedValue(user)

      const { result } = renderContext()
      await waitFor(() => expect(result.current?.isLoading).toBe(false))

      await act(async () => {
        await result.current?.login({ username: 'admin', password: 'pass' })
      })

      expect(cookiesNext.setCookie).toHaveBeenCalledWith('token', 'jwt.trusted', { path: '/' })
      expect(result.current?.user?.username).toBe('admin')
      expect(result.current?.twoFAPending).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('n\'expose pas la 2FA sur appareil de confiance', async () => {
      const trusted = { token: 'jwt.trusted' }
      const user = { id: 1, username: 'admin', role: 'ROLE_ADMIN' as const, creationDate: '', updatedDate: '' }
      vi.mocked(authService.login).mockResolvedValue(trusted)
      vi.mocked(authService.getMe).mockResolvedValue(user)

      const { result } = renderContext()
      await waitFor(() => expect(result.current?.isLoading).toBe(false))

      await act(async () => {
        await result.current?.login({ username: 'admin', password: 'pass' })
      })

      expect(result.current?.twoFAPending).toBeNull()
    })

    it('affiche un toast d\'erreur sur échec de login', async () => {
      vi.mocked(authService.login).mockRejectedValue(new Error('Identifiants invalides'))

      const { result } = renderContext()
      await waitFor(() => expect(result.current?.isLoading).toBe(false))

      await act(async () => {
        await result.current?.login({ username: 'bad', password: 'bad' })
      })

      expect(toast.error).toHaveBeenCalledWith('Identifiants invalides')
    })
  })

  // ── verify2FA() ──────────────────────────────────────────────────────────────

  describe('verify2FA()', () => {
    async function setupWith2FAPending() {
      const twoFA = { requires2FA: true as const, tempToken: 'tmp123', maskedEmail: 'a***@test.fr' }
      vi.mocked(authService.login).mockResolvedValue(twoFA)

      const { result } = renderContext()
      await waitFor(() => expect(result.current?.isLoading).toBe(false))

      await act(async () => {
        await result.current?.login({ username: 'admin', password: 'pass' })
      })

      return result
    }

    it('connecte l\'utilisateur après un code valide', async () => {
      const user = { id: 1, username: 'admin', role: 'ROLE_ADMIN' as const, creationDate: '', updatedDate: '' }
      vi.mocked(authService.verify2FA).mockResolvedValue(user)

      const result = await setupWith2FAPending()

      await act(async () => {
        await result.current?.verify2FA('123456')
      })

      expect(result.current?.user?.username).toBe('admin')
      expect(result.current?.twoFAPending).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('passe rememberDevice au service quand coché', async () => {
      const user = { id: 1, username: 'admin', role: 'ROLE_ADMIN' as const, creationDate: '', updatedDate: '' }
      vi.mocked(authService.verify2FA).mockResolvedValue(user)

      const result = await setupWith2FAPending()

      await act(async () => {
        await result.current?.verify2FA('123456', true)
      })

      expect(authService.verify2FA).toHaveBeenCalledWith(
        expect.objectContaining({ rememberDevice: true }),
      )
    })

    it('ne passe pas rememberDevice quand non fourni', async () => {
      const user = { id: 1, username: 'admin', role: 'ROLE_ADMIN' as const, creationDate: '', updatedDate: '' }
      vi.mocked(authService.verify2FA).mockResolvedValue(user)

      const result = await setupWith2FAPending()

      await act(async () => {
        await result.current?.verify2FA('123456')
      })

      expect(authService.verify2FA).toHaveBeenCalledWith(
        expect.objectContaining({ rememberDevice: undefined }),
      )
    })

    it('affiche un toast d\'erreur sur code invalide', async () => {
      vi.mocked(authService.verify2FA).mockRejectedValue(new Error('Code expiré'))

      const result = await setupWith2FAPending()

      await act(async () => {
        await result.current?.verify2FA('000000')
      })

      expect(toast.error).toHaveBeenCalledWith('Code invalide ou expiré ❌')
    })

    it('redirige vers /unauthorized si le role n\'est pas ROLE_ADMIN', async () => {
      const user = { id: 2, username: 'user', role: 'ROLE_USER' as const, creationDate: '', updatedDate: '' }
      vi.mocked(authService.verify2FA).mockResolvedValue(user)

      const result = await setupWith2FAPending()

      await act(async () => {
        await result.current?.verify2FA('123456')
      })

      expect(mockPush).toHaveBeenCalledWith('/unauthorized')
      expect(result.current?.user).toBeNull()
    })
  })

  // ── logout() ─────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('vide l\'utilisateur et redirige vers /login', async () => {
      const user = { id: 1, username: 'admin', role: 'ROLE_ADMIN' as const, creationDate: '', updatedDate: '' }
      vi.mocked(cookiesNext.getCookie).mockReturnValue('tok')
      vi.mocked(authService.getMe).mockResolvedValue(user)

      const { result } = renderContext()
      await waitFor(() => expect(result.current?.user).not.toBeNull())

      act(() => { result.current?.logout() })

      expect(result.current?.user).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})
