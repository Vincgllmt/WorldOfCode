import { getMentorStats } from '@/lib/api/mentoring/stats'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('stats API', () => {
  describe('getMentorStats', () => {
    it('retourne les statistiques du mentor', async () => {
      const stats = { totalSessions: 10, activeSessions: 2, averageRating: 4.5, totalMentees: 6, reliabilityRate: 0.9 }
      mockedFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(stats) } as Response)

      expect(await getMentorStats()).toEqual(stats)
      expect(mockedFetch).toHaveBeenCalledWith('/mentor/stats')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getMentorStats()).rejects.toThrow('Impossible de charger les stats')
    })
  })
})
