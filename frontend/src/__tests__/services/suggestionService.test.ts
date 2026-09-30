import { getSuggestedUsers } from '@/services/suggestionService'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('suggestionService', () => {
  describe('getSuggestedUsers', () => {
    it('utilise limit=5 et offset=0 par defaut', async () => {
      const users = [{ id: 1, username: 'Kerry' }]
      mockedFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(users) } as Response)

      expect(await getSuggestedUsers()).toEqual(users)
      expect(mockedFetch).toHaveBeenCalledWith('/suggestions/users?limit=5&offset=0')
    })

    it('transmet limit et offset', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) } as Response)

      await getSuggestedUsers(10, 20)
      expect(mockedFetch).toHaveBeenCalledWith('/suggestions/users?limit=10&offset=20')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getSuggestedUsers()).rejects.toThrow('Erreur lors du chargement des suggestions')
    })
  })
})
