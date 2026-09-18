import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessagingLayout from '@/components/message/MessagingLayout'
import { useConversations, useCreateConversation } from '@/hooks/useConversations'
import { useContacts } from '@/hooks/useContacts'
import { useOnlineUsers } from '@/hooks/useOnlineUsers'
import { useSearchMessages } from '@/hooks/useMessages'
import type { Conversation } from '@/interfaces/conversation'
import type { MessageSearchResult } from '@/services/messageService'

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
jest.mock('@/hooks/useMessages', () => ({
  useSearchMessages: jest.fn(),
}))
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, username: 'me' } }),
}))

const mockPush = jest.fn()
let mockParams: { id?: string } = {}
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => mockParams,
}))

const mockedUseConversations = useConversations as jest.MockedFunction<typeof useConversations>
const mockedUseCreateConversation = useCreateConversation as jest.MockedFunction<typeof useCreateConversation>
const mockedUseContacts = useContacts as jest.MockedFunction<typeof useContacts>
const mockedUseOnlineUsers = useOnlineUsers as jest.MockedFunction<typeof useOnlineUsers>
const mockedUseSearchMessages = useSearchMessages as jest.MockedFunction<typeof useSearchMessages>

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
  contacts = [],
  searchResults,
  isSearching = false,
}: {
  conversations?: Conversation[]
  isLoading?: boolean
  contacts?: { id: number; username: string; relation: 'follower' | 'following' | 'mutual' }[]
  searchResults?: MessageSearchResult[]
  isSearching?: boolean
} = {}) {
  mockedUseConversations.mockReturnValue({ data: conversations, isLoading } as any)
  mockedUseCreateConversation.mockReturnValue({ mutate: mockMutate, isPending: false } as any)
  mockedUseContacts.mockReturnValue({ contacts, isLoading: false } as any)
  mockedUseOnlineUsers.mockReturnValue({ isOnline: () => false } as any)
  mockedUseSearchMessages.mockReturnValue({ data: searchResults, isLoading: isSearching } as any)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockParams = {}
  mockDefaults()
})

