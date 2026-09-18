import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import toast from 'react-hot-toast'
import {
  usePost,
  usePosts,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  usePostsByGroup,
  useLikers,
  useToggleLike,
  useSharePost,
  useReportPost,
  usePostLikeState,
} from '@/hooks/usePosts'
import {
  getPostById,
  getPostsPaginated,
  createPost,
  updatePost,
  deletePost,
  getPostsByGroupId,
  getLikers,
  likePost,
  unlikePost,
  sharePost,
  reportPost,
} from '@/services/postService'
import type { Post, Liker } from '@/interfaces/post'

jest.mock('@/services/postService')
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}))

let mockUser: { id: number; username: string } | null = { id: 1, username: 'me' }
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

const mockedGetPostById = getPostById as jest.MockedFunction<typeof getPostById>
const mockedGetPostsPaginated = getPostsPaginated as jest.MockedFunction<typeof getPostsPaginated>
const mockedCreatePost = createPost as jest.MockedFunction<typeof createPost>
const mockedUpdatePost = updatePost as jest.MockedFunction<typeof updatePost>
const mockedDeletePost = deletePost as jest.MockedFunction<typeof deletePost>
const mockedGetPostsByGroupId = getPostsByGroupId as jest.MockedFunction<typeof getPostsByGroupId>
const mockedGetLikers = getLikers as jest.MockedFunction<typeof getLikers>
const mockedLikePost = likePost as jest.MockedFunction<typeof likePost>
const mockedUnlikePost = unlikePost as jest.MockedFunction<typeof unlikePost>
const mockedSharePost = sharePost as jest.MockedFunction<typeof sharePost>
const mockedReportPost = reportPost as jest.MockedFunction<typeof reportPost>

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    content: 'Hello',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    authorId: 2,
    authorUsername: 'bob',
    likesCount: 0,
    likedByUser: false,
    sharedCount: 0,
    commentsCount: 0,
    ...overrides,
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper, queryClient }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUser = { id: 1, username: 'me' }
})

