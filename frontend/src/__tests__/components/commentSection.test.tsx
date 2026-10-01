import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommentSection, { type CommentSectionHandle } from '@/components/comment/commentSection'
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '@/hooks/useComments'
import { useAuth } from '@/hooks/useAuth'
import type { Comment } from '@/interfaces/comment'

jest.mock('@/hooks/useComments', () => ({
  useComments: jest.fn(),
  useCreateComment: jest.fn(),
  useDeleteComment: jest.fn(),
  useUpdateComment: jest.fn(),
}))
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

const mockedUseComments = useComments as jest.MockedFunction<typeof useComments>
const mockedUseCreateComment = useCreateComment as jest.MockedFunction<typeof useCreateComment>
const mockedUseDeleteComment = useDeleteComment as jest.MockedFunction<typeof useDeleteComment>
const mockedUseUpdateComment = useUpdateComment as jest.MockedFunction<typeof useUpdateComment>
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

const createMutate = jest.fn()
const deleteMutate = jest.fn()
const updateMutate = jest.fn()

function getMenuButton(container: HTMLElement): HTMLElement {
  return container.querySelector('.lucide-ellipsis-vertical')!.closest('button')!
}

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 1,
  content: 'Premier commentaire',
  createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
  authorId: 5,
  authorUsername: 'alice',
  postId: 42,
  ...overrides,
})

describe('CommentSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseCreateComment.mockReturnValue({ mutate: createMutate } as unknown as ReturnType<typeof useCreateComment>)
    mockedUseDeleteComment.mockReturnValue({ mutate: deleteMutate } as unknown as ReturnType<typeof useDeleteComment>)
    mockedUseUpdateComment.mockReturnValue({ mutate: updateMutate } as unknown as ReturnType<typeof useUpdateComment>)
    mockedUseAuth.mockReturnValue({ user: { id: 5, username: 'alice' } } as ReturnType<typeof useAuth>)
    mockedUseComments.mockReturnValue({ comments: [], isLoading: false, error: null } as unknown as ReturnType<
      typeof useComments
    >)
  })

  it('ne retient que les commentaires du post et les trie du plus récent au plus ancien', () => {
    mockedUseComments.mockReturnValue({
      comments: [
        makeComment({ id: 1, postId: 42, content: 'Ancien', createdAt: '2026-01-01T00:00:00Z' }),
        makeComment({ id: 2, postId: 99, content: 'Autre post' }),
        makeComment({ id: 3, postId: 42, content: 'Recent', createdAt: '2026-03-01T00:00:00Z' }),
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useComments>)

    render(<CommentSection postId={42} />)

    expect(screen.queryByText('Autre post')).not.toBeInTheDocument()
    const texts = screen.getAllByText(/Ancien|Recent/).map((el) => el.textContent)
    expect(texts).toEqual(['Recent', 'Ancien'])
  })

  it('soumet un nouveau commentaire et réinitialise le champ', async () => {
    const user = userEvent.setup()
    render(<CommentSection postId={42} />)

    const input = screen.getByPlaceholderText('Ajouter un commentaire...')
    await user.type(input, 'Un super commentaire')
    await user.click(screen.getByRole('button', { name: 'Commenter' }))

    await waitFor(() =>
      expect(createMutate).toHaveBeenCalledWith({ content: 'Un super commentaire', postId: 42 })
    )
    expect(input).toHaveValue('')
  })

  it("affiche une erreur de validation si le commentaire est vide", async () => {
    const user = userEvent.setup()
    render(<CommentSection postId={42} />)

    await user.click(screen.getByRole('button', { name: 'Commenter' }))

    expect(
      await screen.findByText('Le commentaire doit être compris entre 1 et 200 caractères.')
    ).toBeInTheDocument()
    expect(createMutate).not.toHaveBeenCalled()
  })

  it("affiche le menu d'édition/suppression uniquement pour l'auteur du commentaire", () => {
    mockedUseComments.mockReturnValue({
      comments: [
        makeComment({ id: 1, authorId: 5, content: 'Mon commentaire' }),
        makeComment({ id: 2, authorId: 7, content: "Commentaire d'autrui" }),
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useComments>)

    const { container } = render(<CommentSection postId={42} />)

    expect(container.querySelectorAll('.lucide-ellipsis-vertical')).toHaveLength(1)
  })

  it('permet de supprimer un commentaire via le menu', async () => {
    const user = userEvent.setup()
    mockedUseComments.mockReturnValue({
      comments: [makeComment({ id: 1, authorId: 5, content: 'À supprimer' })],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useComments>)

    const { container } = render(<CommentSection postId={42} />)

    await user.click(getMenuButton(container))
    await user.click(await screen.findByText('Supprimer'))

    expect(deleteMutate).toHaveBeenCalledWith('1')
  })

  it("passe un commentaire en mode édition, puis enregistre la modification", async () => {
    const user = userEvent.setup()
    mockedUseComments.mockReturnValue({
      comments: [makeComment({ id: 3, authorId: 5, content: 'Contenu initial' })],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useComments>)

    const { container } = render(<CommentSection postId={42} />)

    await user.click(getMenuButton(container))
    await user.click(await screen.findByText('Modifier'))

    const textarea = screen.getByDisplayValue('Contenu initial')
    await user.clear(textarea)
    await user.type(textarea, 'Contenu modifié')

    await user.click(screen.getByRole('button', { name: /Enregistrer/ }))

    expect(updateMutate).toHaveBeenCalledWith({ id: 3, content: 'Contenu modifié' })
    expect(screen.queryByRole('button', { name: /Enregistrer/ })).not.toBeInTheDocument()
  })

  it("n'enregistre pas une édition vide", async () => {
    const user = userEvent.setup()
    mockedUseComments.mockReturnValue({
      comments: [makeComment({ id: 3, authorId: 5, content: 'Contenu initial' })],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useComments>)

    const { container } = render(<CommentSection postId={42} />)

    await user.click(getMenuButton(container))
    await user.click(await screen.findByText('Modifier'))

    const textarea = screen.getByDisplayValue('Contenu initial')
    await user.clear(textarea)

    await user.click(screen.getByRole('button', { name: /Enregistrer/ }))

    expect(updateMutate).not.toHaveBeenCalled()
  })

  it("expose focusComposer via la ref pour mettre le focus sur le champ d'ajout", () => {
    const ref = { current: null } as React.RefObject<CommentSectionHandle | null>
    render(<CommentSection postId={42} ref={ref} />)

    expect(() => ref.current?.focusComposer()).not.toThrow()
  })

  it('affiche la date relative et le titre complet pour un commentaire', () => {
    const createdAt = new Date(Date.now() - 90 * 60 * 1000).toISOString()
    mockedUseComments.mockReturnValue({
      comments: [makeComment({ id: 1, createdAt })],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useComments>)

    const { container } = render(<CommentSection postId={42} />)

    const timeEl = container.querySelector('time')
    expect(timeEl).toHaveTextContent('il y a 1 h')
    expect(timeEl).toHaveAttribute('datetime', createdAt)
  })
})
