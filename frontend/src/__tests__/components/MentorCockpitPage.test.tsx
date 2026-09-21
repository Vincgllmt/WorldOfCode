import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MentorCockpitPage from '@/components/mentoring/cockpit/MentorCockpitPage'
import { getMentorActiveSessions } from '@/lib/api/mentoring/sessions'
import type { MentorProfile, MentoringRequest, MentoringSession } from '@/types/mentoring'

const mockReplace = jest.fn()
let mockSearchParams = new URLSearchParams()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}))

jest.mock('@/lib/api/mentoring/sessions', () => ({
  getMentorActiveSessions: jest.fn(),
}))

jest.mock('@/components/mentoring/cockpit/MentorSidebar', () => ({
  __esModule: true,
  default: ({ activeSessions, onSessionUpdate }: { activeSessions: MentoringSession[]; onSessionUpdate: () => void }) => (
    <div data-testid="mentor-sidebar">
      sessions:{activeSessions.length}
      <button onClick={onSessionUpdate}>sidebar-refresh</button>
    </div>
  ),
}))
jest.mock('@/components/mentoring/cockpit/MentorFeed', () => ({
  __esModule: true,
  default: ({
    mentorProfile,
    onSelectRequest,
    onSessionAccepted,
  }: {
    mentorProfile: MentorProfile
    onSelectRequest: (r: MentoringRequest) => void
    onSessionAccepted?: () => void
  }) => (
    <div data-testid="mentor-feed">
      bio:{mentorProfile.mentorBio ?? 'none'}
      <button onClick={() => onSelectRequest({ id: 42 } as MentoringRequest)}>select-request</button>
      <button onClick={onSessionAccepted}>feed-session-accepted</button>
    </div>
  ),
}))
jest.mock('@/components/mentoring/cockpit/MentorRightPanel', () => ({
  __esModule: true,
  default: ({ request }: { request: MentoringRequest }) => (
    <div data-testid="mentor-right-panel">{request.id}</div>
  ),
}))
jest.mock('@/components/mentoring/cockpit/MentorSessionsFeed', () => ({
  __esModule: true,
  default: ({ onSelectSession }: { onSelectSession: (s: MentoringSession) => void }) => (
    <div data-testid="mentor-sessions-feed">
      <button onClick={() => onSelectSession({ id: 7 } as MentoringSession)}>select-session</button>
    </div>
  ),
}))
jest.mock('@/components/mentoring/cockpit/MentorSessionRightPanel', () => ({
  __esModule: true,
  default: ({ session }: { session: MentoringSession }) => (
    <div data-testid="mentor-session-right-panel">{session.id}</div>
  ),
}))
jest.mock('@/components/mentoring/cockpit/ModeToggle', () => ({
  __esModule: true,
  default: ({ isAvailable, onToggle }: { isAvailable: boolean; onToggle: (v: boolean) => void }) => (
    <button onClick={() => onToggle(!isAvailable)}>mode-toggle-{isAvailable ? 'on' : 'off'}</button>
  ),
}))
jest.mock('@/components/mentoring/cockpit/MentorProfileEditModal', () => ({
  __esModule: true,
  default: ({ profile, onSaved }: { profile: MentorProfile; onSaved: (p: MentorProfile) => void }) => (
    <button onClick={() => onSaved({ ...profile, mentorBio: 'updated' })}>save-profile</button>
  ),
}))

const mockedGetMentorActiveSessions = getMentorActiveSessions as jest.MockedFunction<typeof getMentorActiveSessions>

const profile: MentorProfile = {
  id: 1,
  isAvailable: false,
  teachingStyle: null,
  maxActiveMentees: 3,
  mentorBio: null,
  specialties: [],
  averageRating: null,
  reliabilityRate: null,
  totalSessions: 0,
  createdAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSearchParams = new URLSearchParams()
  mockedGetMentorActiveSessions.mockResolvedValue([])
})

