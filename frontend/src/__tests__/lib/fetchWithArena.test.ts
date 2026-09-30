import { fetchWithArena } from '@/lib/fetchWithArena'
import { getCookie, deleteCookie } from 'cookies-next'

jest.mock('cookies-next', () => ({
  getCookie: jest.fn(),
  deleteCookie: jest.fn(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

const ARENA_URL = process.env.NEXT_PUBLIC_ARENA_URL || 'http://localhost:8082'

beforeEach(() => {
  jest.clearAllMocks()
  ;(getCookie as jest.Mock).mockReturnValue('jwt-token')
})

describe('fetchWithArena', () => {
  it('ajoute le token et prefixe l\'URL de l\'arena', async () => {
    const response = { status: 200, ok: true }
    mockFetch.mockResolvedValueOnce(response)

    expect(await fetchWithArena('/challenges')).toBe(response)
    expect(mockFetch).toHaveBeenCalledWith(`${ARENA_URL}/challenges`, {
      headers: { Authorization: 'Bearer jwt-token' },
    })
  })

  it('ajoute Content-Type quand un body est envoye', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200 })

    await fetchWithArena('/submit', { method: 'POST', body: '{}' })
    expect(mockFetch).toHaveBeenCalledWith(`${ARENA_URL}/submit`, {
      method: 'POST',
      body: '{}',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jwt-token' },
    })
  })

  it('n\'ajoute pas Authorization sans token et conserve les en-tetes fournis', async () => {
    ;(getCookie as jest.Mock).mockReturnValue(undefined)
    mockFetch.mockResolvedValueOnce({ status: 200 })

    await fetchWithArena('/public', { headers: { 'X-Custom': '1' } })
    expect(mockFetch).toHaveBeenCalledWith(`${ARENA_URL}/public`, {
      headers: { 'X-Custom': '1' },
    })
  })

  it('supprime le cookie et redirige vers /login sur 401', async () => {
    mockFetch.mockResolvedValueOnce({ status: 401 })

    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    })

    await expect(fetchWithArena('/challenges')).rejects.toThrow('Session expirée')
    expect(deleteCookie).toHaveBeenCalledWith('token')
    expect(window.location.href).toBe('/login')

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    })
  })
})
