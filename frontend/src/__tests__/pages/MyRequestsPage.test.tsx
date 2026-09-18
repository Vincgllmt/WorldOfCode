import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyRequestsPage from '@/app/mentoring/my-requests/page'
import { getMentoringRequestsMine, makeRequestPublic, cancelMentoringRequest } from '@/lib/api/mentoring/requests'
import { getJuniorStats } from '@/lib/api/mentoring/junior'
import { getJuniorSessions } from '@/lib/api/mentoring/sessions'
import { getSessionNotes, createSessionNote, deleteSessionNote } from '@/lib/api/mentoring/notes'
import {
  getSessionAppointments,
  confirmSessionAppointment,
  refuseSessionAppointment,
} from '@/lib/api/mentoring/appointments'
import type { MentoringRequest, MentoringSession, SessionAppointment } from '@/types/mentoring'

jest.mock('@/lib/api/mentoring/requests', () => ({
  getMentoringRequestsMine: jest.fn(),
  makeRequestPublic: jest.fn(),
  cancelMentoringRequest: jest.fn(),
}))
jest.mock('@/lib/api/mentoring/junior', () => ({
  getJuniorStats: jest.fn(),
}))
jest.mock('@/lib/api/mentoring/sessions', () => ({
  getJuniorSessions: jest.fn(),
}))
jest.mock('@/lib/api/mentoring/notes', () => ({
  getSessionNotes: jest.fn(),
  createSessionNote: jest.fn(),
  deleteSessionNote: jest.fn(),
}))
jest.mock('@/lib/api/mentoring/appointments', () => ({
  getSessionAppointments: jest.fn(),
  confirmSessionAppointment: jest.fn(),
  refuseSessionAppointment: jest.fn(),
}))
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 5, username: 'junior1' } }),
}))
jest.mock('@/components/mentoring/request/AppointmentCounterModal', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="counter-modal">
      <button type="button" onClick={onClose}>Fermer la modale</button>
    </div>
  ),
}))

const mockReplace = jest.fn()
let mockSearchParams = new URLSearchParams()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}))

const mockedGetRequests = getMentoringRequestsMine as jest.MockedFunction<typeof getMentoringRequestsMine>
const mockedGetSessions = getJuniorSessions as jest.MockedFunction<typeof getJuniorSessions>
const mockedGetStats = getJuniorStats as jest.MockedFunction<typeof getJuniorStats>
const mockedMakePublic = makeRequestPublic as jest.MockedFunction<typeof makeRequestPublic>
const mockedCancel = cancelMentoringRequest as jest.MockedFunction<typeof cancelMentoringRequest>
const mockedGetNotes = getSessionNotes as jest.MockedFunction<typeof getSessionNotes>
const mockedCreateNote = createSessionNote as jest.MockedFunction<typeof createSessionNote>
const mockedDeleteNote = deleteSessionNote as jest.MockedFunction<typeof deleteSessionNote>
const mockedGetAppointments = getSessionAppointments as jest.MockedFunction<typeof getSessionAppointments>
const mockedConfirmAppt = confirmSessionAppointment as jest.MockedFunction<typeof confirmSessionAppointment>
const mockedRefuseAppt = refuseSessionAppointment as jest.MockedFunction<typeof refuseSessionAppointment>

const pendingRequest: MentoringRequest = {
  id: 1,
  type: 'debug',
  status: 'pending',
  title: 'Bug mémoire',
  techStack: 'Python',
  description: 'Une segfault étrange sur le service de paiement.',
  blockedSince: null,
  alreadyTried: null,
  expectedBehavior: null,
  observedBehavior: null,
  codeSnippet: null,
  codeLanguage: null,
  isPublic: false,
  isTargeted: false,
  compatibilityScore: 0,
  junior: { id: 5, username: 'junior1' },
  createdAt: '2026-01-05T10:00:00Z',
}

const scheduledSession: MentoringSession = {
  id: 10,
  status: 'scheduled',
  format: 'video',
  scheduledAt: '2026-02-01T15:00:00Z',
  startedAt: null,
  completedAt: null,
  conversationId: 'conv-1',
  mentor: { id: 2, username: 'mentorBob' },
  junior: { id: 5, username: 'junior1' },
  request: null,
  createdAt: '2026-01-05T09:00:00Z',
}

const stats = {
  totalSessions: 3,
  activeSessions: 1,
  completedSessions: 2,
  totalMentors: 2,
  totalRequests: 4,
  averageRating: 4.5,
}

const pendingAppointment: SessionAppointment = {
  id: 200,
  scheduledAt: '2026-02-02T10:00:00Z',
  format: 'video',
  status: 'pending',
  proposedBy: 'mentor',
  createdAt: '2026-01-05T09:30:00Z',
}

