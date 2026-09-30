import { getNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '@/services/notificationService'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

const okResponse = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)

beforeEach(() => {
  jest.clearAllMocks()
})

describe('notificationService', () => {
  describe('getNotifications', () => {
    it('utilise la pagination par defaut', async () => {
      const page = { items: [], total: 0 }
      mockedFetch.mockResolvedValueOnce(okResponse(page))

      expect(await getNotifications()).toEqual(page)
      expect(mockedFetch).toHaveBeenCalledWith('/notifications?page=1&limit=20')
    })

    it('transmet la page et la limite', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse({ items: [] }))

      await getNotifications(3, 5)
      expect(mockedFetch).toHaveBeenCalledWith('/notifications?page=3&limit=5')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getNotifications()).rejects.toThrow('Erreur lors du chargement des notifications')
    })
  })

  describe('getUnreadCount', () => {
    it('retourne le compteur de non lues', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse({ count: 4 }))

      expect(await getUnreadCount()).toEqual({ count: 4 })
      expect(mockedFetch).toHaveBeenCalledWith('/notifications/unread-count')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getUnreadCount()).rejects.toThrow('Erreur lors du chargement du compteur')
    })
  })

  describe('markNotificationRead', () => {
    it('marque une notification comme lue via PUT', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)

      await expect(markNotificationRead(9)).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/notifications/9/read', { method: 'PUT' })
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(markNotificationRead(9)).rejects.toThrow('Erreur lors du marquage de la notification')
    })
  })

  describe('markAllNotificationsRead', () => {
    it('marque toutes les notifications comme lues via PUT', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)

      await expect(markAllNotificationsRead()).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/notifications/read-all', { method: 'PUT' })
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(markAllNotificationsRead()).rejects.toThrow('Erreur lors du marquage des notifications')
    })
  })
})
