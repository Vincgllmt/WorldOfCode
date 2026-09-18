import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MentorSessionRightPanel from '@/components/mentoring/cockpit/MentorSessionRightPanel'
import { getSessionNotes, createSessionNote, deleteSessionNote } from '@/lib/api/mentoring/notes'
import {
  getSessionAppointments,
  deleteSessionAppointment,
  confirmSessionAppointment,
  refuseSessionAppointment,
} from '@/lib/api/mentoring/appointments'
import type { MentoringSession, SessionAppointment } from '@/types/mentoring'

jest.mock('@/lib/api/mentoring/notes', () => ({
  getSessionNotes: jest.fn(),
  createSessionNote: jest.fn(),
  deleteSessionNote: jest.fn(),
}))
jest.mock('@/lib/api/mentoring/appointments', () => ({
  getSessionAppointments: jest.fn(),
  deleteSessionAppointment: jest.fn(),
  confirmSessionAppointment: jest.fn(),
  refuseSessionAppointment: jest.fn(),
}))
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 2, username: 'mentorBob' } }),
}))
jest.mock('@/components/mentoring/cockpit/FollowUpSessionModal', () => ({
  __esModule: true,
  default: ({ onClose, onCreated }: { onClose: () => void; onCreated: (a: SessionAppointment) => void }) => (
    <div data-testid="followup-modal">
      <button
        type="button"
        onClick={() => onCreated({
          id: 999, scheduledAt: '2026-04-01T10:00:00Z', format: 'video', status: 'pending', proposedBy: 'mentor', createdAt: '2026-03-01T10:00:00Z',
        })}
      >
        Créer le rendez-vous
      </button>
      <button type="button" onClick={onClose}>Fermer planification</button>
    </div>
  ),
}))

const mockedGetNotes = getSessionNotes as jest.MockedFunction<typeof getSessionNotes>
const mockedCreateNote = createSessionNote as jest.MockedFunction<typeof createSessionNote>
const mockedDeleteNote = deleteSessionNote as jest.MockedFunction<typeof deleteSessionNote>
const mockedGetAppointments = getSessionAppointments as jest.MockedFunction<typeof getSessionAppointments>
const mockedDeleteAppointment = deleteSessionAppointment as jest.MockedFunction<typeof deleteSessionAppointment>
const mockedConfirmAppt = confirmSessionAppointment as jest.MockedFunction<typeof confirmSessionAppointment>
const mockedRefuseAppt = refuseSessionAppointment as jest.MockedFunction<typeof refuseSessionAppointment>

const baseSession: MentoringSession = {
  id: 20,
  status: 'in_progress',
  format: 'video',
  scheduledAt: '2026-02-01T15:00:00Z',
  startedAt: '2026-02-01T15:05:00Z',
  completedAt: null,
  conversationId: 'conv-42',
  mentor: { id: 2, username: 'mentorBob' },
  junior: { id: 5, username: 'junior1' },
  request: { id: 1, title: 'Bug mémoire', techStack: 'Python', isPublic: false },
  createdAt: '2026-01-05T09:00:00Z',
}

const mentorProposedAppt: SessionAppointment = {
  id: 300,
  scheduledAt: '2026-02-02T10:00:00Z',
  format: 'video',
  status: 'pending',
  proposedBy: 'mentor',
  createdAt: '2026-01-05T09:30:00Z',
}

const juniorCounterAppt: SessionAppointment = {
  id: 301,
  scheduledAt: '2026-02-03T11:00:00Z',
  format: 'video',
  status: 'pending',
  proposedBy: 'junior',
  createdAt: '2026-01-05T09:45:00Z',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetNotes.mockResolvedValue([])
  mockedGetAppointments.mockResolvedValue([])
})

