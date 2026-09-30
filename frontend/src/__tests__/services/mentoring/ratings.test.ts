import { submitRating, getSessionRatings } from '@/lib/api/mentoring/ratings'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ratings API', () => {
  describe('submitRating', () => {
    it('envoie la note via POST', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 1 }) } as Response)

      expect(await submitRating(5, { score: 4, comment: 'Clair' })).toEqual({ id: 1 })
      expect(mockedFetch).toHaveBeenCalledWith('/mentoring/sessions/5/rate', {
        method: 'POST',
        body: JSON.stringify({ score: 4, comment: 'Clair' }),
      })
    })

    it('lance une erreur portant le code backend', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Deja note', code: 'ALREADY_RATED' }),
      } as Response)

      await expect(submitRating(5, { score: 4 })).rejects.toMatchObject({
        message: 'Deja note',
        code: 'ALREADY_RATED',
      })
    })

    it('utilise un message par defaut si la reponse n\'est pas du JSON', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('invalid json')),
      } as unknown as Response)

      await expect(submitRating(5, { score: 4 })).rejects.toMatchObject({
        message: 'Erreur notation',
        code: undefined,
      })
    })
  })

  describe('getSessionRatings', () => {
    it('retourne les notes de la session', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ score: 5 }]) } as Response)

      expect(await getSessionRatings(5)).toEqual([{ score: 5 }])
      expect(mockedFetch).toHaveBeenCalledWith('/mentoring/sessions/5/ratings')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getSessionRatings(5)).rejects.toThrow('Erreur ratings')
    })
  })
})
