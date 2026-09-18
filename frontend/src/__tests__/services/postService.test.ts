import { createPost, getAllPosts, getPostById, getPostsByGroupId, updatePost, deletePost, likePost, unlikePost, getLikers, sharePost, reportPost } from '@/services/postService'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'log').mockImplementation(() => {})
})

const fakePost = { id: 1, title: 'Test Post', content: 'Hello Night City', authorId: 1 }

describe('postService', () => {
  describe('createPost', () => {
    it('cree un post et retourne les donnees', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fakePost),
      } as Response)

      const result = await createPost({ title: 'Test', content: 'Hello' } as any)
      expect(result).toEqual(fakePost)
      expect(mockedFetch).toHaveBeenCalledWith('/post', expect.objectContaining({ method: 'POST' }))
    })

    it('lance une erreur si la creation echoue', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      } as Response)
      await expect(createPost({} as any)).rejects.toThrow('Erreur lors de la création du post')
    })
  })

  describe('getAllPosts', () => {
    it('retourne un tableau de posts (format array)', async () => {
      const posts = [fakePost]
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(posts),
      } as Response)

      const result = await getAllPosts()
      expect(result).toEqual(posts)
    })

    it('retourne les posts depuis le champ items (format objet)', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ items: [fakePost] }),
      } as Response)

      const result = await getAllPosts()
      expect(result).toEqual([fakePost])
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getAllPosts()).rejects.toThrow('Impossible de récupérer les posts')
    })
  })

  describe('getPostById', () => {
    it('retourne un post par ID', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fakePost),
      } as Response)

      const result = await getPostById('1')
      expect(result).toEqual(fakePost)
      expect(mockedFetch).toHaveBeenCalledWith('/post/1', expect.objectContaining({ method: 'GET' }))
    })

    it('lance une erreur si le post n\'existe pas', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getPostById('999')).rejects.toThrow('Impossible de récupérer le post')
    })
  })

  describe('getPostsByGroupId', () => {
    it('retourne les posts d\'un groupe', async () => {
      const posts = [fakePost]
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(posts),
      } as Response)

      const result = await getPostsByGroupId(1)
      expect(result).toEqual(posts)
      expect(mockedFetch).toHaveBeenCalledWith('/group/1/posts')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getPostsByGroupId(1)).rejects.toThrow('Erreur lors de la récupération des posts du groupe')
    })
  })

  describe('updatePost', () => {
    it('met a jour un post', async () => {
      const updated = { ...fakePost, title: 'Updated' }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updated),
      } as Response)

      const result = await updatePost(1, { title: 'Updated' } as any)
      expect(result).toEqual(updated)
      expect(mockedFetch).toHaveBeenCalledWith('/post/1', expect.objectContaining({ method: 'PUT' }))
    })

    it('lance une erreur si la mise a jour echoue', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      } as Response)
      await expect(updatePost(1, {} as any)).rejects.toThrow('Erreur lors de la modification du post')
    })
  })

  describe('deletePost', () => {
    it('supprime un post', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)
      await expect(deletePost(1)).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/post/1', expect.objectContaining({ method: 'DELETE' }))
    })

    it('lance une erreur si la suppression echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(deletePost(1)).rejects.toThrow('Erreur lors de la suppression du post')
    })
  })

  describe('likePost', () => {
    it('like un post', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)
      await expect(likePost(1)).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/post/1/like', expect.objectContaining({ method: 'POST' }))
    })

    it('lance une erreur si le like echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(likePost(1)).rejects.toThrow('Erreur lors du like du post')
    })
  })

  describe('unlikePost', () => {
    it('unlike un post', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)
      await expect(unlikePost(1)).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/post/1/like', expect.objectContaining({ method: 'DELETE' }))
    })

    it('lance une erreur si le unlike echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(unlikePost(1)).rejects.toThrow('Erreur lors du retrait du like')
    })
  })

  describe('getLikers', () => {
    it('retourne les likers normalises', async () => {
      const rawLikers = [
        { id: 1, username: 'V', avatarUrl: '/v.png' },
        { user: { id: 2, username: 'Jackie' }, userId: 2 },
      ]
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(rawLikers),
      } as Response)

      const result = await getLikers(1)
      expect(result[0]).toEqual({ id: 1, username: 'V', avatarUrl: '/v.png' })
      expect(result[1].username).toBe('Jackie')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getLikers(1)).rejects.toThrow('Impossible de récupérer les likers')
    })
  })

  describe('sharePost', () => {
    it('partage un post', async () => {
      const shared = { ...fakePost, id: 2 }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(shared),
      } as Response)

      const result = await sharePost({ postId: 1, payload: { groupId: 5 } as any })
      expect(result).toEqual(shared)
      expect(mockedFetch).toHaveBeenCalledWith('/post/1/share', expect.objectContaining({ method: 'POST' }))
    })

    it('lance une erreur si le partage echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(sharePost({ postId: 1, payload: {} as any })).rejects.toThrow('Erreur lors du partage du post')
    })
  })

  describe('reportPost', () => {
    it('signale un post avec raison', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)
      await expect(reportPost(1, 'Spam')).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/report/post/1', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'Spam' }),
      }))
    })

    it('signale un post sans raison', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)
      await expect(reportPost(1)).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/report/post/1', expect.objectContaining({
        method: 'POST',
        body: undefined,
      }))
    })

    it('lance une erreur si le signalement echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(reportPost(1)).rejects.toThrow('Erreur lors du signalement du post')
    })
  })
})
