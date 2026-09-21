import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostItem from '@/components/post/PostItem'
import { usePostItem } from '@/hooks/usePostItem'
import { useUserGroups } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import type { Post } from '@/interfaces/post'

jest.mock('@/hooks/usePostItem', () => ({
  usePostItem: jest.fn(),
}))
jest.mock('@/hooks/useUsers', () => ({
  useUserGroups: jest.fn(),
}))
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))
jest.mock('@/components/post/PostHeader', () => ({
  __esModule: true,
  default: ({ authorUsername }: { authorUsername: string }) => (
    <div data-testid="post-header">{authorUsername}</div>
  ),
}))
jest.mock('@/components/post/PostContent', () => ({
  __esModule: true,
  default: ({ content }: { content: string | null }) => <div data-testid="post-content">{content}</div>,
}))
jest.mock('@/components/post/SharedPostCard', () => ({
  __esModule: true,
  default: ({ post }: { post: Post }) => <div data-testid="shared-post-card">{post.id}</div>,
}))
jest.mock('@/components/post/ReportPostDialog', () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="report-post-dialog" /> : null),
}))
jest.mock('@/components/post/PostActions', () => ({
  __esModule: true,
  default: ({ onCommentClick }: { onCommentClick?: () => void }) => (
    <button onClick={onCommentClick}>mock-comment-trigger</button>
  ),
}))
jest.mock('@/components/comment/commentSection', () => ({
  __esModule: true,
  default: () => <div data-testid="comment-section" />,
}))
jest.mock('@/components/post/RichTextEditor', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="rich-text-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

const mockedUsePostItem = usePostItem as jest.MockedFunction<typeof usePostItem>
const mockedUseUserGroups = useUserGroups as jest.MockedFunction<typeof useUserGroups>
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

const post: Post = {
  id: 10,
  content: '<p>Bonjour</p>',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  authorId: 5,
  authorUsername: 'alice',
  techGroupId: 3,
  techGroupName: 'Backend',
  likesCount: 0,
  likedByUser: false,
  sharedCount: 0,
  commentsCount: 0,
}

const setIsEditing = jest.fn()
const setEditGroupId = jest.fn()
const setEditContent = jest.fn()
const setShowDialog = jest.fn()
const handleSave = jest.fn()
const handleDelete = jest.fn()
const openCommentsAndFocus = jest.fn()

type PostItemHookOverrides = Partial<ReturnType<typeof usePostItem>>

function mockPostItemHook(overrides: PostItemHookOverrides = {}) {
  mockedUsePostItem.mockReturnValue({
    author: { id: 5, username: 'alice' },
    authorLoading: false,
    group: { id: 3, name: 'Backend' },
    groupLoading: false,
    isEditing: false,
    setIsEditing,
    editGroupId: post.techGroupId,
    setEditGroupId,
    editContent: post.content ?? '',
    setEditContent,
    showDialog: false,
    setShowDialog,
    showComments: false,
    commentRef: { current: null },
    currentUserId: 5,
    isAuthor: true,
    handleSave,
    handleDelete,
    openCommentsAndFocus,
    ...overrides,
  } as ReturnType<typeof usePostItem>)
}

function getMenuButton(container: HTMLElement): HTMLElement {
  return container.querySelector('.lucide-ellipsis-vertical')!.closest('button')!
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPostItemHook()
  mockedUseAuth.mockReturnValue({ user: { id: 5, username: 'alice' } } as ReturnType<typeof useAuth>)
  mockedUseUserGroups.mockReturnValue({ data: [{ id: 3, name: 'Backend' }], isLoading: false } as ReturnType<typeof useUserGroups>)
})

