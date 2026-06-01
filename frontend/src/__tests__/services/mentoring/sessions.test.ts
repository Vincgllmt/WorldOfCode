import {
  getMentorActiveSessions,
  getMentorAllSessions,
  getJuniorSessions,
  getSession,
  startSession,
  completeSession,
  confirmSessionSchedule,
} from '@/lib/api/mentoring/sessions'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

const fakeSession = {
  id: 5,
  status: 'scheduled' as const,
  format: 'text' as const,
  scheduledAt: null,
  startedAt: null,
  completedAt: null,
  conversationId: 'conv-abc',
  mentor: { id: 1, username: 'MentorBob' },
  junior: { id: 2, username: 'AliceJunior' },
  createdAt: '2026-04-01T10:00:00Z',
}

describe('sessions API', () => {
  describe('getMentorActiveSessions', () => {
    it('retourne les sessions actives du mentor', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([fakeSession]),
      } as Response)

      const result = await getMentorActiveSessions()
      expect(result).toEqual([fakeSession])
      expect(mockedFetch).toHaveBeenCalledWith('/mentor/sessions')
    })

    it('lance une erreur si la requête échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getMentorActiveSessions()).rejects.toThrow('Erreur sessions actives')
    })
  })

  describe('getMentorAllSessions', () => {
    it('retourne toutes les sessions du mentor (historique inclus)', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([fakeSession]),
      } as Response)

      const result = await getMentorAllSessions()
      expect(result).toEqual([fakeSession])
      expect(mockedFetch).toHaveBeenCalledWith('/mentor/sessions/all')
    })

    it('lance une erreur si la requête échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getMentorAllSessions()).rejects.toThrow('Erreur sessions mentor')
    })
  })

  describe('getJuniorSessions', () => {
    it('retourne les sessions du junior connecté', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([fakeSession]),
      } as Response)

      const result = await getJuniorSessions()
      expect(result).toEqual([fakeSession])
      expect(mockedFetch).toHaveBeenCalledWith('/mentoring/sessions/mine')
    })

    it('lance une erreur si la requête échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getJuniorSessions()).rejects.toThrow('Erreur sessions junior')
    })
  })

  describe('getSession', () => {
    it('retourne une session par ID', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fakeSession),
      } as Response)

      const result = await getSession(5)
      expect(result).toEqual(fakeSession)
      expect(mockedFetch).toHaveBeenCalledWith('/mentoring/sessions/5')
    })

    it('lance une erreur si la session est introuvable', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getSession(999)).rejects.toThrow('Session introuvable')
    })
  })

  describe('startSession', () => {
    it('démarre une session et retourne les données mises à jour', async () => {
      const started = { ...fakeSession, status: 'in_progress' as const }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(started),
      } as Response)

      const result = await startSession(5)
      expect(result.status).toBe('in_progress')
      expect(mockedFetch).toHaveBeenCalledWith(
        '/mentoring/sessions/5/start',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })

    it('lance une erreur si le démarrage échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(startSession(5)).rejects.toThrow('Erreur démarrage session')
    })
  })

  describe('completeSession', () => {
    it('clôture une session et retourne les données mises à jour', async () => {
      const completed = { ...fakeSession, status: 'completed' as const }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(completed),
      } as Response)

      const result = await completeSession(5)
      expect(result.status).toBe('completed')
      expect(mockedFetch).toHaveBeenCalledWith(
        '/mentoring/sessions/5/complete',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })

    it('lance une erreur si la clôture échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(completeSession(5)).rejects.toThrow('Erreur clôture session')
    })
  })

  describe('confirmSessionSchedule', () => {
    it('confirme la date planifiée de la session', async () => {
      const scheduled = { ...fakeSession, scheduledAt: '2026-05-15T14:00:00Z' }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(scheduled),
      } as Response)

      const result = await confirmSessionSchedule(5, '2026-05-15T14:00:00Z')
      expect(result.scheduledAt).toBe('2026-05-15T14:00:00Z')
      expect(mockedFetch).toHaveBeenCalledWith(
        '/mentoring/sessions/5/schedule',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ scheduledAt: '2026-05-15T14:00:00Z' }),
        }),
      )
    })

    it('lance une erreur si la confirmation de date échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(confirmSessionSchedule(5, '2026-05-15T14:00:00Z')).rejects.toThrow('Erreur confirmation de date')
    })
  })
})
