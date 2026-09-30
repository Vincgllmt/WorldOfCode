import { getTechWatchItems, getTechWatchFeed } from '@/services/techWatchService'
import { getCookie } from 'cookies-next'

jest.mock('cookies-next', () => ({
  getCookie: jest.fn(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'
const expectedHeaders = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer jwt-token',
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(getCookie as jest.Mock).mockReturnValue('jwt-token')
})

describe('techWatchService', () => {
  describe('getTechWatchItems', () => {
    it('recupere la veille d\'un groupe avec la pagination par defaut', async () => {
      const data = { items: [], total: 0 }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) })

      expect(await getTechWatchItems(3)).toEqual(data)
      expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/group/3/tech-watch?page=1&limit=20`, expectedHeaders)
    })

    it('transmet la page et la limite', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })

      await getTechWatchItems(3, 2, 5)
      expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/group/3/tech-watch?page=2&limit=5`, expectedHeaders)
    })

    it('lance une erreur si la requete echoue', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      await expect(getTechWatchItems(3)).rejects.toThrow('Erreur lors du chargement de la veille tech')
    })
  })

  describe('getTechWatchFeed', () => {
    it('recupere le fil d\'actualites', async () => {
      const data = { items: [{ id: 1 }] }
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) })

      expect(await getTechWatchFeed(4, 10)).toEqual(data)
      expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/tech-watch/feed?page=4&limit=10`, expectedHeaders)
    })

    it('lance une erreur si la requete echoue', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      await expect(getTechWatchFeed()).rejects.toThrow("Erreur lors du chargement du fil d'actualités")
    })
  })
})
