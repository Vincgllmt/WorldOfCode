import { login, isTwoFactorRequired, verify2FA, getMe, logout, requestPasswordReset, resetPassword } from '@/services/authService'
import { setCookie, getCookie, deleteCookie } from 'cookies-next'
import type { TwoFactorRequiredResponse, TokenResponse } from '@/interfaces/Authentification'

// Mock cookies-next
jest.mock('cookies-next', () => ({
  setCookie: jest.fn(),
  getCookie: jest.fn(),
  deleteCookie: jest.fn(),
}))

// Mock fetchWithAuth
jest.mock('@/lib/fetchWithAuth', () => ({
  fetchWithAuth: jest.fn(),
}))

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.clearAllMocks()
})

describe('authService', () => {
  describe('login', () => {
    it('retourne un token quand les credentials sont valides', async () => {
      const tokenResponse: TokenResponse = { token: 'jwt-token-123' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tokenResponse),
      })

      const result = await login({ username: 'john', password: 'pass123' })
      expect(result).toEqual(tokenResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/authenticate'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'john', password: 'pass123' }),
        })
      )
    })

    it('retourne une réponse 2FA quand le serveur le demande', async () => {
      const twoFAResponse: TwoFactorRequiredResponse = {
        requires2FA: true,
        tempToken: 'temp-token-abc',
        maskedEmail: 'jo***@gmail.com',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(twoFAResponse),
      })

      const result = await login({ username: 'john', password: 'pass123' })
      expect(result).toEqual(twoFAResponse)
    })

    it('traduit le message "Invalid credentials" du backend en français', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      })

      await expect(login({ username: 'john', password: 'wrong' }))
        .rejects.toThrow('Identifiants invalides. Vérifiez votre nom d’utilisateur et mot de passe.')
    })

    it('utilise le fallback du code HTTP quand le message backend est inconnu', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Some unknown error' }),
      })

      await expect(login({ username: 'john', password: 'wrong' }))
        .rejects.toThrow('Identifiants invalides ou session expirée.')
    })

    it('traduit le message 429 (rate limit) en français', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Too many login attempts. Please try again later.' }),
      })

      await expect(login({ username: 'john', password: 'wrong' }))
        .rejects.toThrow('Trop de tentatives de connexion. Veuillez patienter quelques minutes avant de réessayer.')
    })

    it('lance une erreur réseau si fetch échoue', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(login({ username: 'john', password: 'pass' }))
        .rejects.toThrow(/Connexion au serveur impossible|hors ligne/)
    })
  })

  describe('isTwoFactorRequired', () => {
    it('retourne true pour une réponse 2FA', () => {
      const response: TwoFactorRequiredResponse = {
        requires2FA: true,
        tempToken: 'temp',
        maskedEmail: 'te***@test.com',
      }
      expect(isTwoFactorRequired(response)).toBe(true)
    })

    it('retourne false pour une réponse token classique', () => {
      const response: TokenResponse = { token: 'jwt-123' }
      expect(isTwoFactorRequired(response)).toBe(false)
    })
  })

  describe('verify2FA', () => {
    it('stocke le cookie et retourne le user après vérification', async () => {
      const tokenResponse = { token: 'real-jwt-token' }
      const userData = { id: 1, username: 'john', role: 'ROLE_USER' }

      // Premier appel : POST /2fa/verify
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tokenResponse),
      })
      // Deuxième appel : GET /me
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(userData),
      })

      const result = await verify2FA('temp-token', '123456')

      expect(setCookie).toHaveBeenCalledWith('token', 'real-jwt-token', { path: '/', maxAge: 3600 })
      expect(result).toEqual({ ...userData, token: 'real-jwt-token' })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('traduit le message "Invalid or expired code" du backend en français', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid or expired code' }),
      })

      await expect(verify2FA('temp-token', '000000'))
        .rejects.toThrow('Code incorrect ou expiré. Veuillez réessayer.')
    })

    it('lance une erreur si /me échoue', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'jwt' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      })

      await expect(verify2FA('temp-token', '123456'))
        .rejects.toThrow(/profil|session/i)
    })
  })

  describe('getMe', () => {
    it('retourne le user avec le token quand le cookie existe', async () => {
      const { fetchWithAuth } = require('@/lib/fetchWithAuth')
      ;(getCookie as jest.Mock).mockReturnValue('stored-jwt')
      ;(fetchWithAuth as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 1, username: 'john' }),
      })

      const result = await getMe()
      expect(result).toEqual({ id: 1, username: 'john', token: 'stored-jwt' })
    })

    it('lance une erreur si aucun token en cookie', async () => {
      ;(getCookie as jest.Mock).mockReturnValue(undefined)

      await expect(getMe()).rejects.toThrow('Vous n’êtes pas connecté.')
    })

    it('lance une erreur si le token est invalide', async () => {
      const { fetchWithAuth } = require('@/lib/fetchWithAuth')
      ;(getCookie as jest.Mock).mockReturnValue('expired-jwt')
      ;(fetchWithAuth as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      })

      await expect(getMe()).rejects.toThrow(/session|invalides/i)
    })
  })

  describe('logout', () => {
    it('supprime le cookie token', () => {
      logout()
      expect(deleteCookie).toHaveBeenCalledWith('token')
    })
  })

  describe('requestPasswordReset', () => {
    it('envoie la requête sans erreur', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await expect(requestPasswordReset('john@test.com')).resolves.toBeUndefined()
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/reset-password/request'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'john@test.com' }),
        })
      )
    })

    it('lance une erreur si la requête échoue', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })

      await expect(requestPasswordReset('john@test.com'))
        .rejects.toThrow(/Service temporairement indisponible|Erreur lors de la demande/)
    })
  })

  describe('resetPassword', () => {
    it('envoie token + password au serveur', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await expect(resetPassword('reset-token', 'newPass123')).resolves.toBeUndefined()
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/reset-password/confirm'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'reset-token', password: 'newPass123' }),
        })
      )
    })

    it('lance une erreur avec le fallback du status quand le message est inconnu', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Token expiré' }),
      })

      await expect(resetPassword('bad-token', 'pass'))
        .rejects.toThrow('Requête invalide. Vérifiez les informations saisies.')
    })

    it('lance une erreur par défaut si le json échoue', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.reject(new Error('parse')),
      })

      await expect(resetPassword('bad-token', 'pass'))
        .rejects.toThrow('Requête invalide. Vérifiez les informations saisies.')
    })
  })
})
