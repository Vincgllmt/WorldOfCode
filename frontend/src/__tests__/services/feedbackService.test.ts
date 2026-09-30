import { checkHasExistingFeedback, submitFeedback } from '@/services/feedbackService'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('feedbackService', () => {
  describe('checkHasExistingFeedback', () => {
    it('retourne l\'etat du feedback existant', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hasExisting: true }),
      } as Response)

      expect(await checkHasExistingFeedback()).toEqual({ hasExisting: true })
      expect(mockedFetch).toHaveBeenCalledWith('/feedback/mine')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(checkHasExistingFeedback()).rejects.toThrow('Erreur lors de la verification')
    })
  })

  describe('submitFeedback', () => {
    const payload = { rating: 5, comment: 'Top' } as any

    it('envoie le feedback via POST', async () => {
      const response = { success: true, message: 'Merci' }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response),
      } as Response)

      expect(await submitFeedback(payload)).toEqual(response)
      expect(mockedFetch).toHaveBeenCalledWith('/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    })

    it('remonte le message d\'erreur du backend', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Deja envoye' }),
      } as Response)

      await expect(submitFeedback(payload)).rejects.toThrow('Deja envoye')
    })

    it('utilise un message par defaut sans erreur backend', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      } as Response)

      await expect(submitFeedback(payload)).rejects.toThrow("Erreur lors de l'envoi du feedback")
    })
  })
})
