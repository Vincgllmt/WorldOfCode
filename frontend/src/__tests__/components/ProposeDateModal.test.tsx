import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProposeDateModal from '@/components/mentoring/cockpit/ProposeDateModal'
import { socket } from '@/lib/socket'

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

const mockSocket = socket as unknown as {
  connected: boolean
  auth: Record<string, unknown>
  emit: jest.Mock
  once: jest.Mock
  connect: jest.Mock
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
})

afterEach(() => {
  jest.useRealTimers()
})

describe('ProposeDateModal', () => {
  it('affiche le destinataire et le mois courant', () => {
    render(<ProposeDateModal conversationId="conv-1" sessionId={1} juniorUsername="junior1" onClose={jest.fn()} />)
    expect(screen.getByText('junior1')).toBeInTheDocument()
    expect(screen.getByText(/Mars 2026/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mois précédent' })).toBeDisabled()
  })

  it('désactive Envoyer tant que date/heure ne sont pas choisies', () => {
    render(<ProposeDateModal conversationId="conv-1" sessionId={1} juniorUsername="junior1" onClose={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled()
  })

  it('affiche le récapitulatif après sélection', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<ProposeDateModal conversationId="conv-1" sessionId={1} juniorUsername="junior1" onClose={jest.fn()} />)
    await pickDateAndTime(user, 20, '14:30')
    expect(screen.getByText(/vendredi 20 mars/)).toBeInTheDocument()
  })

  it('envoie la proposition via socket avec la note puis ferme immédiatement', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<ProposeDateModal conversationId="conv-1" sessionId={1} juniorUsername="junior1" onClose={onClose} />)

    await pickDateAndTime(user, 20, '14:30')
    await user.type(screen.getByLabelText(/Message complémentaire/i), 'On commence par les bases')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(mockSocket.emit).toHaveBeenCalledWith('join_conversation', { conversation_id: 'conv-1' })
    const sendCall = mockSocket.emit.mock.calls.find(([event]) => event === 'send_message')!
    expect(sendCall[1]).toMatchObject({ conversation_id: 'conv-1', type: 'session_proposal' })
    const body = JSON.parse(sendCall[1].body)
    expect(body).toMatchObject({ sessionId: 1, note: 'On commence par les bases' })
    expect(onClose).toHaveBeenCalled()
  })

  it('envoie une note nulle si le champ est vide', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<ProposeDateModal conversationId="conv-1" sessionId={1} juniorUsername="junior1" onClose={jest.fn()} />)

    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    const sendCall = mockSocket.emit.mock.calls.find(([event]) => event === 'send_message')!
    expect(JSON.parse(sendCall[1].body).note).toBeNull()
  })

  it('reconnecte le socket avant d\'envoyer si déconnecté', async () => {
    mockSocket.connected = false
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<ProposeDateModal conversationId="conv-1" sessionId={1} juniorUsername="junior1" onClose={jest.fn()} />)

    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))

    expect(mockSocket.auth).toEqual({ token: 'jwt-token', userId: 2 })
    expect(mockSocket.connect).toHaveBeenCalled()
    const onceCall = mockSocket.once.mock.calls.find(([event]) => event === 'connect')!

    act(() => { onceCall[1]() })

    await waitFor(() => expect(mockSocket.emit).toHaveBeenCalledWith('join_conversation', { conversation_id: 'conv-1' }))
  })

  it('navigue vers le mois suivant', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<ProposeDateModal conversationId="conv-1" sessionId={1} juniorUsername="junior1" onClose={jest.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Mois suivant' }))
    expect(screen.getByText(/Avril 2026/)).toBeInTheDocument()
  })

  it('ferme la modale sans envoyer au clic sur Annuler', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<ProposeDateModal conversationId="conv-1" sessionId={1} juniorUsername="junior1" onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onClose).toHaveBeenCalled()
    expect(mockSocket.emit).not.toHaveBeenCalled()
  })
})