describe('MentorCockpitPage', () => {
  it("affiche l'onglet Demandes actif par défaut", async () => {
    render(<MentorCockpitPage initialProfile={profile} />)
    expect(screen.getByTestId('mentor-feed')).toBeInTheDocument()
    expect(screen.queryByTestId('mentor-sessions-feed')).not.toBeInTheDocument()
    await waitFor(() => expect(mockedGetMentorActiveSessions).toHaveBeenCalled())
  })

  it("affiche l'onglet Sessions actif quand l'URL contient tab=sessions", () => {
    mockSearchParams = new URLSearchParams('tab=sessions')
    render(<MentorCockpitPage initialProfile={profile} />)

    expect(screen.getByTestId('mentor-sessions-feed')).toBeInTheDocument()
    expect(screen.queryByTestId('mentor-feed')).not.toBeInTheDocument()
  })

  it('bascule vers Sessions au clic et met à jour l\'URL', async () => {
    const user = userEvent.setup()
    render(<MentorCockpitPage initialProfile={profile} />)

    await user.click(screen.getByRole('button', { name: 'Sessions' }))

    expect(screen.getByTestId('mentor-sessions-feed')).toBeInTheDocument()
    expect(screen.queryByTestId('mentor-feed')).not.toBeInTheDocument()
    expect(mockReplace).toHaveBeenCalledWith('?tab=sessions', { scroll: false })
  })

  it('affiche le panneau de droite pour la demande sélectionnée et met à jour l\'URL', async () => {
    const user = userEvent.setup()
    render(<MentorCockpitPage initialProfile={profile} />)

    await user.click(screen.getByText('select-request'))

    expect(screen.getByTestId('mentor-right-panel')).toHaveTextContent('42')
    expect(mockReplace).toHaveBeenCalledWith('?tab=requests&request=42', { scroll: false })
  })

  it('affiche le panneau de droite pour la session sélectionnée et met à jour l\'URL', async () => {
    mockSearchParams = new URLSearchParams('tab=sessions')
    const user = userEvent.setup()
    render(<MentorCockpitPage initialProfile={profile} />)

    await user.click(screen.getByText('select-session'))

    expect(screen.getByTestId('mentor-session-right-panel')).toHaveTextContent('7')
    expect(mockReplace).toHaveBeenCalledWith('?tab=sessions&session=7', { scroll: false })
  })

  it('réinitialise la sélection en changeant d\'onglet', async () => {
    const user = userEvent.setup()
    render(<MentorCockpitPage initialProfile={profile} />)

    await user.click(screen.getByText('select-request'))
    expect(screen.getByTestId('mentor-right-panel')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sessions' }))
    expect(screen.queryByTestId('mentor-right-panel')).not.toBeInTheDocument()
  })

  it('bascule la disponibilité du mentor via ModeToggle', async () => {
    const user = userEvent.setup()
    render(<MentorCockpitPage initialProfile={profile} />)

    expect(screen.getByText('mode-toggle-off')).toBeInTheDocument()
    await user.click(screen.getByText('mode-toggle-off'))
    expect(screen.getByText('mode-toggle-on')).toBeInTheDocument()
  })

  it('met à jour le profil affiché après sauvegarde via MentorProfileEditModal', async () => {
    const user = userEvent.setup()
    render(<MentorCockpitPage initialProfile={profile} />)

    expect(screen.getByTestId('mentor-feed')).toHaveTextContent('bio:none')
    await user.click(screen.getByText('save-profile'))
    expect(screen.getByTestId('mentor-feed')).toHaveTextContent('bio:updated')
  })

  it('masque puis affiche la sidebar via le bouton dédié', async () => {
    const user = userEvent.setup()
    render(<MentorCockpitPage initialProfile={profile} />)

    expect(screen.getByTestId('mentor-sidebar')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Masquer la sidebar' }))
    expect(screen.queryByTestId('mentor-sidebar')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Afficher la sidebar' }))
    expect(screen.getByTestId('mentor-sidebar')).toBeInTheDocument()
  })

  it('passe les sessions actives récupérées à la sidebar', async () => {
    mockedGetMentorActiveSessions.mockResolvedValue([{ id: 1 } as MentoringSession])
    render(<MentorCockpitPage initialProfile={profile} />)

    expect(await screen.findByText('sessions:1')).toBeInTheDocument()
  })

  it('rafraîchit les sessions actives quand la sidebar ou le feed le demandent', async () => {
    const user = userEvent.setup()
    render(<MentorCockpitPage initialProfile={profile} />)
    await waitFor(() => expect(mockedGetMentorActiveSessions).toHaveBeenCalledTimes(1))

    await user.click(screen.getByText('sidebar-refresh'))
    await waitFor(() => expect(mockedGetMentorActiveSessions).toHaveBeenCalledTimes(2))

    await user.click(screen.getByText('feed-session-accepted'))
    await waitFor(() => expect(mockedGetMentorActiveSessions).toHaveBeenCalledTimes(3))
  })
})