describe('MessagingLayout', () => {
  it('affiche un état de chargement', () => {
    mockDefaults({ isLoading: true })
    const { container } = render(<MessagingLayout>enfant</MessagingLayout>)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it("affiche l'état vide sans conversation", () => {
    mockDefaults({ conversations: [] })
    render(<MessagingLayout>enfant</MessagingLayout>)
    expect(screen.getByText('Aucune conversation')).toBeInTheDocument()
  })

  it('affiche la liste des conversations triées par dernier message', () => {
    mockDefaults({
      conversations: [
        conv({ id: 'old', lastMessage: { id: 'm1', body: 'Ancien message', createdAt: '2026-01-01T10:00:00Z', sender: { id: 2, username: 'bob' }, read: true } as any, participants: [{ id: 1, username: 'me' } as any, { id: 2, username: 'bob' } as any] }),
        conv({ id: 'new', lastMessage: { id: 'm2', body: 'Nouveau message', createdAt: '2026-01-02T10:00:00Z', sender: { id: 3, username: 'alice' }, read: true } as any, participants: [{ id: 1, username: 'me' } as any, { id: 3, username: 'alice' } as any] }),
      ],
    })
    render(<MessagingLayout>enfant</MessagingLayout>)

    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '/message/new')
    expect(links[1]).toHaveAttribute('href', '/message/old')
  })

  it('filtre les conversations sans dernier message (sauf celle active)', () => {
    mockParams = { id: 'empty-active' }
    mockDefaults({
      conversations: [
        conv({ id: 'empty-inactive', lastMessage: undefined }),
        conv({ id: 'empty-active', lastMessage: undefined }),
      ],
    })
    render(<MessagingLayout>enfant</MessagingLayout>)

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/message/empty-active')
  })

  it('affiche un badge non-lu pour un message reçu non lu', () => {
    mockDefaults({
      conversations: [
        conv({
          id: 'c1',
          lastMessage: { id: 'm1', body: 'Salut', createdAt: '2026-01-01T10:00:00Z', sender: { id: 2, username: 'bob' }, read: false } as any,
        }),
      ],
    })
    render(<MessagingLayout>enfant</MessagingLayout>)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it("n'affiche pas de badge non-lu pour un message qu'on a soi-même envoyé", () => {
    mockDefaults({
      conversations: [
        conv({
          id: 'c1',
          lastMessage: { id: 'm1', body: 'Salut', createdAt: '2026-01-01T10:00:00Z', sender: { id: 1, username: 'me' }, read: false } as any,
        }),
      ],
    })
    render(<MessagingLayout>enfant</MessagingLayout>)
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })

  it.each([
    ['image', 'Photo'],
    ['session_proposal', '📅 Proposition de session'],
    ['session_closed', '⭐ Proposition de notation'],
  ])('affiche un aperçu adapté pour le type %s', (type, expected) => {
    mockDefaults({
      conversations: [
        conv({ id: 'c1', lastMessage: { id: 'm1', body: 'x', type, createdAt: '2026-01-01T10:00:00Z', sender: { id: 2, username: 'bob' }, read: true } as any }),
      ],
    })
    render(<MessagingLayout>enfant</MessagingLayout>)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('affiche un aperçu de fichier avec son nom', () => {
    mockDefaults({
      conversations: [
        conv({
          id: 'c1',
          lastMessage: {
            id: 'm1', type: 'file', body: JSON.stringify({ name: 'doc.pdf' }),
            createdAt: '2026-01-01T10:00:00Z', sender: { id: 2, username: 'bob' }, read: true,
          } as any,
        }),
      ],
    })
    render(<MessagingLayout>enfant</MessagingLayout>)
    expect(screen.getByText('doc.pdf')).toBeInTheDocument()
  })

  it('ouvre le panneau nouvelle conversation et démarre une conversation avec un contact', async () => {
    mockDefaults({
      contacts: [{ id: 7, username: 'charlie', relation: 'mutual' }],
    })
    mockMutate.mockImplementation((_payload, { onSuccess }) => onSuccess({ id: 'new-conv' }))
    const user = userEvent.setup()
    render(<MessagingLayout>enfant</MessagingLayout>)

    await user.click(screen.getByTitle('Nouvelle conversation'))
    expect(screen.getByText('charlie')).toBeInTheDocument()
    expect(screen.getByText('Abonné·e mutuel·le')).toBeInTheDocument()

    await user.click(screen.getByText('charlie'))

    expect(mockMutate).toHaveBeenCalledWith(
      { targetUserId: 7, type: 'direct' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/message/new-conv'))
  })

  it('filtre les contacts au fil de la frappe dans la recherche de contact', async () => {
    mockDefaults({
      contacts: [
        { id: 7, username: 'charlie', relation: 'mutual' },
        { id: 8, username: 'dave', relation: 'following' },
      ],
    })
    const user = userEvent.setup()
    render(<MessagingLayout>enfant</MessagingLayout>)

    await user.click(screen.getByTitle('Nouvelle conversation'))
    expect(screen.getByText('charlie')).toBeInTheDocument()
    expect(screen.getByText('dave')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Rechercher un contact...'), 'char')

    expect(screen.getByText('charlie')).toBeInTheDocument()
    expect(screen.queryByText('dave')).not.toBeInTheDocument()
  })

  it("n'affiche pas un contact avec qui une conversation directe existe déjà", async () => {
    mockDefaults({
      conversations: [conv({ id: 'c1', participants: [{ id: 1, username: 'me' } as any, { id: 7, username: 'charlie' } as any] })],
      contacts: [{ id: 7, username: 'charlie', relation: 'following' }],
    })
    const user = userEvent.setup()
    render(<MessagingLayout>enfant</MessagingLayout>)

    await user.click(screen.getByTitle('Nouvelle conversation'))
    expect(screen.getByText('Aucun contact trouvé.')).toBeInTheDocument()
  })

  it('affiche les résultats de recherche de messages', async () => {
    mockDefaults({
      searchResults: [
        {
          id: 'r1',
          body: 'Un message important à propos du projet',
          type: 'text',
          createdAt: '2026-01-01T10:00:00Z',
          conversationId: 'c1',
          sender: { id: 2, username: 'bob' },
          conversation: { id: 'c1', type: 'direct', participants: [{ id: 1, username: 'me' }, { id: 2, username: 'bob' }] },
        },
      ],
    })
    const user = userEvent.setup()
    render(<MessagingLayout>enfant</MessagingLayout>)

    await user.type(screen.getByPlaceholderText('Rechercher dans les messages...'), 'projet')

    expect(await screen.findByRole('link', { name: /bob/ })).toHaveAttribute('href', '/message/c1?msg=r1')
  })

  it('affiche un message "Aucun résultat" pour une recherche sans correspondance', async () => {
    mockDefaults({ searchResults: [] })
    const user = userEvent.setup()
    render(<MessagingLayout>enfant</MessagingLayout>)

    await user.type(screen.getByPlaceholderText('Rechercher dans les messages...'), 'zzz')

    expect(await screen.findByText('Aucun résultat')).toBeInTheDocument()
  })

  it('affiche les enfants passés au layout', () => {
    mockDefaults()
    render(<MessagingLayout><div>Contenu conversation</div></MessagingLayout>)
    expect(screen.getByText('Contenu conversation')).toBeInTheDocument()
  })
})
