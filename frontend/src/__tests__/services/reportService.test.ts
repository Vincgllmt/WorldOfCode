import { reportPost } from '@/services/reportService'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('reportService', () => {
  describe('reportPost', () => {
    it('signale un post via POST avec la raison', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)

      await expect(reportPost(8, 'spam')).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/report/post/8', {
        method: 'POST',
        body: JSON.stringify({ reason: 'spam' }),
      })
    })

    it('traduit l\'erreur de signalement deja effectue', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Already reported' }),
      } as Response)

      await expect(reportPost(8, 'spam')).rejects.toThrow('Vous avez déjà signalé cette publication.')
    })

    it('remonte les autres messages d\'erreur du backend', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Post not found' }),
      } as Response)

      await expect(reportPost(8, 'spam')).rejects.toThrow('Post not found')
    })

    it('utilise un message par defaut si la reponse n\'est pas du JSON', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('invalid json')),
      } as unknown as Response)

      await expect(reportPost(8, 'spam')).rejects.toThrow('Erreur lors du signalement')
    })
  })
})
