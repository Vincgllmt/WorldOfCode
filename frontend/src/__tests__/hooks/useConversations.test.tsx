import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import toast from 'react-hot-toast'
import {
  useConversationRealtime,
  useConversations,
  useConversation,
  useCreateConversation,
  useMarkConversationAsRead,
} from '@/hooks/useConversations'
import {
  getConversations,
  getConversationById,
  createConversation,
  markConversationAsRead,
} from '@/services/conversationService'
import { getUserById } from '@/services/userService'
import { socket } from '@/lib/socket'
import type { Conversation } from '@/interfaces/conversation'

type Handler = (payload?: unknown) => Promise<void>
const mockHandlers: Record<string, Handler> = {}

jest.mock('@/lib/socket', () => ({
  socket: {
    connected: false,
    auth: {},
    connect: jest.fn(),
    on: jest.fn((event: string, handler: Handler) => {
      mockHandlers[event] = handler
    }),
    off: jest.fn(),
  },
}))
jest.mock('@/services/conversationService')
jest.mock('@/services/userService')
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}))

let mockPathname = '/feed'
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

const mockShowNotification = jest.fn()
jest.mock('@/hooks/useBrowserNotifications', () => ({
  useBrowserNotifications: () => ({ showNotification: mockShowNotification }),
}))

const mockedSocket = socket as unknown as {
  connected: boolean
  auth: Record<string, unknown>
  connect: jest.Mock
  on: jest.Mock
  off: jest.Mock
}
const mockedGetConversations = getConversations as jest.MockedFunction<typeof getConversations>
const mockedGetConversationById = getConversationById as jest.MockedFunction<typeof getConversationById>
const mockedCreateConversation = createConversation as jest.MockedFunction<typeof createConversation>
const mockedMarkAsRead = markConversationAsRead as jest.MockedFunction<typeof markConversationAsRead>
const mockedGetUserById = getUserById as jest.MockedFunction<typeof getUserById>

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    type: 'direct',
    createdAt: '2026-01-01T00:00:00Z',
    participants: [
      { id: 1, username: 'me' },
      { id: 2, username: 'bob' },
    ] as Conversation['participants'],
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
  Object.keys(mockHandlers).forEach((k) => delete mockHandlers[k])
  mockedSocket.connected = false
  mockedSocket.auth = {}
  mockPathname = '/feed'
})

describe('useConversationRealtime', () => {
  function setup(userId: string | number | undefined) {
    const { wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(['conversations'], [makeConversation()])
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')
    const hook = renderHook(() => useConversationRealtime(userId), { wrapper })
    return { ...hook, queryClient, invalidateSpy }
  }

  it("ne s'abonne pas sans utilisateur", () => {
    setup(undefined)
    expect(mockedSocket.on).not.toHaveBeenCalled()
    expect(mockedSocket.connect).not.toHaveBeenCalled()
  })

  it('connecte le socket et se desabonne au demontage', () => {
    const { unmount } = setup(1)

    expect(mockedSocket.auth).toEqual({ userId: 1 })
    expect(mockedSocket.connect).toHaveBeenCalled()
    expect(mockedSocket.on).toHaveBeenCalledWith('message_created', mockHandlers.message_created)

    unmount()
    expect(mockedSocket.off).toHaveBeenCalledWith('message_created', mockHandlers.message_created)
  })

  it('ne reconnecte pas un socket deja connecte', () => {
    mockedSocket.connected = true
    setup(1)
    expect(mockedSocket.connect).not.toHaveBeenCalled()
  })

  it('invalide les conversations sans notifier si le payload est vide', async () => {
    const { invalidateSpy } = setup(1)

    await act(() => mockHandlers.message_created(undefined))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['conversations'] })
    expect(mockShowNotification).not.toHaveBeenCalled()
  })

  it('ne notifie pas ses propres messages', async () => {
    setup(1)
    await act(() => mockHandlers.message_created({ conversation_id: 'c1', sender_id: '1', body: 'x' }))
    expect(mockShowNotification).not.toHaveBeenCalled()
  })

  it('ne notifie pas si la conversation est deja ouverte', async () => {
    mockPathname = '/message/c1'
    setup(1)
    await act(() => mockHandlers.message_created({ conversation_id: 'c1', sender_id: 2, body: 'x' }))
    expect(mockShowNotification).not.toHaveBeenCalled()
  })

  it('notifie avec le nom et l avatar en cache, et un texte nettoye du HTML', async () => {
    const { queryClient } = setup(1)
    queryClient.setQueryData(['user', 2], { avatarUrl: 'https://img/bob.png' })

    await act(() =>
      mockHandlers.message_created({ conversation_id: 'c1', sender_id: 2, body: '<p>Salut <b>toi</b></p>' }),
    )

    expect(mockedGetUserById).not.toHaveBeenCalled()
    expect(mockShowNotification).toHaveBeenCalledWith({
      title: 'bob',
      body: 'Salut toi',
      icon: 'https://img/bob.png',
      tag: 'msg-c1',
      onClick: expect.any(Function),
    })
  })

  it("redirige vers la conversation au clic sur la notification", async () => {
    setup(1)
    mockedGetUserById.mockResolvedValueOnce({ avatarUrl: null } as never)
    const originalLocation = window.location
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true, configurable: true })

    try {
      await act(() => mockHandlers.message_created({ conversation_id: 'c1', sender_id: 2, body: 'x' }))
      mockShowNotification.mock.calls[0][0].onClick()
      expect(window.location.href).toBe('/message/c1')
    } finally {
      Object.defineProperty(window, 'location', { value: originalLocation, configurable: true })
    }
  })

  it('recupere l avatar via l API s il n est pas en cache', async () => {
    mockedGetUserById.mockResolvedValueOnce({ id: 2, avatarUrl: 'https://img/fetched.png' } as never)
    setup(1)

    await act(() => mockHandlers.message_created({ conversation_id: 'c1', sender_id: 2, body: 'x' }))

    expect(mockedGetUserById).toHaveBeenCalledWith(2)
    expect(mockShowNotification).toHaveBeenCalledWith(expect.objectContaining({ icon: 'https://img/fetched.png' }))
  })

  it('utilise l icone par defaut si la recuperation de l avatar echoue', async () => {
    mockedGetUserById.mockRejectedValueOnce(new Error('ko'))
    setup(1)

    await act(() => mockHandlers.message_created({ conversation_id: 'c1', sender_id: 2, body: 'x' }))

    expect(mockShowNotification).toHaveBeenCalledWith(expect.objectContaining({ icon: undefined }))
  })

  it.each([
    ['image', '📷 Photo'],
    ['file', '📎 Fichier'],
  ])('affiche un apercu dedie pour un message de type %s', async (type, preview) => {
    mockedGetUserById.mockResolvedValueOnce({ avatarUrl: null } as never)
    setup(1)

    await act(() => mockHandlers.message_created({ conversation_id: 'c1', sender_id: 2, body: 'url', type }))

    expect(mockShowNotification).toHaveBeenCalledWith(expect.objectContaining({ body: preview }))
  })

  it('tronque les longs messages et gere un expediteur inconnu sans conversation', async () => {
    setup(1)

    await act(() => mockHandlers.message_created({ body: 'a'.repeat(200) }))

    const options = mockShowNotification.mock.calls[0][0]
    expect(options.title).toBe('Nouveau message')
    expect(options.body).toBe('a'.repeat(117) + '…')
    expect(options.icon).toBeUndefined()
    expect(options.onClick).toBeUndefined()
    expect(mockedGetUserById).not.toHaveBeenCalled()
  })
})

