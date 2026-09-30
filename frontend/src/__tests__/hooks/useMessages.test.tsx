import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import toast from 'react-hot-toast'
import { useMessages, useRealtimeMessages, useSearchMessages } from '@/hooks/useMessages'
import { getMessages, searchMessages } from '@/services/messageService'
import { socket } from '@/lib/socket'
import type { Message } from '@/interfaces/message'
import type { Conversation } from '@/interfaces/conversation'

type Handler = (...args: unknown[]) => void
const mockHandlers: Record<string, Handler> = {}

jest.mock('@/lib/socket', () => ({
  socket: {
    connected: false,
    auth: {},
    connect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event: string, handler: Handler) => {
      mockHandlers[event] = handler
    }),
    off: jest.fn(),
  },
}))
jest.mock('@/services/messageService')
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}))

let mockUser: { id: number; username: string; token: string } | null = { id: 1, username: 'me', token: 'tok' }
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

const mockedSocket = socket as unknown as {
  connected: boolean
  auth: Record<string, unknown>
  connect: jest.Mock
  emit: jest.Mock
  on: jest.Mock
  off: jest.Mock
}
const mockedGetMessages = getMessages as jest.MockedFunction<typeof getMessages>
const mockedSearchMessages = searchMessages as jest.MockedFunction<typeof searchMessages>

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    conversationId: 'c1',
    body: 'Salut',
    type: 'text',
    read: true,
    sender: { id: 2, username: 'bob' },
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
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
  mockUser = { id: 1, username: 'me', token: 'tok' }
  mockedGetMessages.mockResolvedValue([])
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('useMessages', () => {
  it('charge les messages de la conversation', async () => {
    const messages = [makeMessage()]
    mockedGetMessages.mockResolvedValueOnce(messages)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useMessages('c1'), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(messages))
    expect(mockedGetMessages).toHaveBeenCalledWith('c1')
  })

  it('ne charge rien sans conversation', () => {
    const { wrapper } = createWrapper()
    renderHook(() => useMessages(''), { wrapper })
    expect(mockedGetMessages).not.toHaveBeenCalled()
  })
})

