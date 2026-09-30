import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import toast from 'react-hot-toast'
import {
  useUnreadCount,
  useNotificationList,
  useMarkRead,
  useMarkAllRead,
  useNotificationRealtime,
} from '@/hooks/useNotifications'
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/notificationService'
import { socket } from '@/lib/socket'
import type { Notification } from '@/interfaces/notification'

type Handler = (notification: Notification) => void
const mockHandlers: Record<string, Handler> = {}

jest.mock('@/lib/socket', () => ({
  socket: {
    on: jest.fn((event: string, handler: Handler) => {
      mockHandlers[event] = handler
    }),
    off: jest.fn(),
  },
}))
jest.mock('@/services/notificationService')
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: jest.fn(),
}))

let mockUser: { id: number } | null = { id: 1 }
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

const mockShowNotification = jest.fn()
jest.mock('@/hooks/useBrowserNotifications', () => ({
  useBrowserNotifications: () => ({ showNotification: mockShowNotification }),
}))

const mockedSocket = socket as unknown as { on: jest.Mock; off: jest.Mock }
const mockedToast = toast as unknown as jest.Mock
const mockedGetNotifications = getNotifications as jest.MockedFunction<typeof getNotifications>
const mockedGetUnreadCount = getUnreadCount as jest.MockedFunction<typeof getUnreadCount>
const mockedMarkRead = markNotificationRead as jest.MockedFunction<typeof markNotificationRead>
const mockedMarkAllRead = markAllNotificationsRead as jest.MockedFunction<typeof markAllNotificationsRead>

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 10,
    type: 'comment',
    message: 'bob a commenté votre post',
    relatedEntityId: 42,
    isRead: false,
    createdAt: '2026-01-01T00:00:00Z',
    senderId: 2,
    senderUsername: 'bob',
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
  mockUser = { id: 1 }
})

describe('useUnreadCount', () => {
  it('charge le nombre de notifications non lues', async () => {
    mockedGetUnreadCount.mockResolvedValueOnce({ count: 3 })
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useUnreadCount(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual({ count: 3 }))
  })
})

describe('useNotificationList', () => {
  it('charge la page demandee', async () => {
    mockedGetNotifications.mockResolvedValueOnce({ items: [] } as never)
    const { wrapper } = createWrapper()

    renderHook(() => useNotificationList(2, 10), { wrapper })

    await waitFor(() => expect(mockedGetNotifications).toHaveBeenCalledWith(2, 10))
  })

  it('utilise la page 1 et 20 elements par defaut', async () => {
    mockedGetNotifications.mockResolvedValueOnce({ items: [] } as never)
    const { wrapper } = createWrapper()

    renderHook(() => useNotificationList(), { wrapper })

    await waitFor(() => expect(mockedGetNotifications).toHaveBeenCalledWith(1, 20))
  })
})

describe.each([
  ['useMarkRead', useMarkRead, mockedMarkRead, 10],
  ['useMarkAllRead', useMarkAllRead, mockedMarkAllRead, undefined],
] as const)('%s', (_name, useHook, serviceMock, payload) => {
  it('appelle le service et invalide les notifications', async () => {
    ;(serviceMock as jest.Mock).mockResolvedValueOnce(undefined)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => (useHook as () => { mutateAsync: (p: unknown) => Promise<unknown> })(), { wrapper })
    await act(() => result.current.mutateAsync(payload))

    expect(serviceMock).toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] })
  })
})

describe('useNotificationRealtime', () => {
  function setup() {
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')
    const hook = renderHook(() => useNotificationRealtime(), { wrapper })
    return { ...hook, invalidateSpy }
  }

  it("ne s'abonne pas sans utilisateur connecte", () => {
    mockUser = null
    setup()
    expect(mockedSocket.on).not.toHaveBeenCalled()
  })

  it('se desabonne au demontage', () => {
    const { unmount } = setup()
    const handler = mockHandlers.new_notification

    unmount()
    expect(mockedSocket.off).toHaveBeenCalledWith('new_notification', handler)
  })

  it.each([
    ['comment', '💬', '/post/42'],
    ['like', '❤️', '/post/42'],
    ['follow', '👤', '/user/2'],
    ['appointment_confirmed', '📅', null],
    ['mentoring_new_request', '🔔', null],
  ] as const)('affiche un toast et une notification navigateur pour un %s', (type, icon, url) => {
    const { invalidateSpy } = setup()

    act(() => mockHandlers.new_notification(makeNotification({ type })))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] })
    expect(mockedToast).toHaveBeenCalledWith('bob a commenté votre post', { icon, duration: 4000 })
    const options = mockShowNotification.mock.calls[0][0]
    expect(options).toMatchObject({
      title: `${icon} bob`,
      body: 'bob a commenté votre post',
      tag: 'notif-10',
    })
    expect(options.onClick === undefined).toBe(url === null)
  })

  it('redirige vers l URL cible au clic sur la notification navigateur', () => {
    setup()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true, configurable: true })

    try {
      act(() => mockHandlers.new_notification(makeNotification({ type: 'follow' })))
      mockShowNotification.mock.calls[0][0].onClick()
      expect(window.location.href).toBe('/user/2')
    } finally {
      Object.defineProperty(window, 'location', { value: originalLocation, configurable: true })
    }
  })

  it('n a pas d URL pour un commentaire sans entite liee', () => {
    setup()
    act(() => mockHandlers.new_notification(makeNotification({ type: 'comment', relatedEntityId: null })))
    expect(mockShowNotification.mock.calls[0][0].onClick).toBeUndefined()
  })

  it.each([
    ['appointment_confirmed', 'appointment:confirmed'],
    ['mentoring_session_scheduled', 'session:scheduled'],
  ] as const)('emet un evenement fenetre pour %s', (type, eventName) => {
    const listener = jest.fn()
    window.addEventListener(eventName, listener)
    setup()

    try {
      act(() => mockHandlers.new_notification(makeNotification({ type, relatedEntityId: 5 })))
      act(() => mockHandlers.new_notification(makeNotification({ type, relatedEntityId: null })))

      expect(listener).toHaveBeenCalledTimes(1)
      expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ sessionId: 5 })
    } finally {
      window.removeEventListener(eventName, listener)
    }
  })
})
