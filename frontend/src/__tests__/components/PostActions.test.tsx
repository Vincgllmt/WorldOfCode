import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import toast from 'react-hot-toast'
import PostActions from '@/components/post/PostActions'
import { useSharePost, usePostLikeState } from '@/hooks/usePosts'
import type { Post } from '@/interfaces/post'

jest.mock('@/hooks/usePosts', () => ({
  useSharePost: jest.fn(),
  usePostLikeState: jest.fn(),
}))
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}))
jest.mock('@/components/post/ShareToMessageDialog', () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="share-to-message-dialog" /> : null),
}))

const mockedUseSharePost = useSharePost as jest.MockedFunction<typeof useSharePost>
const mockedUsePostLikeState = usePostLikeState as jest.MockedFunction<typeof usePostLikeState>
const mockToggle = jest.fn()
const mockShareMutate = jest.fn()

const post: Post = {
  id: 1,
  content: 'Contenu',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  authorId: 2,
  authorUsername: 'bob',
  techGroupId: 9,
  likesCount: 0,
  likedByUser: false,
  sharedCount: 0,
  commentsCount: 0,
} as Post

function mockHooks({
  likedByMe = false,
  likesCount = 0,
  isPending = false,
  sharePending = false,
}: { likedByMe?: boolean; likesCount?: number; isPending?: boolean; sharePending?: boolean } = {}) {
  mockedUsePostLikeState.mockReturnValue({ likedByMe, likesCount, onToggle: mockToggle, isPending })
  mockedUseSharePost.mockReturnValue({ mutate: mockShareMutate, isPending: sharePending } as any)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockHooks()
})

describe('PostActions', () => {
  it('affiche "Soyez le premier à réagir" sans like ni commentaire', () => {
    render(<PostActions post={post} />)
    expect(screen.getByText('Soyez le premier à réagir')).toBeInTheDocument()
  })

  it('affiche le nombre de likes et de commentaires', () => {
    mockHooks({ likesCount: 5 })
    render(<PostActions post={{ ...post, commentsCount: 3 }} />)
    expect(screen.getByText("5 J'aime")).toBeInTheDocument()
    expect(screen.getByText('3 commentaires')).toBeInTheDocument()
  })

  it('affiche "1 commentaire" au singulier', () => {
    mockHooks({ likesCount: 0 })
    render(<PostActions post={{ ...post, commentsCount: 1 }} />)
    expect(screen.getByText('1 commentaire')).toBeInTheDocument()
  })

  it('appelle onCommentClick au clic sur le bouton commenter ou le compteur', async () => {
    mockHooks({ likesCount: 1 })
    const onCommentClick = jest.fn()
    const user = userEvent.setup()
    render(<PostActions post={{ ...post, commentsCount: 2 }} onCommentClick={onCommentClick} />)

    await user.click(screen.getByRole('button', { name: 'Commenter le post' }))
    expect(onCommentClick).toHaveBeenCalledTimes(1)

    await user.click(screen.getByText('2 commentaires'))
    expect(onCommentClick).toHaveBeenCalledTimes(2)
  })

  it('bascule le like au clic', async () => {
    const user = userEvent.setup()
    render(<PostActions post={post} />)

    await user.click(screen.getByRole('button', { name: 'Liker le post' }))
    expect(mockToggle).toHaveBeenCalled()
  })

  it('affiche le bouton like actif quand déjà liké', () => {
    mockHooks({ likedByMe: true })
    render(<PostActions post={post} />)
    expect(screen.getByRole('button', { name: 'Retirer le like' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('désactive le bouton like pendant la mutation', () => {
    mockHooks({ isPending: true })
    render(<PostActions post={post} />)
    expect(screen.getByRole('button', { name: 'Liker le post' })).toBeDisabled()
  })

  it('ouvre le menu de partage avec ses deux options', async () => {
    const user = userEvent.setup()
    render(<PostActions post={post} />)

    await user.click(screen.getByRole('button', { name: 'Partager le post' }))

    expect(screen.getByText('Partager dans le flux')).toBeInTheDocument()
    expect(screen.getByText('Envoyer en message')).toBeInTheDocument()
  })

  it('ouvre ShareToMessageDialog via "Envoyer en message"', async () => {
    const user = userEvent.setup()
    render(<PostActions post={post} />)

    await user.click(screen.getByRole('button', { name: 'Partager le post' }))
    await user.click(screen.getByText('Envoyer en message'))

    expect(screen.getByTestId('share-to-message-dialog')).toBeInTheDocument()
  })

  it('partage le post avec un commentaire dans le flux', async () => {
    const user = userEvent.setup()
    render(<PostActions post={post} />)

    await user.click(screen.getByRole('button', { name: 'Partager le post' }))
    await user.click(screen.getByText('Partager dans le flux'))
    await user.type(screen.getByLabelText(/Votre commentaire/i), 'Super article')
    await user.click(screen.getByRole('button', { name: 'Partager' }))

    expect(mockShareMutate).toHaveBeenCalledWith(
      { postId: 1, payload: { content: 'Super article' } },
      expect.objectContaining({ onSuccess: expect.any(Function), onSettled: expect.any(Function) }),
    )
  })

  it('partage sans commentaire envoie un contenu null', async () => {
    const user = userEvent.setup()
    render(<PostActions post={post} />)

    await user.click(screen.getByRole('button', { name: 'Partager le post' }))
    await user.click(screen.getByText('Partager dans le flux'))
    await user.click(screen.getByRole('button', { name: 'Partager' }))

    expect(mockShareMutate).toHaveBeenCalledWith(
      { postId: 1, payload: { content: null } },
      expect.anything(),
    )
  })

  it('copie le lien du post après un partage réussi si demandé', async () => {
    mockShareMutate.mockImplementation((_payload, { onSuccess }) => onSuccess())
    const user = userEvent.setup()
    // userEvent.setup() installe son propre polyfill de navigator.clipboard :
    // on espionne l'objet réellement en place à ce stade plutôt que d'en
    // injecter un nouveau, qui serait remplacé silencieusement.
    const writeTextSpy = jest.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    render(<PostActions post={post} copyLinkOnShare postUrl="https://woc.test/post/1" />)

    await user.click(screen.getByRole('button', { name: 'Partager le post' }))
    await user.click(screen.getByText('Partager dans le flux'))
    await user.click(screen.getByRole('button', { name: 'Partager' }))

    await waitFor(() => expect(writeTextSpy).toHaveBeenCalledWith('https://woc.test/post/1'))
    expect(toast.success).toHaveBeenCalledWith('Lien du post copié')
  })

  it('annule le partage sans appeler la mutation', async () => {
    const user = userEvent.setup()
    render(<PostActions post={post} />)

    await user.click(screen.getByRole('button', { name: 'Partager le post' }))
    await user.click(screen.getByText('Partager dans le flux'))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(mockShareMutate).not.toHaveBeenCalled()
  })
})
