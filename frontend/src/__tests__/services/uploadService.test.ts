import { uploadImage } from '@/services/uploadService'
import { getCookie } from 'cookies-next'

jest.mock('cookies-next', () => ({
  getCookie: jest.fn(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090/api'

beforeEach(() => {
  jest.clearAllMocks()
  ;(getCookie as jest.Mock).mockReturnValue('jwt-token')
})

describe('uploadService', () => {
  describe('uploadImage', () => {
    it('envoie le fichier en multipart avec le token', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ url: '/uploads/a.png' }) })
      const file = new File(['img'], 'avatar.png', { type: 'image/png' })

      expect(await uploadImage(file)).toEqual({ url: '/uploads/a.png' })

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe(`${API_URL}/upload`)
      expect(options.method).toBe('POST')
      expect(options.headers).toEqual({ Authorization: 'Bearer jwt-token' })
      const sent = (options.body as FormData).get('file') as File
      expect(sent.name).toBe('avatar.png')
    })

    it('nomme "upload" un Blob sans nom', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ url: '/uploads/b.png' }) })

      await uploadImage(new Blob(['img'], { type: 'image/png' }))
      const sent = (mockFetch.mock.calls[0][1].body as FormData).get('file') as File
      expect(sent.name).toBe('upload')
    })

    it('n\'envoie pas d\'en-tete Authorization sans token', async () => {
      ;(getCookie as jest.Mock).mockReturnValue(undefined)
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ url: '/u.png' }) })

      await uploadImage(new Blob(['img']))
      expect(mockFetch.mock.calls[0][1].headers).toEqual({})
    })

    it('lance une erreur si l\'upload echoue', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      await expect(uploadImage(new Blob(['img']))).rejects.toThrow("Erreur lors de l'upload de l'image")
    })

    it('lance une erreur si la reponse ne contient pas d\'URL', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      await expect(uploadImage(new Blob(['img']))).rejects.toThrow('Réponse upload invalide')
    })
  })
})
