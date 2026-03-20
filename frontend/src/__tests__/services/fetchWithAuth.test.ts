import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { getCookie, deleteCookie } from 'cookies-next'

jest.mock('cookies-next', () => ({
  getCookie: jest.fn(),
  deleteCookie: jest.fn(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.clearAllMocks()
})

describe('fetchWithAuth', () => {
  it('ajoute le header Authorization quand un token existe', async () => {
    ;(getCookie as jest.Mock).mockReturnValue('jwt-token-123')
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

    await fetchWithAuth('/me')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/me'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-token-123',
        }),
      })
    )
  })

  it('n\'ajoute pas Authorization sans token', async () => {
    ;(getCookie as jest.Mock).mockReturnValue(undefined)
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

    await fetchWithAuth('/me')

    const callArgs = mockFetch.mock.calls[0][1]
    expect(callArgs.headers).not.toHaveProperty('Authorization')
  })

  it('ajoute Content-Type quand un body est présent', async () => {
    ;(getCookie as jest.Mock).mockReturnValue('jwt')
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })

    await fetchWithAuth('/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('supprime le cookie et redirige si 401', async () => {
    ;(getCookie as jest.Mock).mockReturnValue('expired-jwt')
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 })

    // Mock window.location
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })

    await expect(fetchWithAuth('/me')).rejects.toThrow('Session expirée')
    expect(deleteCookie).toHaveBeenCalledWith('token')
    expect(window.location.href).toBe('/login')

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    })
  })

  it('retourne la réponse normalement si pas 401', async () => {
    ;(getCookie as jest.Mock).mockReturnValue('jwt')
    const mockResponse = { ok: true, status: 200, json: () => Promise.resolve({}) }
    mockFetch.mockResolvedValueOnce(mockResponse)

    const result = await fetchWithAuth('/data')
    expect(result).toBe(mockResponse)
  })
})
