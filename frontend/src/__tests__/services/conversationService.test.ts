import { getConversations, getConversationById, createConversation, markConversationAsRead } from '@/services/conversationService'
import { getCookie } from 'cookies-next'

jest.mock('cookies-next', () => ({
  getCookie: jest.fn(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'
const okResponse = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) })

beforeEach(() => {
  jest.clearAllMocks()
  ;(getCookie as jest.Mock).mockReturnValue('jwt-token')
})

describe('conversationService', () => {
  describe('getConversations', () => {
    it('retourne les conversations avec le token', async () => {
      const conversations = [{ id: 'c1' }]
      mockFetch.mockResolvedValueOnce(okResponse(conversations))

      expect(await getConversations()).toEqual(conversations)
      expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/messaging/conversations`, {
        headers: { Authorization: 'Bearer jwt-token' },
      })
    })

    it('lance une erreur si la requete echoue', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      await expect(getConversations()).rejects.toThrow('Erreur lors du chargement des conversations')
    })
  })

  describe('getConversationById', () => {
    it('retourne la conversation demandee', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ id: 'c1' }))

      expect(await getConversationById('c1')).toEqual({ id: 'c1' })
      expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/messaging/conversations/c1`, {
        headers: { Authorization: 'Bearer jwt-token' },
      })
    })

    it('lance une erreur si la requete echoue', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      await expect(getConversationById('c1')).rejects.toThrow('Erreur lors de la récupération de la conversation')
    })
  })

  describe('createConversation', () => {
    const payload = { targetUserId: 4 } as any

    it('cree une conversation via POST', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ id: 'c2' }))

      expect(await createConversation(payload)).toEqual({ id: 'c2' })
      expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/messaging/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer jwt-token',
        },
        body: JSON.stringify(payload),
      })
    })

    it('lance une erreur si la creation echoue', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      await expect(createConversation(payload)).rejects.toThrow('Erreur lors de la création de la conversation')
    })
  })

  describe('markConversationAsRead', () => {
    it('envoie un POST sur l\'endpoint read', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true })

      await markConversationAsRead('c1')
      expect(mockFetch).toHaveBeenCalledWith(
        `${API_URL}/messaging/conversations/c1/read`,
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('ne lance pas d\'erreur meme si la requete echoue', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      await expect(markConversationAsRead('c1')).resolves.toBeUndefined()
    })
  })
})
