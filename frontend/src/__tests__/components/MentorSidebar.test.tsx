import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MentorSidebar from '@/components/mentoring/cockpit/MentorSidebar'
import { startSession } from '@/lib/api/mentoring/sessions'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { MentoringRequest, MentoringSession } from '@/types/mentoring'

jest.mock('@/lib/api/mentoring/sessions', () => ({
  startSession: jest.fn(),
}))
jest.mock('@/lib/fetchWithAuth', () => ({
  fetchWithAuth: jest.fn(),
}))
jest.mock('@/components/mentoring/cockpit/MentorStatsCard', () => ({
  __esModule: true,
  default: () => <div data-testid="mentor-stats-card" />,
}))
jest.mock('@/components/mentoring/cockpit/WeekAgenda', () => ({
  __esModule: true,
  default: ({ sessions }: { sessions: MentoringSession[] }) => (
    <div data-testid="week-agenda">{sessions.length}</div>
  ),
}))
jest.mock('@/components/mentoring/cockpit/SessionMiniCard', () => ({
  __esModule: true,
  default: ({ session, onStart, onComplete }: { session: MentoringSession; onStart: (id: number) => void; onComplete: () => void }) => (
    <div data-testid={`session-mini-card-${session.id}`}>
      <button onClick={() => onStart(session.id)}>start-{session.id}</button>
      <button onClick={onComplete}>complete-{session.id}</button>
    </div>
  ),
}))

const mockedStartSession = startSession as jest.MockedFunction<typeof startSession>
const mockedFetchWithAuth = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

const session: MentoringSession = {
  id: 1,
  status: 'accepted',
  format: 'chat',
  scheduledAt: null,
  startedAt: null,
  completedAt: null,
  conversationId: null,
  mentor: { id: 1, username: 'mentor1' },
  junior: { id: 2, username: 'junior1' },
  createdAt: '2026-01-01T00:00:00Z',
}

const pinnedRequest: MentoringRequest = {
  id: 5,
  type: 'help',
  status: 'pinned',
  title: 'Bug urgent',
  techStack: 'React',
  description: 'desc',
  blockedSince: null,
  alreadyTried: null,
  expectedBehavior: null,
  observedBehavior: null,
  codeSnippet: null,
  codeLanguage: null,
  isPublic: true,
  isTargeted: false,
  pin: { isActive: true, expiresAt: new Date(Date.now() + 60_000).toISOString() },
} as MentoringRequest

function mockFollowersResponse(followers: { id: number; username: string }[] = []) {
  mockedFetchWithAuth.mockResolvedValue({
    ok: true,
    json: async () => followers,
  } as Response)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFollowersResponse()
})

describe('MentorSidebar', () => {
  it('affiche les cartes statistiques et l\'agenda de la semaine', async () => {
    render(<MentorSidebar />)
    expect(screen.getByTestId('mentor-stats-card')).toBeInTheDocument()
    expect(await screen.findByTestId('week-agenda')).toHaveTextContent('0')
  })

  it("affiche un message quand il n'y a aucune session active", async () => {
    render(<MentorSidebar />)
    await waitFor(() => expect(mockedFetchWithAuth).toHaveBeenCalled())
    expect(screen.getByText('Sessions actives (0)')).toBeInTheDocument()
    expect(screen.getByText('Aucune session active')).toBeInTheDocument()
  })

  it('affiche les sessions actives passées en props', async () => {
    render(<MentorSidebar activeSessions={[session]} />)
    expect(screen.getByText('Sessions actives (1)')).toBeInTheDocument()
    expect(screen.getByTestId('session-mini-card-1')).toBeInTheDocument()
  })

  it('démarre une session et notifie le parent via onSessionUpdate', async () => {
    mockedStartSession.mockResolvedValue(session)
    const onSessionUpdate = jest.fn()
    const user = userEvent.setup()
    render(<MentorSidebar activeSessions={[session]} onSessionUpdate={onSessionUpdate} />)

    await user.click(screen.getByText('start-1'))

    expect(mockedStartSession).toHaveBeenCalledWith(1)
    await waitFor(() => expect(onSessionUpdate).toHaveBeenCalledTimes(1))
  })

  it("n'appelle pas onSessionUpdate si le démarrage échoue", async () => {
    mockedStartSession.mockRejectedValue(new Error('boom'))
    const onSessionUpdate = jest.fn()
    const user = userEvent.setup()
    render(<MentorSidebar activeSessions={[session]} onSessionUpdate={onSessionUpdate} />)

    await user.click(screen.getByText('start-1'))

    await waitFor(() => expect(mockedStartSession).toHaveBeenCalled())
    expect(onSessionUpdate).not.toHaveBeenCalled()
  })

  it('notifie le parent quand une session est complétée', async () => {
    const onSessionUpdate = jest.fn()
    const user = userEvent.setup()
    render(<MentorSidebar activeSessions={[session]} onSessionUpdate={onSessionUpdate} />)

    await user.click(screen.getByText('complete-1'))
    expect(onSessionUpdate).toHaveBeenCalledTimes(1)
  })

  it("affiche la liste des abonnés récupérée via fetchWithAuth", async () => {
    mockFollowersResponse([{ id: 1, username: 'alice' }, { id: 2, username: 'bob' }])
    render(<MentorSidebar />)

    expect(await screen.findByText('Abonnés (2)')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
  })

  it("affiche un message par défaut quand il n'y a aucun abonné", async () => {
    render(<MentorSidebar />)
    expect(await screen.findByText('Aucun abonné pour l\'instant')).toBeInTheDocument()
  })

  it("gère silencieusement l'échec de la récupération des abonnés", async () => {
    mockedFetchWithAuth.mockResolvedValue({ ok: false } as Response)
    render(<MentorSidebar />)
    expect(await screen.findByText('Aucun abonné pour l\'instant')).toBeInTheDocument()
  })

  it("affiche un message par défaut quand il n'y a aucune demande épinglée", () => {
    render(<MentorSidebar />)
    expect(screen.getByText('Aucune demande épinglée')).toBeInTheDocument()
  })

  it('affiche les demandes épinglées avec leur minuteur de pin actif', () => {
    render(<MentorSidebar pinnedRequests={[pinnedRequest]} />)

    expect(screen.getByText('Bug urgent')).toBeInTheDocument()
    expect(screen.getByText(/Expire dans/)).toBeInTheDocument()
  })

  it("n'affiche pas de minuteur pour une demande épinglée sans pin actif", () => {
    render(<MentorSidebar pinnedRequests={[{ ...pinnedRequest, pin: { isActive: false, expiresAt: pinnedRequest.pin!.expiresAt } }]} />)
    expect(screen.queryByText(/Expire dans/)).not.toBeInTheDocument()
  })
})