function setUpDefaults() {
  mockedGetRequests.mockResolvedValue([pendingRequest])
  mockedGetSessions.mockResolvedValue([scheduledSession])
  mockedGetStats.mockResolvedValue(stats)
  mockedGetNotes.mockResolvedValue([])
  mockedGetAppointments.mockResolvedValue([])
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSearchParams = new URLSearchParams()
  setUpDefaults()
})

describe('MyRequestsPage', () => {
  it("affiche le chargement puis l'en-tête une fois les données arrivées", async () => {
    render(<MyRequestsPage />)

    expect(screen.getByText('Chargement...')).toBeInTheDocument()

    expect(await screen.findByText('Mon espace junior')).toBeInTheDocument()
    expect(mockedGetRequests).toHaveBeenCalled()
    expect(mockedGetSessions).toHaveBeenCalled()
    expect(mockedGetStats).toHaveBeenCalled()
  })

  it('affiche une erreur si le chargement échoue', async () => {
    mockedGetRequests.mockRejectedValueOnce(new Error('boom'))

    render(<MyRequestsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/Impossible de charger vos données/i)
  })

  it("affiche l'état vide quand il n'y a ni demande ni session", async () => {
    mockedGetRequests.mockResolvedValue([])
    mockedGetSessions.mockResolvedValue([])

    render(<MyRequestsPage />)

    expect(await screen.findByText(/Aucune demande ni session pour l'instant/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Créez une demande de mentorat/i })).toBeInTheDocument()
  })

  it("affiche le bandeau de succès quand l'URL contient created=1", async () => {
    mockSearchParams = new URLSearchParams('created=1')

    render(<MyRequestsPage />)

    expect(await screen.findByRole('status')).toHaveTextContent(/soumise avec succès/i)
  })

  it('regroupe les demandes et sessions, puis affiche le détail d\'une demande sélectionnée', async () => {
    const user = userEvent.setup()
    render(<MyRequestsPage />)

    await screen.findByText('Mon espace junior')

    expect(screen.getByText('En attente', { selector: 'p', exact: false })).toBeInTheDocument()
    expect(screen.getByText('Planifiées', { selector: 'p', exact: false })).toBeInTheDocument()

    await user.click(screen.getByText('Bug mémoire'))

    const main = within(await screen.findByRole('main'))
    expect(await main.findByRole('heading', { name: 'Bug mémoire' })).toBeInTheDocument()
    expect(main.getByText(/segfault étrange/i)).toBeInTheDocument()
    expect(main.getByRole('button', { name: /Rendre publique/i })).toBeInTheDocument()
    expect(main.getByRole('button', { name: /Annuler la demande/i })).toBeInTheDocument()
  })

  it('annule une demande depuis le panneau de détail', async () => {
    mockedCancel.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<MyRequestsPage />)

    await user.click(await screen.findByText('Bug mémoire'))
    const main = within(await screen.findByRole('main'))
    await user.click(await main.findByRole('button', { name: /Annuler la demande/i }))

    await waitFor(() => expect(mockedCancel).toHaveBeenCalledWith(1))
    expect(main.queryByRole('button', { name: /Annuler la demande/i })).not.toBeInTheDocument()
  })

  it('rend une demande publique (escalade)', async () => {
    mockedMakePublic.mockResolvedValueOnce({ ...pendingRequest, isPublic: true })
    const user = userEvent.setup()
    render(<MyRequestsPage />)

    await user.click(await screen.findByText('Bug mémoire'))
    const main = within(await screen.findByRole('main'))
    await user.click(await main.findByRole('button', { name: /Rendre publique/i }))

    await waitFor(() => expect(mockedMakePublic).toHaveBeenCalledWith(1))
    expect(main.queryByRole('button', { name: /Rendre publique/i })).not.toBeInTheDocument()
  })

  it('sélectionne une session et affiche ses rendez-vous', async () => {
    mockedGetAppointments.mockResolvedValue([pendingAppointment])
    const user = userEvent.setup()
    render(<MyRequestsPage />)

    await user.click(await screen.findByText('Session avec mentorBob'))
    const main = within(await screen.findByRole('main'))

    await waitFor(() => expect(mockedGetNotes).toHaveBeenCalledWith(10))
    expect(mockedGetAppointments).toHaveBeenCalledWith(10)
    expect(await main.findByRole('button', { name: /Confirmer/i })).toBeInTheDocument()
    expect(main.getByRole('button', { name: /Refuser/i })).toBeInTheDocument()
  })

  it("affiche les états vides des notes et rendez-vous d'une session", async () => {
    const user = userEvent.setup()
    render(<MyRequestsPage />)

    await user.click(await screen.findByText('Session avec mentorBob'))
    const main = within(await screen.findByRole('main'))

    expect(await main.findByText(/Aucun rendez-vous proposé/i)).toBeInTheDocument()
    expect(main.getByText(/Aucune note pour l'instant/i)).toBeInTheDocument()
  })

  it('ajoute une note à la session', async () => {
    const newNote = {
      id: 101,
      content: 'Voir https://exemple.fr/doc',
      type: 'link' as const,
      author: { id: 5, username: 'junior1' },
      createdAt: '2026-01-06T10:00:00Z',
    }
    mockedCreateNote.mockResolvedValueOnce(newNote)
    const user = userEvent.setup()
    render(<MyRequestsPage />)

    await user.click(await screen.findByText('Session avec mentorBob'))
    const main = within(await screen.findByRole('main'))
    await user.click(await main.findByRole('button', { name: /Ajouter/i }))
    await user.click(main.getByRole('button', { name: 'Lien' }))
    await user.type(main.getByPlaceholderText('https://…'), newNote.content)
    await user.click(main.getByRole('button', { name: /Enregistrer/i }))

    await waitFor(() =>
      expect(mockedCreateNote).toHaveBeenCalledWith(10, { content: newNote.content, type: 'link' }),
    )
    expect(await main.findByRole('link', { name: 'https://exemple.fr/doc' })).toBeInTheDocument()
  })

  it('supprime une note existante', async () => {
    mockedGetNotes.mockResolvedValue([
      { id: 100, content: 'Ma note', type: 'note', author: { id: 5, username: 'junior1' }, createdAt: '2026-01-06T10:00:00Z' },
    ])
    mockedDeleteNote.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<MyRequestsPage />)

    await user.click(await screen.findByText('Session avec mentorBob'))
    const main = within(await screen.findByRole('main'))
    await main.findByText('Ma note')

    await user.click(main.getByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(mockedDeleteNote).toHaveBeenCalledWith(10, 100))
    expect(main.queryByText('Ma note')).not.toBeInTheDocument()
  })

  it('confirme un rendez-vous proposé', async () => {
    mockedGetAppointments.mockResolvedValue([pendingAppointment])
    mockedConfirmAppt.mockResolvedValueOnce({ ...pendingAppointment, status: 'confirmed' })
    const user = userEvent.setup()
    render(<MyRequestsPage />)

    await user.click(await screen.findByText('Session avec mentorBob'))
    const main = within(await screen.findByRole('main'))
    await user.click(await main.findByRole('button', { name: /Confirmer/i }))

    await waitFor(() => expect(mockedConfirmAppt).toHaveBeenCalledWith(10, 200))
    expect(await main.findByText('Confirmé')).toBeInTheDocument()
  })

  it('refuse un rendez-vous proposé', async () => {
    mockedGetAppointments.mockResolvedValue([pendingAppointment])
    mockedRefuseAppt.mockResolvedValueOnce({ ...pendingAppointment, status: 'refused' })
    const user = userEvent.setup()
    render(<MyRequestsPage />)

    await user.click(await screen.findByText('Session avec mentorBob'))
    const main = within(await screen.findByRole('main'))
    await user.click(await main.findByRole('button', { name: /Refuser/i }))

    await waitFor(() => expect(mockedRefuseAppt).toHaveBeenCalledWith(10, 200))
    expect(await main.findByText('Refusé')).toBeInTheDocument()
  })

  it('ouvre la modale de contre-proposition depuis un rendez-vous en attente', async () => {
    mockedGetAppointments.mockResolvedValue([pendingAppointment])
    const user = userEvent.setup()
    render(<MyRequestsPage />)

    await user.click(await screen.findByText('Session avec mentorBob'))
    const main = within(await screen.findByRole('main'))
    await user.click(await main.findByRole('button', { name: /Autre date/i }))

    expect(screen.getAllByTestId('counter-modal')[0]).toBeInTheDocument()
  })

  it('présélectionne une session à partir des query params', async () => {
    mockSearchParams = new URLSearchParams('session=10')

    render(<MyRequestsPage />)
    const main = within(await screen.findByRole('main'))

    expect(await main.findByRole('heading', { name: 'Session avec mentorBob' })).toBeInTheDocument()
    expect(mockedGetNotes).toHaveBeenCalledWith(10)
  })

  it('présélectionne une demande à partir des query params', async () => {
    mockSearchParams = new URLSearchParams('request=1')

    render(<MyRequestsPage />)
    const main = within(await screen.findByRole('main'))

    expect(await main.findByRole('button', { name: /Annuler la demande/i })).toBeInTheDocument()
  })
})
