import { getStripeConnectStatus, startStripeOnboarding } from '@/lib/api/stripe'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('stripe connect API', () => {
  describe('getStripeConnectStatus', () => {
    it('retourne le statut du compte connecté', async () => {
      const payload = { stripe_account_id: 'acct_1', transfers_enabled: true, onboarding_required: false }
      mockedFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(payload) } as Response)

      const result = await getStripeConnectStatus()

      expect(result).toEqual(payload)
      expect(mockedFetch).toHaveBeenCalledWith('/stripe/connect/status')
    })

    it('lance une erreur si la requête échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) } as Response)
      await expect(getStripeConnectStatus()).rejects.toThrow('Erreur statut Stripe')
    })
  })

  describe('startStripeOnboarding', () => {
    it('retourne l\'URL d\'onboarding hébergée par Stripe', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ onboarding_url: 'https://connect.stripe.com/setup/abc' }),
      } as Response)

      const url = await startStripeOnboarding()

      expect(url).toBe('https://connect.stripe.com/setup/abc')
      expect(mockedFetch).toHaveBeenCalledWith('/stripe/connect/onboard', expect.objectContaining({ method: 'POST' }))
    })

    it('lance une erreur si l\'onboarding échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) } as Response)
      await expect(startStripeOnboarding()).rejects.toThrow('Erreur onboarding Stripe')
    })
  })
})
