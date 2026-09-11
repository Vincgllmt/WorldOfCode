import { getSessionDonationStatus, createDonationIntent } from '@/lib/api/payment'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('payment API', () => {
  describe('getSessionDonationStatus', () => {
    it('retourne le statut de don de la session', async () => {
      const payload = { mentorReady: true, payment: null }
      mockedFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(payload) } as Response)

      const result = await getSessionDonationStatus(7)

      expect(result).toEqual(payload)
      expect(mockedFetch).toHaveBeenCalledWith('/payment/session/7/status')
    })

    it('lance une erreur si la requête échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) } as Response)
      await expect(getSessionDonationStatus(7)).rejects.toThrow('Erreur statut de don')
    })
  })

  describe('createDonationIntent', () => {
    it('crée le PaymentIntent avec session_id, montant et devise par défaut', async () => {
      const payload = { client_secret: 'cs_123', payment_intent_id: 'pi_123', application_fee_cents: 90 }
      mockedFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(payload) } as Response)

      const result = await createDonationIntent(7, 1000)

      expect(result).toEqual(payload)
      expect(mockedFetch).toHaveBeenCalledWith('/payment/intent', {
        method: 'POST',
        body: JSON.stringify({ session_id: 7, amount: 1000, currency: 'eur' }),
      })
    })

    it('remonte le message d\'erreur du backend', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'La session doit être terminée pour proposer un don.' }),
      } as Response)

      await expect(createDonationIntent(7, 1000)).rejects.toThrow('La session doit être terminée pour proposer un don.')
    })
  })
})
