import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessagePanel } from '@/components/messaging/MessagePanel'
import { useConversations, useCreateConversation } from '@/hooks/useConversations'
import { useContacts } from '@/hooks/useContacts'
import { useOnlineUsers } from '@/hooks/useOnlineUsers'
import type { Conversation } from '@/interfaces/conversation'

jest.mock('@/hooks/useConversations', () => ({
  useConversations: jest.fn(),
  useCreateConversation: jest.fn(),
}))
jest.mock('@/hooks/useContacts', () => ({
  useContacts: jest.fn(),
}))
jest.mock('@/hooks/useOnlineUsers', () => ({
  useOnlineUsers: jest.fn(),
}))
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, username: 'me' } }),
}))

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockedUseConversations = useConversations as jest.MockedFunction<typeof useConversations>
const mockedUseCreateConversation = useCreateConversation as jest.MockedFunction<typeof useCreateConversation>
const mockedUseContacts = useContacts as jest.MockedFunction<typeof useContacts>
const mockedUseOnlineUsers = useOnlineUsers as jest.MockedFunction<typeof useOnlineUsers>

const mockMutate = jest.fn()

function conv(overrides: Partial<Conversation>): Conversation {
  return {
    id: 'c1',
    type: 'direct',
    title: null,
    createdAt: '2026-01-01T00:00:00Z',
    participants: [{ id: 1, username: 'me' } as any, { id: 2, username: 'bob' } as any],
    ...overrides,
  }
}

function mockDefaults({
  conversations = [],
  isLoading = false,
  isError = false,
  contacts = [],
  isPending = false,
}: {
  conversations?: Conversation[]
  isLoading?: boolean
  isError?: boolean
  contacts?: { id: number; username: string; relation: 'follower' | 'following' | 'mutual' }[]
  isPending?: boolean
} = {}) {
  mockedUseConversations.mockReturnValue({ data: conversations, isLoading, isError } as any)
  mockedUseCreateConversation.mockReturnValue({ mutate: mockMutate, isPending } as any)
  mockedUseContacts.mockReturnValue({ contacts, isLoading: false } as any)
  mockedUseOnlineUsers.mockReturnValue({ isOnline: () => false } as any)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDefaults()
})

