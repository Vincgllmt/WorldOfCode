import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MentorFeed from '@/components/mentoring/cockpit/MentorFeed'
import { useMentorFeed } from '@/hooks/useMentorFeed'
import type { MentoringRequest, MentorProfile } from '@/types/mentoring'

jest.mock('@/hooks/useMentorFeed', () => ({
  useMentorFeed: jest.fn(),
}))
jest.mock('@/components/mentoring/feed/FeedFilters', () => ({
  __esModule: true,
  default: ({ onSelect }: { onSelect: (v: string | undefined) => void }) => (
    <button onClick={() => onSelect('React')}>select-react-filter</button>
  ),
}))
jest.mock('@/components/mentoring/feed/MentoringRequestCard', () => ({
  __esModule: true,
  default: ({ request, isSelected, onClick }: { request: MentoringRequest; isSelected: boolean; onClick: () => void }) => (
    <button onClick={onClick} data-selected={isSelected}>
      card-{request.id}
    </button>
  ),
}))

const mockedUseMentorFeed = useMentorFeed as jest.MockedFunction<typeof useMentorFeed>

const mentorProfile = { id: 1, specialties: [] } as unknown as MentorProfile

function makeRequest(overrides: Partial<MentoringRequest> = {}): MentoringRequest {
  return {
    id: 1,
    type: 'help',
    status: 'pending',
    title: 'Bug React',
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
    ...overrides,
  } as MentoringRequest
}

function mockFeed(overrides: Partial<ReturnType<typeof useMentorFeed>> = {}) {
  mockedUseMentorFeed.mockReturnValue({
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFeed()
})

describe('MentorFeed', () => {
  it('affiche des skeletons pendant le chargement', () => {
    mockFeed({ isLoading: true })
    const { container } = render(
      <MentorFeed mentorProfile={mentorProfile} onSelectRequest={jest.fn()} selectedRequestId={null} />
    )
    expect(container.querySelectorAll('.animate-pulse').length).toBe(3)
  })

  it("affiche le message d'erreur quand le feed échoue", () => {
    mockFeed({ error: 'Impossible de charger le feed' })
    render(<MentorFeed mentorProfile={mentorProfile} onSelectRequest={jest.fn()} selectedRequestId={null} />)
    expect(screen.getByText('Impossible de charger le feed')).toBeInTheDocument()
  })

  it("affiche un message quand aucune demande n'est disponible", () => {
    render(<MentorFeed mentorProfile={mentorProfile} onSelectRequest={jest.fn()} selectedRequestId={null} />)
    expect(screen.getByText('Aucune demande disponible pour le moment.')).toBeInTheDocument()
  })

  it('sépare les demandes ciblées des demandes publiques', () => {
    mockFeed({
      data: [
        makeRequest({ id: 1, isTargeted: true }),
        makeRequest({ id: 2, isTargeted: false }),
      ],
    })
    render(<MentorFeed mentorProfile={mentorProfile} onSelectRequest={jest.fn()} selectedRequestId={null} />)

    expect(screen.getByText('Demandes ciblées (1)')).toBeInTheDocument()
    expect(screen.getByText('Demandes publiques (1)')).toBeInTheDocument()
    expect(screen.getByText('card-1')).toBeInTheDocument()
    expect(screen.getByText('card-2')).toBeInTheDocument()
  })

  it("n'affiche pas l'en-tête publiques quand il n'y a que des demandes ciblées", () => {
    mockFeed({ data: [makeRequest({ id: 1, isTargeted: true })] })
    render(<MentorFeed mentorProfile={mentorProfile} onSelectRequest={jest.fn()} selectedRequestId={null} />)

    expect(screen.getByText('Demandes ciblées (1)')).toBeInTheDocument()
    expect(screen.queryByText(/Demandes publiques/)).not.toBeInTheDocument()
  })

  it("n'affiche pas l'en-tête ciblées quand il n'y a que des demandes publiques", () => {
    mockFeed({ data: [makeRequest({ id: 2, isTargeted: false })] })
    render(<MentorFeed mentorProfile={mentorProfile} onSelectRequest={jest.fn()} selectedRequestId={null} />)

    expect(screen.queryByText(/Demandes ciblées/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Demandes publiques/)).not.toBeInTheDocument()
  })

  it('appelle onSelectRequest au clic sur une carte', async () => {
    mockFeed({ data: [makeRequest({ id: 5 })] })
    const onSelectRequest = jest.fn()
    const user = userEvent.setup()
    render(<MentorFeed mentorProfile={mentorProfile} onSelectRequest={onSelectRequest} selectedRequestId={null} />)

    await user.click(screen.getByText('card-5'))
    expect(onSelectRequest).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }))
  })

  it('notifie onPinnedChange avec les demandes ayant un pin actif', () => {
    const onPinnedChange = jest.fn()
    const pinned = makeRequest({ id: 3, pin: { isActive: true, expiresAt: '2026-01-01T00:00:00Z' } })
    const notPinned = makeRequest({ id: 4, pin: { isActive: false, expiresAt: '2026-01-01T00:00:00Z' } })
    mockFeed({ data: [pinned, notPinned] })

    render(
      <MentorFeed
        mentorProfile={mentorProfile}
        onSelectRequest={jest.fn()}
        selectedRequestId={null}
        onPinnedChange={onPinnedChange}
      />
    )

    expect(onPinnedChange).toHaveBeenCalledWith([expect.objectContaining({ id: 3 })])
  })

  it('déclenche le filtre technique via FeedFilters', async () => {
    const user = userEvent.setup()
    render(<MentorFeed mentorProfile={mentorProfile} onSelectRequest={jest.fn()} selectedRequestId={null} />)

    await user.click(screen.getByText('select-react-filter'))
    // useMentorFeed est appelé avec le nouveau filtre technique lors du re-render.
    expect(mockedUseMentorFeed).toHaveBeenLastCalledWith('React')
  })

  it('sélectionne automatiquement la demande correspondant à initialRequestId', () => {
    const onSelectRequest = jest.fn()
    mockFeed({ data: [makeRequest({ id: 9 }), makeRequest({ id: 10 })] })

    render(
      <MentorFeed
        mentorProfile={mentorProfile}
        onSelectRequest={onSelectRequest}
        selectedRequestId={null}
        initialRequestId={10}
      />
    )

    expect(onSelectRequest).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }))
  })
})