describe('PostItem', () => {
  it("affiche des skeletons pendant le chargement de l'auteur", () => {
    mockPostItemHook({ authorLoading: true })
    const { container } = render(<PostItem post={post} />)

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('post-header')).not.toBeInTheDocument()
  })

  it("affiche le header auteur et le badge du groupe une fois chargés", () => {
    render(<PostItem post={post} />)

    expect(screen.getByTestId('post-header')).toHaveTextContent('alice')
    expect(screen.getByText('Backend')).toBeInTheDocument()
  })

  it('affiche le contenu du post quand il ne s\'agit pas d\'une édition', () => {
    render(<PostItem post={post} />)
    expect(screen.getByTestId('post-content')).toHaveTextContent('Bonjour')
  })

  it('affiche la SharedPostCard quand le post est un partage', () => {
    render(<PostItem post={{ ...post, sharedPost: { ...post, id: 99 } }} />)
    expect(screen.getByTestId('shared-post-card')).toHaveTextContent('99')
  })

  it("n'affiche pas le menu si l'utilisateur n'est pas connecté", () => {
    mockPostItemHook({ currentUserId: 0 })
    const { container } = render(<PostItem post={post} />)
    expect(container.querySelector('.lucide-ellipsis-vertical')).not.toBeInTheDocument()
  })

  it('propose Modifier et Supprimer au menu quand on est l\'auteur', async () => {
    const user = userEvent.setup()
    const { container } = render(<PostItem post={post} />)

    await user.click(getMenuButton(container))

    expect(screen.getByText('Modifier')).toBeInTheDocument()
    expect(screen.getByText('Supprimer')).toBeInTheDocument()
    expect(screen.queryByText('Signaler')).not.toBeInTheDocument()
  })

  it('propose seulement Signaler quand on n\'est pas l\'auteur', async () => {
    mockPostItemHook({ isAuthor: false })
    const user = userEvent.setup()
    const { container } = render(<PostItem post={post} />)

    await user.click(getMenuButton(container))

    expect(screen.getByText('Signaler')).toBeInTheDocument()
    expect(screen.queryByText('Modifier')).not.toBeInTheDocument()
    expect(screen.queryByText('Supprimer')).not.toBeInTheDocument()
  })

  it('clique sur Modifier appelle setIsEditing(true)', async () => {
    const user = userEvent.setup()
    const { container } = render(<PostItem post={post} />)

    await user.click(getMenuButton(container))
    await user.click(screen.getByText('Modifier'))

    expect(setIsEditing).toHaveBeenCalledWith(true)
  })

  it('clique sur Supprimer puis Confirmer appelle handleDelete', async () => {
    mockPostItemHook({ showDialog: true })
    const user = userEvent.setup()
    render(<PostItem post={post} />)

    expect(screen.getByText('Supprimer ce post ?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmer' }))
    expect(handleDelete).toHaveBeenCalled()
  })

  it("clique sur Signaler ouvre la boîte de dialogue de signalement", async () => {
    mockPostItemHook({ isAuthor: false })
    const user = userEvent.setup()
    const { container } = render(<PostItem post={post} />)

    await user.click(getMenuButton(container))
    await user.click(screen.getByText('Signaler'))

    expect(screen.getByTestId('report-post-dialog')).toBeInTheDocument()
  })

  it("affiche l'éditeur de texte enrichi et le sélecteur de groupe en mode édition", async () => {
    mockPostItemHook({ isEditing: true })
    render(<PostItem post={post} />)

    // RichTextEditor est chargé via next/dynamic : son apparition est asynchrone.
    expect(await screen.findByTestId('rich-text-editor')).toBeInTheDocument()
    expect(screen.queryByTestId('post-content')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Annuler/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enregistrer/ })).toBeInTheDocument()
  })

  it('clique sur Annuler réinitialise le groupe et quitte le mode édition', async () => {
    mockPostItemHook({ isEditing: true })
    const user = userEvent.setup()
    render(<PostItem post={post} />)

    await user.click(screen.getByRole('button', { name: /Annuler/ }))

    expect(setIsEditing).toHaveBeenCalledWith(false)
    expect(setEditGroupId).toHaveBeenCalledWith(post.techGroupId)
  })

  it('clique sur Enregistrer appelle handleSave', async () => {
    mockPostItemHook({ isEditing: true })
    const user = userEvent.setup()
    render(<PostItem post={post} />)

    await user.click(screen.getByRole('button', { name: /Enregistrer/ }))
    expect(handleSave).toHaveBeenCalled()
  })

  it('affiche la section commentaires uniquement quand showComments est vrai', () => {
    const { rerender } = render(<PostItem post={post} />)
    expect(screen.queryByTestId('comment-section')).not.toBeInTheDocument()

    mockPostItemHook({ showComments: true })
    rerender(<PostItem post={post} />)
    expect(screen.getByTestId('comment-section')).toBeInTheDocument()
  })

  it('déclenche openCommentsAndFocus via PostActions', async () => {
    const user = userEvent.setup()
    render(<PostItem post={post} />)

    await user.click(screen.getByText('mock-comment-trigger'))
    expect(openCommentsAndFocus).toHaveBeenCalled()
  })
})
