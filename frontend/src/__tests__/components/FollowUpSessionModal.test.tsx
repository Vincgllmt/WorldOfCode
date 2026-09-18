import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FollowUpSessionModal from '@/components/mentoring/cockpit/FollowUpSessionModal'
import { createSessionAppointment } from '@/lib/api/mentoring/appointments'
import { socket } from '@/lib/socket'
import type { MentoringSession } from '@/types/mentoring'

jest.mock('@/lib/api/mentoring/appointments', () => ({
  createSessionAppointment: jest.fn(),
}))
jest.mock('@/lib/socket', () => ({
  socket: {
    connected: true,
    auth: {} as Record<string, unknown>,
    emit: jest.fn(),
    once: jest.fn(),
    connect: jest.fn(),
  },
}))
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 2, username: 'mentorBob', token: 'jwt-token' } }),
}))

const mockedCreate = createSessionAppointment as jest.MockedFunction<typeof createSessionAppointment>
const mockSocket = socket as unknown as {
  connected: boolean
  auth: Record<string, unknown>
  emit: jest.Mock
  once: jest.Mock
  connect: jest.Mock
}

const session: MentoringSession = {
  id: 30,
  status: 'in_progress',
  format: 'text',
  scheduledAt: '2026-02-01T15:00:00Z',
  startedAt: '2026-02-01T15:05:00Z',
  completedAt: null,
  conversationId: 'conv-42',
  mentor: { id: 2, username: 'mentorBob' },
  junior: { id: 5, username: 'junior1' },
  request: null,
  createdAt: '2026-01-05T09:00:00Z',
}

const newAppointment = {
  id: 700,
  scheduledAt: '2026-03-20T14:30:00Z',
  format: 'text' as const,
  status: 'pending' as const,
  proposedBy: 'mentor' as const,
  createdAt: '2026-03-15T10:00:00Z',
}

async function pickDateAndTime(user: ReturnType<typeof userEvent.setup>, day: number, time: string) {
  await user.click(screen.getByRole('button', { name: String(day) }))
  await user.click(screen.getByRole('button', { name: time }))
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({ advanceTimers: true })
  jest.setSystemTime(new Date('2026-03-15T10:00:00Z'))
  mockSocket.connected = true
  mockSocket.auth = {}
  mockedCreate.mockResolvedValue(newAppointment)
})

afterEach(() => {
  jest.useRealTimers()
})

describe('FollowUpSessionModal', () => {
  it('affiche le junior concerné et présélectionne le format de la session', () => {
    render(<FollowUpSessionModal session={session} onClose={jest.fn()} onCreated={jest.fn()} />)
    expect(screen.getByText('junior1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Texte' })).toHaveClass('bg-primary')
  })

  it('désactive la soumission tant que date et heure ne sont pas choisies', () => {
    render(<FollowUpSessionModal session={session} onClose={jest.fn()} onCreated={jest.fn()} />)
    expect(screen.getByRole('button', { name: /Planifier le rendez-vous/i })).toBeDisabled()
  })

  it('affiche le récapitulatif après sélection', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<FollowUpSessionModal session={session} onClose={jest.fn()} onCreated={jest.fn()} />)
    await pickDateAndTime(user, 20, '14:30')
    expect(screen.getByText(/vendredi 20 mars/)).toBeInTheDocument()
  })

  it('crée le rendez-vous, affiche le succès puis notifie le parent après un délai', async () => {
    const onClose = jest.fn()
    const onCreated = jest.fn()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<FollowUpSessionModal session={session} onClose={onClose} onCreated={onCreated} />)

    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: 'Hybride' }))
    await user.click(screen.getByRole('button', { name: /Planifier le rendez-vous/i }))

    expect(await screen.findByText('Session planifiée avec succès.')).toBeInTheDocument()
    expect(mockedCreate).toHaveBeenCalledWith(30, {
      scheduledAt: expect.stringContaining('2026-03-20T14:30:00'),
      format: 'hybrid',
    })
    expect(onClose).not.toHaveBeenCalled()

    act(() => { jest.advanceTimersByTime(1200) })

    expect(onClose).toHaveBeenCalled()
    expect(onCreated).toHaveBeenCalledWith(newAppointment)
  })

  it('diffuse la proposition dans la conversation quand le socket est connecté', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<FollowUpSessionModal session={session} onClose={jest.fn()} onCreated={jest.fn()} />)

    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: /Planifier le rendez-vous/i }))

    await waitFor(() => expect(mockSocket.emit).toHaveBeenCalledWith('join_conversation', { conversation_id: 'conv-42' }))
    const sendCall = mockSocket.emit.mock.calls.find(([event]) => event === 'send_message')!
    const body = JSON.parse(sendCall[1].body)
    expect(body).toMatchObject({ sessionId: 30, appointmentId: 700 })
  })

  it('reconnecte le socket avant de diffuser si déconnecté', async () => {
    mockSocket.connected = false
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<FollowUpSessionModal session={session} onClose={jest.fn()} onCreated={jest.fn()} />)

    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: /Planifier le rendez-vous/i }))

    await waitFor(() => expect(mockSocket.connect).toHaveBeenCalled())
    expect(mockSocket.auth).toEqual({ token: 'jwt-token', userId: 2 })
    const onceCall = mockSocket.once.mock.calls.find(([event]) => event === 'connect')!

    act(() => { onceCall[1]() })

    expect(mockSocket.emit).toHaveBeenCalledWith('join_conversation', { conversation_id: 'conv-42' })
  })

  it("n'émet rien sur le socket sans conversation associée", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<FollowUpSessionModal session={{ ...session, conversationId: null }} onClose={jest.fn()} onCreated={jest.fn()} />)

    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: /Planifier le rendez-vous/i }))

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled())
    expect(mockSocket.emit).not.toHaveBeenCalled()
  })

  it('reste ouverte et silencieuse si la création échoue', async () => {
    mockedCreate.mockRejectedValueOnce(new Error('boom'))
    const onCreated = jest.fn()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<FollowUpSessionModal session={session} onClose={jest.fn()} onCreated={onCreated} />)

    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: /Planifier le rendez-vous/i }))

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled())
    expect(screen.queryByText('Session planifiée avec succès.')).not.toBeInTheDocument()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('ferme la modale sans créer de rendez-vous au clic sur Annuler', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<FollowUpSessionModal session={session} onClose={onClose} onCreated={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onClose).toHaveBeenCalled()
    expect(mockedCreate).not.toHaveBeenCalled()
  })
})
