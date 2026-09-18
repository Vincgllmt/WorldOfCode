import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AppointmentCounterModal from '@/components/mentoring/request/AppointmentCounterModal'
import { createSessionAppointment, refuseSessionAppointment } from '@/lib/api/mentoring/appointments'
import { socket } from '@/lib/socket'

jest.mock('@/lib/api/mentoring/appointments', () => ({
  createSessionAppointment: jest.fn(),
  refuseSessionAppointment: jest.fn(),
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
  useAuth: () => ({ user: { id: 1, username: 'junior1', token: 'jwt-token' } }),
}))

const mockedCreate = createSessionAppointment as jest.MockedFunction<typeof createSessionAppointment>
const mockedRefuse = refuseSessionAppointment as jest.MockedFunction<typeof refuseSessionAppointment>
const mockSocket = socket as unknown as {
  connected: boolean
  auth: Record<string, unknown>
  emit: jest.Mock
  once: jest.Mock
  connect: jest.Mock
}

const newAppointment = {
  id: 500,
  scheduledAt: '2026-03-20T14:30:00Z',
  format: 'video' as const,
  status: 'pending' as const,
  proposedBy: 'junior' as const,
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
  mockedRefuse.mockResolvedValue({} as any)
  mockedCreate.mockResolvedValue(newAppointment)
})

afterEach(() => {
  jest.useRealTimers()
})

describe('AppointmentCounterModal', () => {
  it('affiche le mois courant et désactive la navigation vers le passé', () => {
    render(
      <AppointmentCounterModal sessionId={1} originalAppointmentId={99} conversationId="conv-1" defaultFormat="video" onClose={jest.fn()} onCreated={jest.fn()} />,
    )
    expect(screen.getByText(/Mars 2026/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mois précédent' })).toBeDisabled()
  })

  it('présélectionne le format par défaut', () => {
    render(
      <AppointmentCounterModal sessionId={1} originalAppointmentId={99} conversationId="conv-1" defaultFormat="text" onClose={jest.fn()} onCreated={jest.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Texte' })).toHaveClass('bg-amber-500')
  })

  it('change de format au clic', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <AppointmentCounterModal sessionId={1} originalAppointmentId={99} conversationId="conv-1" defaultFormat="video" onClose={jest.fn()} onCreated={jest.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: 'Hybride' }))
    expect(screen.getByRole('button', { name: 'Hybride' })).toHaveClass('bg-amber-500')
    expect(screen.getByRole('button', { name: 'Vidéo' })).not.toHaveClass('bg-amber-500')
  })

  it('désactive la soumission tant que date et heure ne sont pas choisies', () => {
    render(
      <AppointmentCounterModal sessionId={1} originalAppointmentId={99} conversationId="conv-1" defaultFormat="video" onClose={jest.fn()} onCreated={jest.fn()} />,
    )
    expect(screen.getByRole('button', { name: /Proposer cette date/i })).toBeDisabled()
  })

  it('affiche le récapitulatif après sélection de la date et de l\'heure', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <AppointmentCounterModal sessionId={1} originalAppointmentId={99} conversationId="conv-1" defaultFormat="video" onClose={jest.fn()} onCreated={jest.fn()} />,
    )
    await pickDateAndTime(user, 20, '14:30')
    expect(screen.getByText(/vendredi 20 mars/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Proposer cette date/i })).toBeEnabled()
  })

  it('refuse le rendez-vous original puis crée la contre-proposition', async () => {
    const onClose = jest.fn()
    const onCreated = jest.fn()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <AppointmentCounterModal sessionId={1} originalAppointmentId={99} conversationId="conv-1" defaultFormat="video" onClose={onClose} onCreated={onCreated} />,
    )

    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: /Proposer cette date/i }))

    await waitFor(() => expect(mockedRefuse).toHaveBeenCalledWith(1, 99))
    expect(mockedCreate).toHaveBeenCalledWith(1, {
      scheduledAt: expect.stringContaining('2026-03-20T14:30:00'),
      format: 'video',
    })
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(newAppointment))
    expect(onClose).toHaveBeenCalled()
  })

  it('émet la proposition via socket quand connecté', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <AppointmentCounterModal sessionId={1} originalAppointmentId={99} conversationId="conv-1" defaultFormat="video" onClose={jest.fn()} onCreated={jest.fn()} />,
    )
    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: /Proposer cette date/i }))

    await waitFor(() => expect(mockSocket.emit).toHaveBeenCalledWith('join_conversation', { conversation_id: 'conv-1' }))
    const sendCall = mockSocket.emit.mock.calls.find(([event]) => event === 'send_message')!
    const body = JSON.parse(sendCall[1].body)
    expect(body).toMatchObject({ sessionId: 1, appointmentId: 500 })
  })

  it('reconnecte le socket puis émet la proposition quand déconnecté', async () => {
    mockSocket.connected = false
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <AppointmentCounterModal sessionId={1} originalAppointmentId={99} conversationId="conv-1" defaultFormat="video" onClose={jest.fn()} onCreated={jest.fn()} />,
    )
    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: /Proposer cette date/i }))

    await waitFor(() => expect(mockSocket.connect).toHaveBeenCalled())
    expect(mockSocket.auth).toEqual({ token: 'jwt-token', userId: 1 })
    const onceCall = mockSocket.once.mock.calls.find(([event]) => event === 'connect')!

    act(() => { onceCall[1]() })

    expect(mockSocket.emit).toHaveBeenCalledWith('join_conversation', { conversation_id: 'conv-1' })
  })

  it('reste ouverte et silencieuse si la création du rendez-vous échoue', async () => {
    mockedCreate.mockRejectedValueOnce(new Error('boom'))
    const onClose = jest.fn()
    const onCreated = jest.fn()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <AppointmentCounterModal sessionId={1} originalAppointmentId={99} conversationId="conv-1" defaultFormat="video" onClose={onClose} onCreated={onCreated} />,
    )
    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: /Proposer cette date/i }))

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled())
    expect(onCreated).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ferme la modale sans action au clic sur Annuler ou la croix', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(
      <AppointmentCounterModal sessionId={1} originalAppointmentId={99} conversationId="conv-1" defaultFormat="video" onClose={onClose} onCreated={jest.fn()} />,
    )
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(screen.getByLabelText('Fermer'))
    expect(onClose).toHaveBeenCalledTimes(2)
    expect(mockedCreate).not.toHaveBeenCalled()
  })
})
