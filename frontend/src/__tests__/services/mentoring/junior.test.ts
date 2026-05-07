import { getJuniorStats } from '@/lib/api/mentoring/junior'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

const fakeStats = {
  totalSessions: 3,
  activeSessions: 1,
  completedSessions: 2,
  totalMentors: 2,
  totalRequests: 4,
  averageRating: 4.5,
}

describe('junior API', () => {
  describe('getJuniorStats', () => {
    it('retourne les statistiques du junior connecté', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fakeStats),
      } as Response)

      const result = await getJuniorStats()
      expect(result).toEqual(fakeStats)
      expect(mockedFetch).toHaveBeenCalledWith('/mentoring/junior/stats')
    })

    it('retourne les stats avec averageRating null quand aucune note', async () => {
      const statsNoRating = { ...fakeStats, averageRating: null }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(statsNoRating),
      } as Response)

      const result = await getJuniorStats()
      expect(result.averageRating).toBeNull()
    })

    it('lance une erreur si la requête échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getJuniorStats()).rejects.toThrow('Impossible de charger les stats')
    })
  })
})
