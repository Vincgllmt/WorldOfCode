import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import toast from 'react-hot-toast'
import ShareToMessageDialog from '@/components/post/ShareToMessageDialog'
import { useContacts } from '@/hooks/useContacts'
import { useCreateConversation } from '@/hooks/useConversations'
import { socket } from '@/lib/socket'
import type { Post } from '@/interfaces/post'

jest.mock('@/hooks/useContacts', () => ({
  useContacts: jest.fn(),
}))
jest.mock('@/hooks/useConversations', () => ({
  useCreateConversation: jest.fn(),
}))
jest.mock('@/lib/socket', () => ({
  socket: {
    connected: true,
    auth: {} as Record<string, unknown>,
    emit: jest.fn(),
    connect: jest.fn(),
  },
}))
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, username: 'me', token: 'jwt-token' } }),
}))
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}))

const mockedUseContacts = useContacts as jest.MockedFunction<typeof useContacts>
const mockedUseCreateConversation = useCreateConversation as jest.MockedFunction<typeof useCreateConversation>
const mockSocket = socket as unknown as {
  connected: boolean
  auth: Record<string, unknown>
  emit: jest.Mock
  connect: jest.Mock
}
const mockMutate = jest.fn()

const post: Post = {
  id: 42,
  content: '<p>Un super article sur React</p>',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  authorId: 5,
  authorUsername: 'alice',
  techGroupName: 'React',
  likesCount: 0,
  likedByUser: false,
  sharedCount: 0,
  commentsCount: 0,
} as Post

function mockHooks({
  contacts = [],
  isLoadingContacts = false,
}: { contacts?: any[]; isLoadingContacts?: boolean } = {}) {
  mockedUseContacts.mockReturnValue({ contacts, isLoading: isLoadingContacts } as any)
  mockedUseCreateConversation.mockReturnValue({ mutate: mockMutate, isPending: false } as any)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSocket.connected = true
  mockSocket.auth = {}
  mockHooks()
})

describe('ShareToMessageDialog', () => {
  it("affiche l'aperçu du post", () => {
    mockHooks()
    render(<ShareToMessageDialog post={post} open onOpenChange={jest.fn()} />)
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText(/Un super article sur React/)).toBeInTheDocument()
  })

  it('affiche un état de chargement des contacts', () => {
    mockHooks({ isLoadingContacts: true })
    render(<ShareToMessageDialog post={post} open onOpenChange={jest.fn()} />)
    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })

  it("affiche un message quand aucun contact ne correspond", () => {
    mockHooks({ contacts: [] })
    render(<ShareToMessageDialog post={post} open onOpenChange={jest.fn()} />)
    expect(screen.getByText('Aucun contact trouvé.')).toBeInTheDocument()
  })

  it('filtre les contacts au fil de la frappe', async () => {
    mockHooks({ contacts: [
      { id: 1, username: 'charlie', relation: 'mutual' },
      { id: 2, username: 'dave', relation: 'following' },
    ] })
    const user = userEvent.setup()
    render(<ShareToMessageDialog post={post} open onOpenChange={jest.fn()} />)

    expect(screen.getByText('charlie')).toBeInTheDocument()
    expect(screen.getByText('dave')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Rechercher un contact...'), 'char')

    expect(screen.getByText('charlie')).toBeInTheDocument()
    expect(screen.queryByText('dave')).not.toBeInTheDocument()
  })

  it("désactive l'envoi tant qu'aucun contact n'est sélectionné", () => {
    render(<ShareToMessageDialog post={post} open onOpenChange={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
  })

  it('sélectionne un contact puis permet de revenir en arrière', async () => {
    mockHooks({ contacts: [{ id: 1, username: 'charlie', relation: 'mutual' }] })
    const user = userEvent.setup()
    render(<ShareToMessageDialog post={post} open onOpenChange={jest.fn()} />)

    await user.click(screen.getByText('charlie'))
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Changer' }))
    expect(screen.getByPlaceholderText('Rechercher un contact...')).toBeInTheDocument()
  })

  it('envoie le post via socket et notifie le succès', async () => {
    mockHooks({ contacts: [{ id: 1, username: 'charlie', relation: 'mutual' }] })
    mockMutate.mockImplementation((_payload, { onSuccess }) => onSuccess({ id: 'conv-1' }))
    const onOpenChange = jest.fn()
    const user = userEvent.setup()
    render(<ShareToMessageDialog post={post} open onOpenChange={onOpenChange} />)

    await user.click(screen.getByText('charlie'))
    await user.type(screen.getByLabelText(/Message personnel/i), 'Regarde ça !')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(mockMutate).toHaveBeenCalledWith(
      { targetUserId: 1, type: 'direct' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
    expect(mockSocket.connect).not.toHaveBeenCalled()
    const emitCall = mockSocket.emit.mock.calls[0]
    expect(emitCall[0]).toBe('send_message')
    expect(emitCall[1].conversation_id).toBe('conv-1')
    expect(emitCall[1].body).toContain('shared-post-card')
    expect(emitCall[1].body).toContain('Regarde ça !')
    expect(toast.success).toHaveBeenCalledWith('Post envoyé à charlie')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('reconnecte le socket avant envoi si déconnecté', async () => {
    mockSocket.connected = false
    mockHooks({ contacts: [{ id: 1, username: 'charlie', relation: 'mutual' }] })
    mockMutate.mockImplementation((_payload, { onSuccess }) => onSuccess({ id: 'conv-1' }))
    const user = userEvent.setup()
    render(<ShareToMessageDialog post={post} open onOpenChange={jest.fn()} />)

    await user.click(screen.getByText('charlie'))
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(mockSocket.auth).toEqual({ token: 'jwt-token', userId: 1 })
    expect(mockSocket.connect).toHaveBeenCalled()
  })

  it("affiche une erreur et réactive l'envoi si la création de conversation échoue", async () => {
    mockHooks({ contacts: [{ id: 1, username: 'charlie', relation: 'mutual' }] })
    mockMutate.mockImplementation((_payload, { onError }) => onError(new Error('boom')))
    const onOpenChange = jest.fn()
    const user = userEvent.setup()
    render(<ShareToMessageDialog post={post} open onOpenChange={onOpenChange} />)

    await user.click(screen.getByText('charlie'))
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'envoi")
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeEnabled()
  })

  it('réinitialise et ferme au clic sur Annuler', async () => {
    mockHooks({ contacts: [{ id: 1, username: 'charlie', relation: 'mutual' }] })
    const onOpenChange = jest.fn()
    const user = userEvent.setup()
    render(<ShareToMessageDialog post={post} open onOpenChange={onOpenChange} />)

    await user.click(screen.getByText('charlie'))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mockMutate).not.toHaveBeenCalled()
  })
})