describe('usePosts hooks', () => {
  it('usePost récupère un post par id', async () => {
    mockedGetPostById.mockResolvedValueOnce(makePost({ id: 42 }))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => usePost(42), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGetPostById).toHaveBeenCalledWith('42')
    expect(result.current.data?.id).toBe(42)
  })

  it('usePosts charge la première page paginée', async () => {
    mockedGetPostsPaginated.mockResolvedValueOnce({ items: [makePost()], hasMore: false } as any)
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => usePosts(), { wrapper })

    await waitFor(() => expect(result.current.posts).toHaveLength(1))
    expect(mockedGetPostsPaginated).toHaveBeenCalledWith({ page: 1, limit: 10 })
  })

  it("usePosts ne lance pas la requête quand désactivé", () => {
    const { wrapper } = createWrapper()
    renderHook(() => usePosts(false), { wrapper })
    expect(mockedGetPostsPaginated).not.toHaveBeenCalled()
  })

  it('useCreatePost invalide les listes de posts au succès', async () => {
    mockedCreatePost.mockResolvedValueOnce(makePost())
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreatePost(), { wrapper })

    result.current.mutate({ content: 'Nouveau post' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['posts'] })
  })

  it('useCreatePost affiche un toast en cas d\'erreur', async () => {
    mockedCreatePost.mockRejectedValueOnce(new Error('Erreur réseau'))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCreatePost(), { wrapper })

    result.current.mutate({ content: 'x' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erreur réseau')
  })

  it('useUpdatePost appelle updatePost avec id et données', async () => {
    mockedUpdatePost.mockResolvedValueOnce(makePost())
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdatePost(), { wrapper })

    result.current.mutate({ id: 5, data: { content: 'Modifié', groupId: 1 } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedUpdatePost).toHaveBeenCalledWith(5, { content: 'Modifié', groupId: 1 })
  })

  it('useDeletePost affiche un toast en cas d\'échec', async () => {
    mockedDeletePost.mockRejectedValueOnce(new Error('boom'))
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useDeletePost(), { wrapper })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Erreur lors de la suppression du post')
  })

  it('usePostsByGroup ne requête pas sans groupId', () => {
    const { wrapper } = createWrapper()
    renderHook(() => usePostsByGroup(0), { wrapper })
    expect(mockedGetPostsByGroupId).not.toHaveBeenCalled()
  })

  it('usePostsByGroup requête les posts du groupe', async () => {
    mockedGetPostsByGroupId.mockResolvedValueOnce([makePost()])
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => usePostsByGroup(7), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGetPostsByGroupId).toHaveBeenCalledWith(7)
  })

  it('useLikers récupère les likers', async () => {
    const likers: Liker[] = [{ id: 1, username: 'me' }]
    mockedGetLikers.mockResolvedValueOnce(likers)
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useLikers(1), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(likers))
  })

  it('useToggleLike appelle likePost quand non liké puis restaure au succès', async () => {
    mockedLikePost.mockResolvedValueOnce(undefined)
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useToggleLike(), { wrapper })

    result.current.mutate({ postId: 1, likedByMe: false })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedLikePost).toHaveBeenCalledWith(1)
    expect(mockedUnlikePost).not.toHaveBeenCalled()
  })

  it('useToggleLike appelle unlikePost quand déjà liké', async () => {
    mockedUnlikePost.mockResolvedValueOnce(undefined)
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useToggleLike(), { wrapper })

    result.current.mutate({ postId: 1, likedByMe: true })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedUnlikePost).toHaveBeenCalledWith(1)
  })

  it('useToggleLike met à jour la liste des posts de façon optimiste puis restaure en cas d\'erreur', async () => {
    // Un rejet immédiat rendrait la fenêtre optimiste indétectable (rollback avant
    // le premier sondage de `waitFor`) : on contrôle manuellement quand l'appel échoue.
    let rejectLike!: (err: Error) => void
    mockedLikePost.mockImplementation(() => new Promise((_, reject) => { rejectLike = reject }))
    const { wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(['posts'], [makePost({ id: 1, likesCount: 0, likedByMe: false })])

    const { result } = renderHook(() => useToggleLike(), { wrapper })
    result.current.mutate({ postId: 1, likedByMe: false })

    await waitFor(() => {
      const posts = queryClient.getQueryData<Post[]>(['posts'])
      expect(posts?.[0].likesCount).toBe(1)
    })

    rejectLike(new Error('boom'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    const posts = queryClient.getQueryData<Post[]>(['posts'])
    expect(posts?.[0].likesCount).toBe(0)
    expect(toast.error).toHaveBeenCalledWith('Impossible de mettre à jour le like')
  })

  it('useSharePost incrémente sharedCount de façon optimiste et restaure au rollback', async () => {
    let rejectShare!: (err: Error) => void
    mockedSharePost.mockImplementation(() => new Promise((_, reject) => { rejectShare = reject }))
    const { wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(['posts'], [makePost({ id: 1, sharedCount: 2 })])

    const { result } = renderHook(() => useSharePost(), { wrapper })
    result.current.mutate({ postId: 1, payload: {} })

    await waitFor(() => {
      const posts = queryClient.getQueryData<Post[]>(['posts'])
      expect(posts?.[0].sharedCount).toBe(3)
    })

    rejectShare(new Error('boom'))

    await waitFor(() => expect(result.current.isError).toBe(true))
    const posts = queryClient.getQueryData<Post[]>(['posts'])
    expect(posts?.[0].sharedCount).toBe(2)
    expect(toast.error).toHaveBeenCalledWith('Erreur lors du partage')
  })

  it('useReportPost affiche un toast de succès', async () => {
    mockedReportPost.mockResolvedValueOnce(undefined)
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useReportPost(), { wrapper })

    result.current.mutate({ postId: 1, reason: 'spam' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Signalement envoyé')
  })

  it('usePostLikeState dérive likedByMe et likesCount depuis les likers', async () => {
    mockedGetLikers.mockResolvedValueOnce([{ id: 1, username: 'me' }, { id: 2, username: 'bob' }])
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => usePostLikeState(1), { wrapper })

    await waitFor(() => expect(result.current.likesCount).toBe(2))
    expect(result.current.likedByMe).toBe(true)
  })

  it("usePostLikeState.onToggle ne fait rien si l'utilisateur n'est pas chargé", async () => {
    mockUser = null
    mockedGetLikers.mockResolvedValueOnce([])
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => usePostLikeState(1), { wrapper })
    await waitFor(() => expect(result.current.likesCount).toBe(0))

    result.current.onToggle()

    expect(mockedLikePost).not.toHaveBeenCalled()
    expect(mockedUnlikePost).not.toHaveBeenCalled()
  })

  it('usePostLikeState.onToggle déclenche le toggle avec le bon état', async () => {
    mockedGetLikers.mockResolvedValueOnce([])
    mockedLikePost.mockResolvedValueOnce(undefined)
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => usePostLikeState(1, 9), { wrapper })
    await waitFor(() => expect(result.current.likesCount).toBe(0))

    result.current.onToggle()

    await waitFor(() => expect(mockedLikePost).toHaveBeenCalledWith(1))
  })
})