describe('useConversations', () => {
  it('charge la liste des conversations', async () => {
    mockedGetConversations.mockResolvedValueOnce([makeConversation()])
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useConversations(), { wrapper })

    await waitFor(() => expect(result.current.data).toHaveLength(1))
  })
})

describe('useConversation', () => {
  it('charge la conversation par son id', async () => {
    mockedGetConversationById.mockResolvedValueOnce(makeConversation())
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useConversation('c1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGetConversationById).toHaveBeenCalledWith('c1')
  })

  it('ne charge rien sans id', () => {
    const { wrapper } = createWrapper()
    renderHook(() => useConversation(''), { wrapper })
    expect(mockedGetConversationById).not.toHaveBeenCalled()
  })
})

describe('useCreateConversation', () => {
  it('cree la conversation et invalide la liste', async () => {
    mockedCreateConversation.mockResolvedValueOnce(makeConversation())
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateConversation(), { wrapper })
    await act(() => result.current.mutateAsync({ targetUserId: 2 }))

    expect(mockedCreateConversation).toHaveBeenCalledWith({ targetUserId: 2 })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['conversations'] })
  })

  it('affiche un toast en cas d erreur', async () => {
    mockedCreateConversation.mockRejectedValueOnce(new Error('ko'))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useCreateConversation(), { wrapper })
    act(() => result.current.mutate({ targetUserId: 2 }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Erreur lors de la création de la conversation'),
    )
  })
})

describe('useMarkConversationAsRead', () => {
  it('marque le dernier message de la conversation comme lu dans le cache', async () => {
    mockedMarkAsRead.mockResolvedValueOnce(undefined as never)
    const lastMessage = { id: 'm1', body: 'x', createdAt: '', sender: { id: 2, username: 'bob' }, read: false }
    const { wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(
      ['conversations'],
      [
        makeConversation({ id: 'c1', lastMessage }),
        makeConversation({ id: 'c2', lastMessage }),
        makeConversation({ id: 'c3' }),
      ],
    )

    const { result } = renderHook(() => useMarkConversationAsRead(), { wrapper })
    await act(() => result.current.mutateAsync('c1'))
    await act(() => result.current.mutateAsync('c3'))

    const conversations = queryClient.getQueryData<Conversation[]>(['conversations'])!
    expect(mockedMarkAsRead).toHaveBeenCalledWith('c1')
    expect(conversations[0].lastMessage?.read).toBe(true)
    expect(conversations[1].lastMessage?.read).toBe(false)
    expect(conversations[2].lastMessage).toBeUndefined()
  })

  it('ne cree pas de cache s il n existe pas', async () => {
    mockedMarkAsRead.mockResolvedValueOnce(undefined as never)
    const { wrapper, queryClient } = createWrapper()

    const { result } = renderHook(() => useMarkConversationAsRead(), { wrapper })
    await act(() => result.current.mutateAsync('c1'))

    expect(queryClient.getQueryData(['conversations'])).toBeUndefined()
  })
})
