import { renderHook, act } from '@testing-library/react'
import toast from 'react-hot-toast'
import { usePostItem } from '@/hooks/usePostItem'
import { useUpdatePost, useDeletePost } from '@/hooks/usePosts'
import { useUser } from '@/hooks/useUsers'
import { useGroup } from '@/hooks/useGroups'
import type { Post } from '@/interfaces/post'

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}))

let mockUser: { id: number } | null = { id: 2 }
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

const mockUpdateMutate = jest.fn()
const mockDeleteMutate = jest.fn()
jest.mock('@/hooks/usePosts', () => ({
  useUpdatePost: jest.fn(() => ({ mutate: mockUpdateMutate })),
  useDeletePost: jest.fn(() => ({ mutate: mockDeleteMutate })),
}))
jest.mock('@/hooks/useUsers', () => ({
  useUser: jest.fn(() => ({ data: { id: 2, username: 'bob' }, isLoading: false })),
}))
jest.mock('@/hooks/useGroups', () => ({
  useGroup: jest.fn(() => ({ data: { id: 5, name: 'React' }, isLoading: true })),
}))

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    content: '<p>Hello</p>',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
    authorId: 2,
    authorUsername: 'bob',
    techGroupId: 5,
    likesCount: 0,
    likedByUser: false,
    sharedCount: 0,
    commentsCount: 0,
    ...overrides,
  } as Post
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUser = { id: 2 }
})

describe('usePostItem', () => {
  it('expose l auteur, le groupe et l etat initial', () => {
    const { result } = renderHook(() => usePostItem(makePost(), true))

    expect(useUser).toHaveBeenCalledWith(2)
    expect(useGroup).toHaveBeenCalledWith(5)
    expect(useUpdatePost).toHaveBeenCalled()
    expect(useDeletePost).toHaveBeenCalled()
    expect(result.current).toMatchObject({
      author: { id: 2, username: 'bob' },
      authorLoading: false,
      group: { id: 5, name: 'React' },
      groupLoading: true,
      isEditing: false,
      editGroupId: 5,
      editContent: '<p>Hello</p>',
      showDialog: false,
      showComments: true,
      currentUserId: 2,
      isAuthor: true,
      sanitizedContent: '<p>Hello</p>',
    })
  })

  it("n'est pas auteur sans utilisateur connecte et gere un contenu nul", () => {
    mockUser = null
    const { result } = renderHook(() => usePostItem(makePost({ content: null }), false))

    expect(result.current.currentUserId).toBe(0)
    expect(result.current.isAuthor).toBe(false)
    expect(result.current.editContent).toBe('')
    expect(result.current.sanitizedContent).toBe('')
    expect(result.current.showComments).toBe(false)
  })

  it('reinitialise le contenu edite au demarrage de l edition', () => {
    const { result } = renderHook(() => usePostItem(makePost(), false))

    act(() => result.current.setEditContent('brouillon'))
    act(() => result.current.startEditing())

    expect(result.current.isEditing).toBe(true)
    expect(result.current.editContent).toBe('<p>Hello</p>')
  })

  describe('handleSave', () => {
    it('enregistre le contenu nettoye et quitte le mode edition', () => {
      mockUpdateMutate.mockImplementation((_vars, { onSuccess }) => onSuccess())
      const { result } = renderHook(() => usePostItem(makePost(), false))

      act(() => result.current.startEditing())
      act(() => {
        result.current.setEditContent('<p>Nouveau</p><script>alert(1)</script>')
        result.current.setEditGroupId(8)
      })
      act(() => result.current.handleSave())

      expect(mockUpdateMutate).toHaveBeenCalledWith(
        { id: 1, data: { content: '<p>Nouveau</p>', groupId: 8 } },
        expect.any(Object),
      )
      expect(result.current.isEditing).toBe(false)
    })

    it('refuse un contenu vide pour un post non partage', () => {
      const { result } = renderHook(() => usePostItem(makePost(), false))

      act(() => result.current.setEditContent('<p>  </p>'))
      act(() => result.current.handleSave())

      expect(toast.error).toHaveBeenCalledWith('Le contenu ne peut pas être vide')
      expect(mockUpdateMutate).not.toHaveBeenCalled()
    })

    it('accepte un contenu vide pour un partage et envoie null', () => {
      const { result } = renderHook(() =>
        usePostItem(makePost({ sharedPost: { id: 9 } } as Partial<Post>), false),
      )

      act(() => result.current.setEditContent(''))
      act(() => result.current.handleSave())

      expect(mockUpdateMutate).toHaveBeenCalledWith(
        { id: 1, data: { content: null, groupId: 5 } },
        expect.any(Object),
      )
    })

    it('affiche un toast et reste en edition si la mise a jour echoue', () => {
      mockUpdateMutate.mockImplementation((_vars, { onError }) => onError())
      const { result } = renderHook(() => usePostItem(makePost(), false))

      act(() => result.current.startEditing())
      act(() => result.current.handleSave())

      expect(toast.error).toHaveBeenCalledWith('Erreur lors de la mise à jour')
      expect(result.current.isEditing).toBe(true)
    })
  })

  describe('handleDelete', () => {
    it('supprime le post et ferme la boite de dialogue', () => {
      mockDeleteMutate.mockImplementation((_id, { onSuccess }) => onSuccess())
      const { result } = renderHook(() => usePostItem(makePost(), false))

      act(() => result.current.setShowDialog(true))
      act(() => result.current.handleDelete())

      expect(mockDeleteMutate).toHaveBeenCalledWith(1, expect.any(Object))
      expect(result.current.showDialog).toBe(false)
    })

    it('affiche un toast si la suppression echoue', () => {
      mockDeleteMutate.mockImplementation((_id, { onError }) => onError())
      const { result } = renderHook(() => usePostItem(makePost(), false))

      act(() => result.current.setShowDialog(true))
      act(() => result.current.handleDelete())

      expect(toast.error).toHaveBeenCalledWith('Erreur lors de la suppression')
      expect(result.current.showDialog).toBe(true)
    })
  })

  describe('openCommentsAndFocus', () => {
    it('ouvre les commentaires puis donne le focus au champ de saisie', async () => {
      const { result } = renderHook(() => usePostItem(makePost(), false))
      const focusComposer = jest.fn()
      result.current.commentRef.current = { focusComposer }

      await act(async () => result.current.openCommentsAndFocus())

      expect(result.current.showComments).toBe(true)
      expect(focusComposer).toHaveBeenCalled()
    })

    it('ferme les commentaires sans donner le focus', async () => {
      const { result } = renderHook(() => usePostItem(makePost(), true))
      const focusComposer = jest.fn()
      result.current.commentRef.current = { focusComposer }

      await act(async () => result.current.openCommentsAndFocus())

      expect(result.current.showComments).toBe(false)
      expect(focusComposer).not.toHaveBeenCalled()
    })
  })
})
