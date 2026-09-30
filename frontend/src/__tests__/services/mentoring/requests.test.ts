import {
  getMentorFeed,
  getMentorRequestDetail,
  pinRequest,
  unpinRequest,
  createOrGetConversation,
  acceptRequest,
  getMentoringRequestsMine,
  cancelMentoringRequest,
  makeRequestPublic,
  createMentoringRequest,
} from '@/lib/api/mentoring/requests'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

const okResponse = (data?: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)
const errorResponse = (status: number, body: unknown) =>
  ({ ok: false, status, json: () => Promise.resolve(body) } as Response)
const invalidJsonResponse = (status: number) =>
  ({ ok: false, status, json: () => Promise.reject(new Error('invalid json')) } as unknown as Response)

const fakeRequest = { id: 3, title: 'Bug Doctrine', techStack: 'Symfony' }

beforeEach(() => {
  jest.clearAllMocks()
})

describe('mentoring requests API', () => {
  describe('getMentorFeed', () => {
    it('appelle le feed sans query string par defaut', async () => {
      const feed = { data: [fakeRequest], meta: { page: 1, limit: 10, total: 1 } }
      mockedFetch.mockResolvedValueOnce(okResponse(feed))

      expect(await getMentorFeed()).toEqual(feed)
      expect(mockedFetch).toHaveBeenCalledWith('/mentor/requests?')
    })

    it('construit la query string avec les filtres', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse({ data: [], meta: {} }))

      await getMentorFeed({ page: 2, limit: 5, techStack: 'React' })
      expect(mockedFetch).toHaveBeenCalledWith('/mentor/requests?page=2&limit=5&techStack=React')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getMentorFeed()).rejects.toThrow('Erreur feed')
    })
  })

  describe('getMentorRequestDetail', () => {
    it('retourne le detail de la demande', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse(fakeRequest))

      expect(await getMentorRequestDetail(3)).toEqual(fakeRequest)
      expect(mockedFetch).toHaveBeenCalledWith('/mentor/requests/3')
    })

    it('lance une erreur si la demande est introuvable', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getMentorRequestDetail(3)).rejects.toThrow('Demande non trouvée')
    })
  })

  describe('pinRequest', () => {
    it('epingle la demande via POST', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse({ pinned: true }))

      expect(await pinRequest(3)).toEqual({ pinned: true })
      expect(mockedFetch).toHaveBeenCalledWith('/mentor/requests/3/pin', { method: 'POST' })
    })

    it('lance une erreur avec statut et code', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse(409, { error: 'Deja epinglee', code: 'ALREADY_PINNED' }))
      await expect(pinRequest(3)).rejects.toMatchObject({ message: 'Deja epinglee', status: 409, code: 'ALREADY_PINNED' })
    })

    it('utilise un message par defaut', async () => {
      mockedFetch.mockResolvedValueOnce(invalidJsonResponse(500))
      await expect(pinRequest(3)).rejects.toMatchObject({ message: 'Erreur', status: 500 })
    })
  })

  describe('unpinRequest', () => {
    it('desepingle la demande via DELETE', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)

      await expect(unpinRequest(3)).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/mentor/requests/3/pin', { method: 'DELETE' })
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(unpinRequest(3)).rejects.toThrow('Erreur désépinglage')
    })
  })

  describe('createOrGetConversation', () => {
    it('retourne l\'id de la conversation', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse({ id: 'conv-9' }))

      expect(await createOrGetConversation(12)).toBe('conv-9')
      expect(mockedFetch).toHaveBeenCalledWith('/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: 12 }),
      })
    })

    it('lance une erreur si la creation echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(createOrGetConversation(12)).rejects.toThrow('Impossible de créer la conversation')
    })
  })

  describe('acceptRequest', () => {
    const body = { format: 'video', conversationId: 'conv-9' }

    it('accepte la demande via POST', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse({ sessionId: 4 }))

      expect(await acceptRequest(3, body)).toEqual({ sessionId: 4 })
      expect(mockedFetch).toHaveBeenCalledWith('/mentor/requests/3/accept', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    })

    it('lance une erreur avec statut et code', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse(409, { error: 'Deja prise', code: 'TAKEN' }))
      await expect(acceptRequest(3, body)).rejects.toMatchObject({ message: 'Deja prise', status: 409, code: 'TAKEN' })
    })

    it('utilise un message par defaut', async () => {
      mockedFetch.mockResolvedValueOnce(invalidJsonResponse(500))
      await expect(acceptRequest(3, body)).rejects.toMatchObject({ message: 'Erreur', status: 500 })
    })
  })

  describe('getMentoringRequestsMine', () => {
    it('retourne mes demandes', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse([fakeRequest]))

      expect(await getMentoringRequestsMine()).toEqual([fakeRequest])
      expect(mockedFetch).toHaveBeenCalledWith('/mentoring/requests/mine')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getMentoringRequestsMine()).rejects.toThrow('Erreur chargement demandes')
    })
  })

  describe('cancelMentoringRequest', () => {
    it('annule la demande via DELETE', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)

      await expect(cancelMentoringRequest(3)).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/mentoring/requests/3', { method: 'DELETE' })
    })

    it('lance une erreur avec statut et code', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse(400, { error: 'Deja acceptee', code: 'NOT_OPEN' }))
      await expect(cancelMentoringRequest(3)).rejects.toMatchObject({ message: 'Deja acceptee', status: 400, code: 'NOT_OPEN' })
    })

    it('utilise un message par defaut', async () => {
      mockedFetch.mockResolvedValueOnce(invalidJsonResponse(500))
      await expect(cancelMentoringRequest(3)).rejects.toMatchObject({ message: 'Erreur annulation', status: 500 })
    })
  })

  describe('makeRequestPublic', () => {
    it('rend la demande publique via PATCH', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse({ ...fakeRequest, isPublic: true }))

      expect(await makeRequestPublic(3)).toEqual({ ...fakeRequest, isPublic: true })
      expect(mockedFetch).toHaveBeenCalledWith('/mentoring/requests/3/make-public', { method: 'PATCH' })
    })

    it('lance une erreur avec le statut HTTP', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse(403, { error: 'Interdit' }))
      await expect(makeRequestPublic(3)).rejects.toMatchObject({ message: 'Interdit', status: 403 })
    })

    it('utilise un message par defaut', async () => {
      mockedFetch.mockResolvedValueOnce(invalidJsonResponse(500))
      await expect(makeRequestPublic(3)).rejects.toMatchObject({ message: 'Erreur escalade', status: 500 })
    })
  })

  describe('createMentoringRequest', () => {
    const data = { type: 'bug', title: 'Bug Doctrine', techStack: 'Symfony', description: 'Ca plante' }

    it('cree la demande via POST', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse(fakeRequest))

      expect(await createMentoringRequest(data)).toEqual(fakeRequest)
      expect(mockedFetch).toHaveBeenCalledWith('/mentoring/requests', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    })

    it('lance une erreur avec le statut HTTP', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse(422, { error: 'Titre requis' }))
      await expect(createMentoringRequest(data)).rejects.toMatchObject({ message: 'Titre requis', status: 422 })
    })

    it('utilise un message par defaut', async () => {
      mockedFetch.mockResolvedValueOnce(invalidJsonResponse(500))
      await expect(createMentoringRequest(data)).rejects.toMatchObject({ message: 'Erreur création', status: 500 })
    })
  })
})
