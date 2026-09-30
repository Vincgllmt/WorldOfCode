import { getMessages, searchMessages } from '@/services/messageService'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

const okResponse = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)

beforeEach(() => {
  jest.clearAllMocks()
})

describe('messageService', () => {
  describe('getMessages', () => {
    it('retourne les messages d\'une conversation', async () => {
      const messages = [{ id: 'm1', body: 'Salut choom' }]
      mockedFetch.mockResolvedValueOnce(okResponse(messages))

      expect(await getMessages('conv-1')).toEqual(messages)
      expect(mockedFetch).toHaveBeenCalledWith('/messaging/conversations/conv-1/messages')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getMessages('conv-1')).rejects.toThrow('Erreur lors du chargement des messages')
    })
  })

  describe('searchMessages', () => {
    it('encode la requete dans l\'URL', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse([]))

      await searchMessages('rendez-vous & café')
      expect(mockedFetch).toHaveBeenCalledWith(
        `/messaging/messages/search?q=${encodeURIComponent('rendez-vous & café')}`
      )
    })

    it('retourne les resultats', async () => {
      const results = [{ id: 'm2', body: 'hello' }]
      mockedFetch.mockResolvedValueOnce(okResponse(results))

      expect(await searchMessages('hello')).toEqual(results)
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(searchMessages('x')).rejects.toThrow('Erreur lors de la recherche')
    })
  })
})
