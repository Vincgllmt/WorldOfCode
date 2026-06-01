import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as cookiesNext from 'cookies-next'

vi.mock('cookies-next', () => ({
  getCookie:    vi.fn(),
  setCookie:    vi.fn(),
  deleteCookie: vi.fn(),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

// Import AFTER mocks are in place
const { login, verify2FA, logout, getMe } = await import('./authService')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function okJson(data: unknown) {
  return { ok: true, json: () => Promise.resolve(data) }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('authService', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.mocked(cookiesNext.getCookie).mockReturnValue(undefined)
  })

  // ── login() ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('renvoie TwoFAResponse quand la 2FA est requise', async () => {
      const twoFA = { requires2FA: true as const, tempToken: 'tmp123', maskedEmail: 'a***@test.fr' }
      mockFetch.mockResolvedValue(okJson(twoFA))

      const result = await login({ username: 'admin', password: 'secret' })

      expect(result).toEqual(twoFA)
    })

    it('renvoie TokenResponse quand l\'appareil est de confiance', async () => {
      const trusted = { token: 'jwt.payload.sig' }
      mockFetch.mockResolvedValue(okJson(trusted))

      const result = await login({ username: 'admin', password: 'secret' })

      expect(result).toEqual(trusted)
    })

    it('appelle /api/authenticate en POST avec credentials: include', async () => {
      mockFetch.mockResolvedValue(okJson({ token: 'x' }))

      await login({ username: 'admin', password: 'pass' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/authenticate'),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      )
    })

    it('envoie les credentials dans le body JSON', async () => {
      mockFetch.mockResolvedValue(okJson({ token: 'x' }))

      await login({ username: 'admin', password: 'secret' })

      const [, options] = mockFetch.mock.calls[0]
      expect(JSON.parse(options.body)).toEqual({ username: 'admin', password: 'secret' })
    })

    it('lève une erreur sur réponse non-ok', async () => {
      mockFetch.mockResolvedValue({ ok: false })

      await expect(login({ username: 'x', password: 'y' })).rejects.toThrow('Identifiants invalides')
    })
  })

  // ── verify2FA() ──────────────────────────────────────────────────────────────

  describe('verify2FA()', () => {
    it('appelle /api/2fa/verify avec credentials: include', async () => {
      vi.mocked(cookiesNext.getCookie).mockReturnValue('tok')
      mockFetch
        .mockResolvedValueOnce(okJson({ token: 'tok' }))
        .mockResolvedValueOnce(okJson({ id: 1, username: 'admin', role: 'ROLE_ADMIN', creationDate: '', updatedDate: '' }))

      await verify2FA({ tempToken: 'tmp', code: '123456' })

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/api/2fa/verify'),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      )
    })

    it('enregistre le token dans le cookie après succès', async () => {
      vi.mocked(cookiesNext.getCookie).mockReturnValue('abc')
      mockFetch
        .mockResolvedValueOnce(okJson({ token: 'abc' }))
        .mockResolvedValueOnce(okJson({ id: 1, username: 'admin', role: 'ROLE_ADMIN', creationDate: '', updatedDate: '' }))

      await verify2FA({ tempToken: 'tmp', code: '000000' })

      expect(cookiesNext.setCookie).toHaveBeenCalledWith('admin_token', 'abc', { path: '/' })
    })

    it('transmet rememberDevice dans le body quand fourni', async () => {
      vi.mocked(cookiesNext.getCookie).mockReturnValue('xyz')
      mockFetch
        .mockResolvedValueOnce(okJson({ token: 'xyz' }))
        .mockResolvedValueOnce(okJson({ id: 1, username: 'admin', role: 'ROLE_ADMIN', creationDate: '', updatedDate: '' }))

      await verify2FA({ tempToken: 'tmp', code: '111111', rememberDevice: true })

      const [, options] = mockFetch.mock.calls[0]
      expect(JSON.parse(options.body)).toMatchObject({ rememberDevice: true })
    })

    it('ne transmet pas rememberDevice quand non fourni', async () => {
      vi.mocked(cookiesNext.getCookie).mockReturnValue('xyz')
      mockFetch
        .mockResolvedValueOnce(okJson({ token: 'xyz' }))
        .mockResolvedValueOnce(okJson({ id: 1, username: 'admin', role: 'ROLE_ADMIN', creationDate: '', updatedDate: '' }))

      await verify2FA({ tempToken: 'tmp', code: '222222' })

      const [, options] = mockFetch.mock.calls[0]
      expect(JSON.parse(options.body)).not.toHaveProperty('rememberDevice')
    })

    it('lève une erreur sur code invalide', async () => {
      mockFetch.mockResolvedValue({ ok: false })

      await expect(verify2FA({ tempToken: 'tmp', code: 'bad' })).rejects.toThrow('Code invalide ou expiré')
    })

    it('retourne le profil utilisateur', async () => {
      const user = { id: 5, username: 'admin', role: 'ROLE_ADMIN' as const, creationDate: '2024-01-01', updatedDate: '2024-01-01' }
      vi.mocked(cookiesNext.getCookie).mockReturnValue('tok')
      mockFetch
        .mockResolvedValueOnce(okJson({ token: 'tok' }))
        .mockResolvedValueOnce(okJson(user))

      const result = await verify2FA({ tempToken: 'tmp', code: '123456' })

      expect(result).toMatchObject({ id: 5, username: 'admin', role: 'ROLE_ADMIN' })
    })
  })

  // ── getMe() ──────────────────────────────────────────────────────────────────

  describe('getMe()', () => {
    it('appelle /api/me avec le Bearer token', async () => {
      vi.mocked(cookiesNext.getCookie).mockReturnValue('mytoken')
      mockFetch.mockResolvedValue(okJson({ id: 1, username: 'admin', role: 'ROLE_ADMIN', creationDate: '', updatedDate: '' }))

      await getMe()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/me'),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer mytoken' }) }),
      )
    })

    it('lève une erreur quand aucun token en cookie', async () => {
      vi.mocked(cookiesNext.getCookie).mockReturnValue(undefined)

      await expect(getMe()).rejects.toThrow('Token manquant')
    })
  })

  // ── logout() ─────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('supprime le cookie token', () => {
      logout()

      expect(cookiesNext.deleteCookie).toHaveBeenCalledWith('admin_token', { path: '/' })
    })
  })
})
