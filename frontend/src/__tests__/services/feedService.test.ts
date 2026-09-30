import { getFeed } from '@/services/feedService'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('feedService', () => {
  describe('getFeed', () => {
    const feed = { items: [{ type: 'post', post: { id: 1 } }], page: 1, limit: 10, totalItems: 1, totalPages: 1 }

    it('utilise la pagination par defaut', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(feed) } as Response)

      expect(await getFeed()).toEqual(feed)
      expect(mockedFetch).toHaveBeenCalledWith('/feed?page=1&limit=10')
    })

    it('transmet la page et la limite', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(feed) } as Response)

      await getFeed(2, 30)
      expect(mockedFetch).toHaveBeenCalledWith('/feed?page=2&limit=30')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getFeed()).rejects.toThrow('Erreur lors du chargement du feed')
    })
  })
})
