import { createComment, getAllComments, getCommentsByPostId, deleteComment, updateComment } from '@/services/commentService'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

const okResponse = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)
const errorResponse = (body: unknown) => ({ ok: false, json: () => Promise.resolve(body) } as Response)
const invalidJsonResponse = () => ({ ok: false, json: () => Promise.reject(new Error('invalid json')) } as unknown as Response)

beforeEach(() => {
  jest.clearAllMocks()
})

describe('commentService', () => {
  describe('createComment', () => {
    const payload = { content: 'Preem !', postId: 3 } as any

    it('cree un commentaire via POST', async () => {
      const comment = { id: 1, content: 'Preem !' }
      mockedFetch.mockResolvedValueOnce(okResponse(comment))

      expect(await createComment(payload)).toEqual(comment)
      expect(mockedFetch).toHaveBeenCalledWith('/comment', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    })

    it('remonte le message d\'erreur du backend', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse({ error: 'Contenu vide' }))
      await expect(createComment(payload)).rejects.toThrow('Contenu vide')
    })

    it('utilise un message par defaut si la reponse n\'est pas du JSON', async () => {
      mockedFetch.mockResolvedValueOnce(invalidJsonResponse())
      await expect(createComment(payload)).rejects.toThrow('Erreur lors de la création du commentaire')
    })
  })

  describe('getAllComments', () => {
    it('retourne tous les commentaires', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse([{ id: 1 }]))

      expect(await getAllComments()).toEqual([{ id: 1 }])
      expect(mockedFetch).toHaveBeenCalledWith('/comment')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getAllComments()).rejects.toThrow('Erreur lors du chargement des commentaires')
    })
  })

  describe('getCommentsByPostId', () => {
    it('retourne les commentaires d\'un post', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse([{ id: 2 }]))

      expect(await getCommentsByPostId('12')).toEqual([{ id: 2 }])
      expect(mockedFetch).toHaveBeenCalledWith('/comment/post/12')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getCommentsByPostId('12')).rejects.toThrow('Erreur lors du chargement des commentaires pour ce post')
    })
  })

  describe('deleteComment', () => {
    it('supprime un commentaire via DELETE', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)

      await expect(deleteComment('5')).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/comment/5', { method: 'DELETE' })
    })

    it('lance une erreur si la suppression echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(deleteComment('5')).rejects.toThrow('Erreur lors de la suppression du commentaire')
    })
  })

  describe('updateComment', () => {
    it('met a jour le contenu via PUT', async () => {
      const updated = { id: 5, content: 'Edit' }
      mockedFetch.mockResolvedValueOnce(okResponse(updated))

      expect(await updateComment({ id: 5, content: 'Edit' } as any)).toEqual(updated)
      expect(mockedFetch).toHaveBeenCalledWith('/comment/5', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Edit' }),
      })
    })

    it('remonte le message d\'erreur du backend', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse({ error: 'Interdit' }))
      await expect(updateComment({ id: 5, content: 'x' } as any)).rejects.toThrow('Interdit')
    })

    it('utilise un message par defaut si la reponse n\'est pas du JSON', async () => {
      mockedFetch.mockResolvedValueOnce(invalidJsonResponse())
      await expect(updateComment({ id: 5, content: 'x' } as any)).rejects.toThrow('Erreur lors de la mise à jour du commentaire')
    })
  })
})