describe('useRealtimeMessages', () => {
  it("n'ouvre pas de socket sans conversation ou utilisateur", () => {
    const { wrapper } = createWrapper()
    renderHook(() => useRealtimeMessages('c1', undefined), { wrapper })
    renderHook(() => useRealtimeMessages('', 1), { wrapper })

    expect(mockedSocket.emit).not.toHaveBeenCalled()
    expect(mockedSocket.on).not.toHaveBeenCalled()
  })

  it('connecte le socket, rejoint la conversation puis la quitte au demontage', () => {
    const { wrapper } = createWrapper()
    const { unmount } = renderHook(() => useRealtimeMessages('c1', 1), { wrapper })

    expect(mockedSocket.auth).toEqual({ token: 'tok', userId: 1 })
    expect(mockedSocket.connect).toHaveBeenCalled()
    expect(mockedSocket.emit).toHaveBeenCalledWith('join_conversation', { conversation_id: 'c1' })
    expect(Object.keys(mockHandlers).sort()).toEqual(['ack', 'message_created', 'typing'])

    unmount()

    expect(mockedSocket.off).toHaveBeenCalledWith('message_created', mockHandlers.message_created)
    expect(mockedSocket.off).toHaveBeenCalledWith('typing', mockHandlers.typing)
    expect(mockedSocket.off).toHaveBeenCalledWith('ack', mockHandlers.ack)
    expect(mockedSocket.emit).toHaveBeenCalledWith('leave_conversation', { conversation_id: 'c1' })
  })

  it('ne reconnecte pas un socket deja connecte', () => {
    mockedSocket.connected = true
    const { wrapper } = createWrapper()
    renderHook(() => useRealtimeMessages('c1', 1), { wrapper })

    expect(mockedSocket.connect).not.toHaveBeenCalled()
  })

  it('recharge les messages a la reception d un nouveau message', async () => {
    const { wrapper } = createWrapper()
    renderHook(() => useRealtimeMessages('c1', 1), { wrapper })
    await waitFor(() => expect(mockedGetMessages).toHaveBeenCalledTimes(1))

    act(() => mockHandlers.message_created({ id: 'm2' }))

    await waitFor(() => expect(mockedGetMessages).toHaveBeenCalledTimes(2))
  })

  it('suit les utilisateurs en train d ecrire dans cette conversation', () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useRealtimeMessages('c1', 1), { wrapper })

    act(() => mockHandlers.typing({ conversation_id: 'c1', user_id: 2, is_typing: true }))
    act(() => mockHandlers.typing({ conversation_id: 'c1', user_id: 2, is_typing: true }))
    act(() => mockHandlers.typing({ conversation_id: 'c1', user_id: 3, is_typing: true }))
    expect(result.current.typingUsers).toEqual(['2', '3'])

    // Evenements ignores : autre conversation, ou soi-meme
    act(() => mockHandlers.typing({ conversation_id: 'c2', user_id: 4, is_typing: true }))
    act(() => mockHandlers.typing({ conversation_id: 'c1', user_id: 1, is_typing: true }))
    expect(result.current.typingUsers).toEqual(['2', '3'])

    act(() => mockHandlers.typing({ conversation_id: 'c1', user_id: 2, is_typing: false }))
    expect(result.current.typingUsers).toEqual(['3'])
  })

  it('retire le message optimiste et affiche un toast quand la moderation le rejette', async () => {
    const { wrapper, queryClient } = createWrapper()
    renderHook(() => useRealtimeMessages('c1', 1), { wrapper })
    await waitFor(() => expect(mockedGetMessages).toHaveBeenCalled())
    queryClient.setQueryData(['messages', 'c1'], [makeMessage({ id: 'keep' }), makeMessage({ id: 'tmp' })])

    act(() => mockHandlers.ack({ temp_id: 'tmp', error: 'content_rejected', message: 'Contenu interdit' }))

    expect(queryClient.getQueryData<Message[]>(['messages', 'c1'])?.map((m) => m.id)).toEqual(['keep'])
    expect(toast.error).toHaveBeenCalledWith('Contenu interdit')
  })

  it('utilise un message par defaut pour un rejet sans temp_id ni message', () => {
    const { wrapper, queryClient } = createWrapper()
    const setSpy = jest.spyOn(queryClient, 'setQueryData')
    renderHook(() => useRealtimeMessages('c1', 1), { wrapper })

    act(() => mockHandlers.ack({ error: 'content_rejected' }))

    expect(setSpy).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Votre message a été rejeté par la modération.')
  })

  it('ignore les accuses de reception sans erreur ou avec une erreur autre que la moderation', () => {
    const { wrapper, queryClient } = createWrapper()
    const setSpy = jest.spyOn(queryClient, 'setQueryData')
    renderHook(() => useRealtimeMessages('c1', 1), { wrapper })

    act(() => mockHandlers.ack({ temp_id: 'tmp' }))
    act(() => mockHandlers.ack(undefined))
    act(() => mockHandlers.ack({ temp_id: 'tmp', error: 'db_insert_failed' }))

    expect(setSpy).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  describe('sendMessage', () => {
    it('emet le message et met a jour les caches de maniere optimiste', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(123)
      const { wrapper, queryClient } = createWrapper()
      const { result } = renderHook(() => useRealtimeMessages('c1', 1), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      queryClient.setQueryData(['messages', 'c1'], [makeMessage()])
      queryClient.setQueryData<Partial<Conversation>[]>(['conversations'], [{ id: 'c1' }, { id: 'c2' }])

      act(() => result.current.sendMessage('Hello', 'image'))

      expect(mockedSocket.emit).toHaveBeenCalledWith('send_message', {
        conversation_id: 'c1',
        temp_id: '123',
        body: 'Hello',
        type: 'image',
      })
      const messages = queryClient.getQueryData<Message[]>(['messages', 'c1'])!
      expect(messages).toHaveLength(2)
      expect(messages[1]).toMatchObject({
        id: '123',
        body: 'Hello',
        type: 'image',
        sender: { id: 1, username: 'me' },
        conversationId: 'c1',
      })
      const conversations = queryClient.getQueryData<Conversation[]>(['conversations'])!
      expect(conversations[0].lastMessage).toMatchObject({ id: '123', body: 'Hello' })
      expect(conversations[1].lastMessage).toBeUndefined()
    })

    it('initialise le cache des messages s il est vide', () => {
      const { wrapper, queryClient } = createWrapper()
      const { result } = renderHook(() => useRealtimeMessages('', 1), { wrapper })

      act(() => result.current.sendMessage('Hello'))

      expect(queryClient.getQueryData<Message[]>(['messages', ''])).toEqual([
        expect.objectContaining({ body: 'Hello', type: 'text' }),
      ])
      expect(queryClient.getQueryData(['conversations'])).toBeUndefined()
    })

    it("n'envoie rien pour un message vide ou sans utilisateur", () => {
      const { wrapper } = createWrapper()
      const { result, rerender } = renderHook(() => useRealtimeMessages('c1', 1), { wrapper })
      mockedSocket.emit.mockClear()

      act(() => result.current.sendMessage('   '))
      mockUser = null
      rerender()
      act(() => result.current.sendMessage('Hello'))

      expect(mockedSocket.emit).not.toHaveBeenCalledWith('send_message', expect.anything())
    })
  })
})

describe('useSearchMessages', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('lance la recherche apres 300 ms de debounce', async () => {
    mockedSearchMessages.mockResolvedValue([] as never)
    const { wrapper } = createWrapper()

    const { rerender } = renderHook(({ q }) => useSearchMessages(q), {
      wrapper,
      initialProps: { q: 'he' },
    })
    rerender({ q: 'hello' })

    await act(async () => {
      jest.advanceTimersByTime(299)
    })
    expect(mockedSearchMessages).not.toHaveBeenCalled()

    await act(async () => {
      jest.advanceTimersByTime(1)
    })
    expect(mockedSearchMessages).toHaveBeenCalledTimes(1)
    expect(mockedSearchMessages).toHaveBeenCalledWith('hello')
  })

  it('ne recherche pas en dessous de 2 caracteres', async () => {
    const { wrapper } = createWrapper()
    renderHook(() => useSearchMessages('h'), { wrapper })

    await act(async () => {
      jest.advanceTimersByTime(500)
    })
    expect(mockedSearchMessages).not.toHaveBeenCalled()
  })
})
