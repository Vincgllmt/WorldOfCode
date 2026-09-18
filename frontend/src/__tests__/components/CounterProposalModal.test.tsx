import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CounterProposalModal from '@/components/mentoring/request/CounterProposalModal'
import { socket } from '@/lib/socket'

jest.mock('@/lib/socket', () => ({
  socket: {
    connected: true,
    auth: {} as Record<string, unknown>,
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    connect: jest.fn(),
  },
}))

// Réutilise l'objet mocké (référence stable) plutôt qu'une variable externe :
// le factory de jest.mock ne peut pas fermer sur une const définie plus bas
// dans ce fichier (elle serait encore dans sa zone morte au moment du require).
const mockSocket = socket as unknown as {
  connected: boolean
  auth: Record<string, unknown>
  emit: jest.Mock
  on: jest.Mock
  off: jest.Mock
  once: jest.Mock
  connect: jest.Mock
}

let mockUser: { id: number; username: string; token: string } | null = { id: 1, username: 'junior1', token: 'jwt-token' }
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

function getAckHandler(): (ack: { temp_id?: string; error?: string }) => void {
  const call = mockSocket.on.mock.calls.find(([event]) => event === 'ack')
  if (!call) throw new Error('ack handler not registered')
  return call[1]
}

async function pickDateAndTime(user: ReturnType<typeof userEvent.setup>, day: number, time: string) {
  await user.click(screen.getByRole('button', { name: String(day) }))
  await user.click(screen.getByRole('button', { name: time }))
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers({ advanceTimers: true })
  mockSocket.connected = true
  mockSocket.auth = {}
  mockUser = { id: 1, username: 'junior1', token: 'jwt-token' }
  jest.setSystemTime(new Date('2026-03-15T10:00:00Z'))
})

afterEach(() => {
  jest.useRealTimers()
})

describe('CounterProposalModal', () => {
  it('affiche le mois courant et désactive la navigation vers le passé', () => {
    render(<CounterProposalModal conversationId="conv-1" sessionId={10} onClose={jest.fn()} />)

    expect(screen.getByText(/Mars 2026/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mois précédent' })).toBeDisabled()
  })

  it('navigue vers le mois suivant', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<CounterProposalModal conversationId="conv-1" sessionId={10} onClose={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Mois suivant' }))

    expect(screen.getByText(/Avril 2026/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mois précédent' })).toBeEnabled()
  })

  it('désactive le bouton d\'envoi tant que date/heure ne sont pas choisies', () => {
    render(<CounterProposalModal conversationId="conv-1" sessionId={10} onClose={jest.fn()} />)
    expect(screen.getByRole('button', { name: /Envoyer ma contre-proposition/i })).toBeDisabled()
  })

  it("affiche les créneaux horaires après sélection d'un jour", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<CounterProposalModal conversationId="conv-1" sessionId={10} onClose={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: '20' }))

    expect(screen.getByText('Heure')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '08:00' })).toBeInTheDocument()
  })

  it('affiche un récapitulatif formaté une fois date et heure choisies', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<CounterProposalModal conversationId="conv-1" sessionId={10} onClose={jest.fn()} />)

    await pickDateAndTime(user, 20, '14:30')

    expect(screen.getByText(/vendredi 20 mars 2026.*14:30/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Envoyer ma contre-proposition/i })).toBeEnabled()
  })

  it('envoie la contre-proposition via socket et ferme la modale sur accusé de succès', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<CounterProposalModal conversationId="conv-1" sessionId={10} onClose={onClose} />)

    await pickDateAndTime(user, 20, '14:30')
    await user.type(screen.getByLabelText(/Message complémentaire/i), 'Dispo à partir de 14h')
    await user.click(screen.getByRole('button', { name: /Envoyer ma contre-proposition/i }))

    expect(mockSocket.emit).toHaveBeenCalledWith('join_conversation', { conversation_id: 'conv-1' })
    const sendCall = mockSocket.emit.mock.calls.find(([event]) => event === 'send_message')!
    expect(sendCall[1]).toMatchObject({ conversation_id: 'conv-1', type: 'session_counter_proposal' })
    const body = JSON.parse(sendCall[1].body)
    expect(body).toMatchObject({ sessionId: 10, note: 'Dispo à partir de 14h' })

    act(() => {
      getAckHandler()({ temp_id: sendCall[1].temp_id })
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('affiche une erreur si le serveur renvoie un accusé en échec', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<CounterProposalModal conversationId="conv-1" sessionId={10} onClose={jest.fn()} />)

    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: /Envoyer ma contre-proposition/i }))

    const sendCall = mockSocket.emit.mock.calls.find(([event]) => event === 'send_message')!
    act(() => {
      getAckHandler()({ temp_id: sendCall[1].temp_id, error: 'boom' })
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(/a échoué/i)
  })

  it("affiche une erreur si aucun accusé n'arrive avant le délai", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<CounterProposalModal conversationId="conv-1" sessionId={10} onClose={jest.fn()} />)

    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: /Envoyer ma contre-proposition/i }))

    act(() => {
      jest.advanceTimersByTime(8000)
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(/Aucune réponse de la messagerie/i)
  })

  it('affiche une erreur immédiate si la messagerie est déconnectée et l\'utilisateur inconnu', async () => {
    mockSocket.connected = false
    mockUser = null
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<CounterProposalModal conversationId="conv-1" sessionId={10} onClose={jest.fn()} />)

    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: /Envoyer ma contre-proposition/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Connexion à la messagerie indisponible/i)
    expect(mockSocket.emit).not.toHaveBeenCalled()
  })

  it('reconnecte le socket puis envoie le message une fois connecté', async () => {
    mockSocket.connected = false
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<CounterProposalModal conversationId="conv-1" sessionId={10} onClose={jest.fn()} />)

    await pickDateAndTime(user, 20, '14:30')
    await user.click(screen.getByRole('button', { name: /Envoyer ma contre-proposition/i }))

    expect(mockSocket.auth).toEqual({ token: 'jwt-token', userId: 1 })
    expect(mockSocket.connect).toHaveBeenCalled()
    const onceCall = mockSocket.once.mock.calls.find(([event]) => event === 'connect')!

    act(() => {
      onceCall[1]()
    })

    expect(mockSocket.emit).toHaveBeenCalledWith('join_conversation', { conversation_id: 'conv-1' })
  })

  it('ferme la modale au clic sur Annuler ou sur la croix', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<CounterProposalModal conversationId="conv-1" sessionId={10} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(screen.getByLabelText('Fermer'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