describe('MessagePanel', () => {
  it('affiche un état de chargement des conversations', () => {
    mockDefaults({ isLoading: true })
    render(<MessagePanel open onOpenChange={jest.fn()} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('affiche une erreur si les conversations ne chargent pas', () => {
    mockDefaults({ isError: true })
    render(<MessagePanel open onOpenChange={jest.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/Impossible de charger vos conversations/)
  })

  it("affiche l'état vide sans conversation active", () => {
    mockDefaults({ conversations: [] })
    render(<MessagePanel open onOpenChange={jest.fn()} />)
    expect(screen.getByText('Aucune conversation pour le moment')).toBeInTheDocument()
  })

  it('ignore les conversations sans dernier message', () => {
    mockDefaults({ conversations: [conv({ id: 'empty', lastMessage: undefined })] })
    render(<MessagePanel open onOpenChange={jest.fn()} />)
    expect(screen.getByText('Aucune conversation pour le moment')).toBeInTheDocument()
  })

  it('affiche la liste des conversations avec titre, aperçu et badge non-lu', () => {
    mockDefaults({
      conversations: [
        conv({
          id: 'c1',
          lastMessage: { id: 'm1', body: 'Salut toi', createdAt: '2026-01-01T10:00:00Z', sender: { id: 2, username: 'bob' }, read: false } as any,
        }),
      ],
    })
    render(<MessagePanel open onOpenChange={jest.fn()} />)

    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(screen.getByText('Salut toi')).toBeInTheDocument()
    expect(screen.getByText('Non lu')).toBeInTheDocument()
  })

  it("n'affiche pas de badge non-lu pour un message déjà lu", () => {
    mockDefaults({
      conversations: [
        conv({
          id: 'c1',
          lastMessage: { id: 'm1', body: 'Salut', createdAt: '2026-01-01T10:00:00Z', sender: { id: 2, username: 'bob' }, read: true } as any,
        }),
      ],
    })
    render(<MessagePanel open onOpenChange={jest.fn()} />)
    expect(screen.queryByText('Non lu')).not.toBeInTheDocument()
  })

  it.each([
    ['image', 'x', 'Photo'],
    ['session_proposal', 'x', '📅 Proposition de session'],
    ['session_closed', 'x', '⭐ Proposition de notation'],
  ])('affiche un aperçu adapté pour le type %s', (type, body, expected) => {
    mockDefaults({
      conversations: [
        conv({ id: 'c1', lastMessage: { id: 'm1', type, body, createdAt: '2026-01-01T10:00:00Z', sender: { id: 2, username: 'bob' }, read: true } as any }),
      ],
    })
    render(<MessagePanel open onOpenChange={jest.fn()} />)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('sélectionne une conversation via le callback fourni sans naviguer', async () => {
    const onSelectConversation = jest.fn()
    const onOpenChange = jest.fn()
    mockDefaults({
      conversations: [
        conv({ id: 'c1', lastMessage: { id: 'm1', body: 'Salut', createdAt: '2026-01-01T10:00:00Z', sender: { id: 2, username: 'bob' }, read: true } as any }),
      ],
    })
    const user = userEvent.setup()
    render(<MessagePanel open onOpenChange={onOpenChange} onSelectConversation={onSelectConversation} />)

    await user.click(screen.getByRole('listitem').querySelector('button')!)

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onSelectConversation).toHaveBeenCalledWith('c1')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("navigue vers la conversation quand aucun callback n'est fourni", async () => {
    mockDefaults({
      conversations: [
        conv({ id: 'c1', lastMessage: { id: 'm1', body: 'Salut', createdAt: '2026-01-01T10:00:00Z', sender: { id: 2, username: 'bob' }, read: true } as any }),
      ],
    })
    const user = userEvent.setup()
    render(<MessagePanel open onOpenChange={jest.fn()} />)

    await user.click(screen.getByRole('listitem').querySelector('button')!)
    expect(mockPush).toHaveBeenCalledWith('/message/c1')
  })

  it('recherche et sélectionne un contact puis démarre une conversation', async () => {
    mockDefaults({ contacts: [{ id: 7, username: 'charlie', relation: 'mutual' }] })
    mockMutate.mockImplementation((_payload, { onSuccess }) => onSuccess({ id: 'new-conv' }))
    const onOpenChange = jest.fn()
    const user = userEvent.setup()
    render(<MessagePanel open onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('tab', { name: 'Nouveau message' }))
    expect(screen.getByText('charlie')).toBeInTheDocument()
    expect(screen.getByText('Abonné·e mutuel·le')).toBeInTheDocument()

    await user.click(screen.getByText('charlie'))
    expect(screen.getAllByText('charlie').length).toBeGreaterThan(1)

    await user.click(screen.getByRole('button', { name: /Démarrer/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      { targetUserId: 7, type: 'direct' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/message/new-conv'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('désactive le bouton Démarrer tant qu\'aucun contact n\'est sélectionné', async () => {
    mockDefaults({ contacts: [{ id: 7, username: 'charlie', relation: 'following' }] })
    const user = userEvent.setup()
    render(<MessagePanel open onOpenChange={jest.fn()} />)

    await user.click(screen.getByRole('tab', { name: 'Nouveau message' }))
    expect(screen.getByRole('button', { name: /Démarrer/i })).toBeDisabled()
  })

  it("n'affiche pas un contact avec qui une conversation directe existe déjà", async () => {
    mockDefaults({
      conversations: [conv({ id: 'c1', participants: [{ id: 1, username: 'me' } as any, { id: 7, username: 'charlie' } as any] })],
      contacts: [{ id: 7, username: 'charlie', relation: 'following' }],
    })
    const user = userEvent.setup()
    render(<MessagePanel open onOpenChange={jest.fn()} />)

    await user.click(screen.getByRole('tab', { name: 'Nouveau message' }))
    expect(screen.getByText('Aucun contact trouvé.')).toBeInTheDocument()
  })

  it('réinitialise l\'onglet et la sélection à la fermeture du panneau', () => {
    mockDefaults({ contacts: [{ id: 7, username: 'charlie', relation: 'following' }] })
    const { rerender } = render(<MessagePanel open onOpenChange={jest.fn()} />)
    rerender(<MessagePanel open={false} onOpenChange={jest.fn()} />)
    rerender(<MessagePanel open onOpenChange={jest.fn()} />)

    expect(screen.getByRole('tab', { name: 'Conversations' })).toHaveAttribute('aria-selected', 'true')
  })
})