describe('MentorSessionRightPanel', () => {
  it('affiche les informations du junior et de la demande', async () => {
    render(<MentorSessionRightPanel session={baseSession} />)

    expect(screen.getByText('junior1')).toBeInTheDocument()
    expect(screen.getByText('En cours')).toBeInTheDocument()
    expect(screen.getByText('Bug mémoire')).toBeInTheDocument()
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('Ciblée')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ouvrir le chat/i })).toHaveAttribute('href', '/message/conv-42')

    await waitFor(() => expect(mockedGetNotes).toHaveBeenCalledWith(20))
    expect(mockedGetAppointments).toHaveBeenCalledWith(20)
  })

  it("n'affiche pas le lien de chat sans conversation", () => {
    render(<MentorSessionRightPanel session={{ ...baseSession, conversationId: null }} />)
    expect(screen.queryByRole('link', { name: /Ouvrir le chat/i })).not.toBeInTheDocument()
  })

  it('affiche les états vides des notes et rendez-vous', async () => {
    render(<MentorSessionRightPanel session={baseSession} />)
    expect(await screen.findByText('Aucune note pour l\'instant.')).toBeInTheDocument()
    expect(screen.getByText('Aucun rendez-vous planifié.')).toBeInTheDocument()
  })

  it('ajoute une note de type lien', async () => {
    const newNote = {
      id: 500, content: 'https://exemple.fr', type: 'link' as const,
      author: { id: 2, username: 'mentorBob' }, createdAt: '2026-01-06T10:00:00Z',
    }
    mockedCreateNote.mockResolvedValueOnce(newNote)
    const user = userEvent.setup()
    render(<MentorSessionRightPanel session={baseSession} />)

    await user.click(screen.getByRole('button', { name: /Ajouter/i }))
    await user.click(screen.getByRole('button', { name: 'Lien' }))
    await user.type(screen.getByPlaceholderText('https://…'), newNote.content)
    await user.click(screen.getByRole('button', { name: /Enregistrer/i }))

    await waitFor(() => expect(mockedCreateNote).toHaveBeenCalledWith(20, { content: newNote.content, type: 'link' }))
    expect(await screen.findByRole('link', { name: newNote.content })).toBeInTheDocument()
  })

  it('supprime une note existante appartenant au mentor', async () => {
    mockedGetNotes.mockResolvedValue([
      { id: 501, content: 'Ma note', type: 'note', author: { id: 2, username: 'mentorBob' }, createdAt: '2026-01-06T10:00:00Z' },
    ])
    mockedDeleteNote.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<MentorSessionRightPanel session={baseSession} />)

    await screen.findByText('Ma note')
    await user.click(screen.getByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(mockedDeleteNote).toHaveBeenCalledWith(20, 501))
    expect(screen.queryByText('Ma note')).not.toBeInTheDocument()
  })

  it("n'affiche pas de bouton de suppression sur la note d'un autre auteur", async () => {
    mockedGetNotes.mockResolvedValue([
      { id: 502, content: 'Note du junior', type: 'note', author: { id: 5, username: 'junior1' }, createdAt: '2026-01-06T10:00:00Z' },
    ])
    render(<MentorSessionRightPanel session={baseSession} />)

    await screen.findByText('Note du junior')
    expect(screen.queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument()
  })

  it('supprime un rendez-vous proposé par le mentor', async () => {
    mockedGetAppointments.mockResolvedValue([mentorProposedAppt])
    mockedDeleteAppointment.mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<MentorSessionRightPanel session={baseSession} />)

    await screen.findByText('Vidéo')
    await user.click(screen.getByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(mockedDeleteAppointment).toHaveBeenCalledWith(20, 300))
    expect(screen.getByText('Aucun rendez-vous planifié.')).toBeInTheDocument()
  })

  it('affiche une contre-proposition du junior et permet de la confirmer', async () => {
    mockedGetAppointments.mockResolvedValue([juniorCounterAppt])
    mockedConfirmAppt.mockResolvedValueOnce({ ...juniorCounterAppt, status: 'confirmed' })
    const user = userEvent.setup()
    render(<MentorSessionRightPanel session={baseSession} />)

    expect(await screen.findByText('Contre-proposition du junior')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Confirmer/i }))

    await waitFor(() => expect(mockedConfirmAppt).toHaveBeenCalledWith(20, 301))
    expect(await screen.findByText('Confirmé')).toBeInTheDocument()
  })

  it('refuse une contre-proposition du junior', async () => {
    mockedGetAppointments.mockResolvedValue([juniorCounterAppt])
    mockedRefuseAppt.mockResolvedValueOnce({ ...juniorCounterAppt, status: 'refused' })
    const user = userEvent.setup()
    render(<MentorSessionRightPanel session={baseSession} />)

    await screen.findByText('Contre-proposition du junior')
    await user.click(screen.getByRole('button', { name: /Refuser/i }))

    await waitFor(() => expect(mockedRefuseAppt).toHaveBeenCalledWith(20, 301))
    expect(await screen.findByText('Refusé')).toBeInTheDocument()
  })

  it('ouvre la planification de rendez-vous et ajoute le rendez-vous créé', async () => {
    const user = userEvent.setup()
    render(<MentorSessionRightPanel session={baseSession} />)

    await user.click(screen.getByRole('button', { name: /Planifier/i }))
    expect(screen.getByTestId('followup-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Créer le rendez-vous' }))

    expect(screen.queryByTestId('followup-modal')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Aucun rendez-vous planifié.')).not.toBeInTheDocument())
  })
})
