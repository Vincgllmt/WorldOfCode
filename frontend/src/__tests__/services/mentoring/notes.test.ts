import { getSessionNotes, createSessionNote, deleteSessionNote } from '@/lib/api/mentoring/notes'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

const fakeNote = {
  id: 1,
  content: 'Voir la doc Symfony.',
  type: 'note' as const,
  author: { id: 10, username: 'MentorBob' },
  createdAt: '2026-05-01T09:00:00Z',
}

describe('notes API', () => {
  describe('getSessionNotes', () => {
    it('retourne la liste des notes de la session', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([fakeNote]),
      } as Response)

      const result = await getSessionNotes(5)
      expect(result).toEqual([fakeNote])
      expect(mockedFetch).toHaveBeenCalledWith('/mentoring/sessions/5/notes')
    })

    it('lance une erreur si la requête échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getSessionNotes(5)).rejects.toThrow('Erreur chargement notes')
    })
  })

  describe('createSessionNote', () => {
    it('crée une note de type note et retourne les données', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fakeNote),
      } as Response)

      const result = await createSessionNote(5, { content: 'Voir la doc Symfony.', type: 'note' })
      expect(result).toEqual(fakeNote)
      expect(mockedFetch).toHaveBeenCalledWith(
        '/mentoring/sessions/5/notes',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Voir la doc Symfony.', type: 'note' }),
        }),
      )
    })

    it('crée une note de type link', async () => {
      const linkNote = { ...fakeNote, type: 'link' as const, content: 'https://symfony.com' }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(linkNote),
      } as Response)

      const result = await createSessionNote(5, { content: 'https://symfony.com', type: 'link' })
      expect(result.type).toBe('link')
    })

    it('lance une erreur si la création échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(createSessionNote(5, { content: 'test', type: 'note' })).rejects.toThrow('Erreur création note')
    })
  })

  describe('deleteSessionNote', () => {
    it('envoie une requête DELETE sur la bonne URL', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)
      await deleteSessionNote(5, 1)
      expect(mockedFetch).toHaveBeenCalledWith(
        '/mentoring/sessions/5/notes/1',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    it('lance une erreur si la suppression échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(deleteSessionNote(5, 1)).rejects.toThrow('Erreur suppression note')
    })
  })
})
