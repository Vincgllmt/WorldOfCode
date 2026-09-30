import { postGroupSuggestion } from '@/services/groupSuggestionService'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

const sentPayload = () => JSON.parse((mockedFetch.mock.calls[0][1] as RequestInit).body as string)

beforeEach(() => {
  jest.clearAllMocks()
})

describe('groupSuggestionService', () => {
  describe('postGroupSuggestion', () => {
    it('envoie uniquement le nom si les champs optionnels sont vides', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)

      await postGroupSuggestion({ name: 'Rustaceans', description: '   ', rssFeedUrl: '' })
      expect(mockedFetch).toHaveBeenCalledWith('/group-suggestions', expect.objectContaining({ method: 'POST' }))
      expect(sentPayload()).toEqual({ name: 'Rustaceans' })
    })

    it('trim la description et l\'URL RSS', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)

      await postGroupSuggestion({
        name: 'Rustaceans',
        description: '  Tout sur Rust  ',
        rssFeedUrl: ' https://blog.rust-lang.org/feed.xml ',
      })
      expect(sentPayload()).toEqual({
        name: 'Rustaceans',
        description: 'Tout sur Rust',
        rssFeedUrl: 'https://blog.rust-lang.org/feed.xml',
      })
    })

    it('remonte le message d\'erreur du backend', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Nom deja pris' }),
      } as Response)

      await expect(postGroupSuggestion({ name: 'X' })).rejects.toThrow('Nom deja pris')
    })

    it('utilise un message par defaut si la reponse n\'est pas du JSON', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('invalid json')),
      } as unknown as Response)

      await expect(postGroupSuggestion({ name: 'X' })).rejects.toThrow('Erreur lors de la soumission de la suggestion.')
    })
  })
})
