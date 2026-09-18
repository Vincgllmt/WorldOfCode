import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MentorSessionsFeed from '@/components/mentoring/cockpit/MentorSessionsFeed'
import { getMentorAllSessions } from '@/lib/api/mentoring/sessions'
import type { MentoringSession } from '@/types/mentoring'

jest.mock('@/lib/api/mentoring/sessions', () => ({
  getMentorAllSessions: jest.fn(),
}))

const mockedGetSessions = getMentorAllSessions as jest.MockedFunction<typeof getMentorAllSessions>

function session(overrides: Partial<MentoringSession>): MentoringSession {
  return {
    id: 1,
    status: 'in_progress',
    format: 'video',
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    conversationId: 'conv-1',
    mentor: { id: 2, username: 'mentorBob' },
    junior: { id: 5, username: 'junior1' },
    request: { id: 1, title: 'Bug mémoire', techStack: 'Python', isPublic: false },
    createdAt: '2026-01-05T09:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('MentorSessionsFeed', () => {
  it('affiche un état de chargement', () => {
    mockedGetSessions.mockReturnValue(new Promise(() => {}))
    const { container } = render(<MentorSessionsFeed selectedSessionId={null} onSelectSession={jest.fn()} />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('affiche une erreur si le chargement échoue', async () => {
    mockedGetSessions.mockRejectedValue(new Error('boom'))
    render(<MentorSessionsFeed selectedSessionId={null} onSelectSession={jest.fn()} />)
    expect(await screen.findByText('Impossible de charger les sessions.')).toBeInTheDocument()
  })

  it("affiche l'état vide sans session", async () => {
    mockedGetSessions.mockResolvedValue([])
    render(<MentorSessionsFeed selectedSessionId={null} onSelectSession={jest.fn()} />)
    expect(await screen.findByText('Aucune session pour le moment.')).toBeInTheDocument()
  })

  it('regroupe les sessions par statut avec leur nombre', async () => {
    mockedGetSessions.mockResolvedValue([
      session({ id: 1, status: 'in_progress' }),
      session({ id: 2, status: 'scheduled' }),
      session({ id: 3, status: 'scheduled' }),
    ])
    render(<MentorSessionsFeed selectedSessionId={null} onSelectSession={jest.fn()} />)

    expect(await screen.findByRole('heading', { name: /En cours/ })).toBeInTheDocument()
    expect(screen.getByText('(1)')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Planifiée/ })).toBeInTheDocument()
    expect(screen.getByText('(2)')).toBeInTheDocument()
  })

  it('affiche le titre, la tech, le format et le badge ciblée/publique', async () => {
    mockedGetSessions.mockResolvedValue([
      session({ id: 1, request: { id: 1, title: 'Bug mémoire', techStack: 'Python', isPublic: false } }),
    ])
    render(<MentorSessionsFeed selectedSessionId={null} onSelectSession={jest.fn()} />)

    expect(await screen.findByText('Bug mémoire')).toBeInTheDocument()
    // "Python" apparaît aussi comme bouton de filtre technologique.
    expect(screen.getByText('Python', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Vidéo')).toBeInTheDocument()
    expect(screen.getByText('Ciblée')).toBeInTheDocument()
  })

  it("utilise un titre de repli quand la session n'a pas de demande associée", async () => {
    mockedGetSessions.mockResolvedValue([session({ id: 1, request: null })])
    render(<MentorSessionsFeed selectedSessionId={null} onSelectSession={jest.fn()} />)
    expect(await screen.findByText('Session avec junior1')).toBeInTheDocument()
  })

  it('sélectionne une session au clic', async () => {
    const onSelectSession = jest.fn()
    const s = session({ id: 1 })
    mockedGetSessions.mockResolvedValue([s])
    const user = userEvent.setup()
    render(<MentorSessionsFeed selectedSessionId={null} onSelectSession={onSelectSession} />)

    await user.click(await screen.findByText('Bug mémoire'))
    expect(onSelectSession).toHaveBeenCalledWith(s)
  })

  it('filtre les sessions par technologie', async () => {
    mockedGetSessions.mockResolvedValue([
      session({ id: 1, request: { id: 1, title: 'Bug Python', techStack: 'Python', isPublic: false } }),
      session({ id: 2, request: { id: 2, title: 'Bug JS', techStack: 'JavaScript', isPublic: false } }),
    ])
    const user = userEvent.setup()
    render(<MentorSessionsFeed selectedSessionId={null} onSelectSession={jest.fn()} />)

    await screen.findByText('Bug Python')
    await user.click(screen.getByRole('button', { name: 'JavaScript' }))

    expect(screen.queryByText('Bug Python')).not.toBeInTheDocument()
    expect(screen.getByText('Bug JS')).toBeInTheDocument()
  })

  it('réinitialise le filtre en cliquant sur "Toutes"', async () => {
    mockedGetSessions.mockResolvedValue([
      session({ id: 1, request: { id: 1, title: 'Bug Python', techStack: 'Python', isPublic: false } }),
      session({ id: 2, request: { id: 2, title: 'Bug JS', techStack: 'JavaScript', isPublic: false } }),
    ])
    const user = userEvent.setup()
    render(<MentorSessionsFeed selectedSessionId={null} onSelectSession={jest.fn()} />)

    await screen.findByText('Bug Python')
    await user.click(screen.getByRole('button', { name: 'JavaScript' }))
    await user.click(screen.getByRole('button', { name: 'Toutes' }))

    expect(screen.getByText('Bug Python')).toBeInTheDocument()
    expect(screen.getByText('Bug JS')).toBeInTheDocument()
  })

  it('sélectionne automatiquement la session correspondant à initialSessionId une fois chargée', async () => {
    const s2 = session({ id: 2 })
    mockedGetSessions.mockResolvedValue([session({ id: 1 }), s2])
    const onSelectSession = jest.fn()
    render(<MentorSessionsFeed selectedSessionId={null} onSelectSession={onSelectSession} initialSessionId={2} />)

    await waitFor(() => expect(onSelectSession).toHaveBeenCalledWith(s2))
    expect(onSelectSession).toHaveBeenCalledTimes(1)
  })
})
