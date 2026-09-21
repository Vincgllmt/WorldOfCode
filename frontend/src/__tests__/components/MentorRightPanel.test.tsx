import { render, screen, waitFor } from '@testing-library/react'
import MentorRightPanel from '@/components/mentoring/cockpit/MentorRightPanel'
import { getMentorRequestDetail } from '@/lib/api/mentoring/requests'
import type { MentoringRequest } from '@/types/mentoring'

jest.mock('@/lib/api/mentoring/requests', () => ({
  getMentorRequestDetail: jest.fn(),
}))
jest.mock('@/components/mentoring/feed/CompatibilityScore', () => ({
  __esModule: true,
  default: ({ score }: { score: number }) => <div data-testid="compatibility-score">{score}</div>,
}))

const mockedGetMentorRequestDetail = getMentorRequestDetail as jest.MockedFunction<typeof getMentorRequestDetail>

const request: MentoringRequest = {
  id: 1,
  type: 'help',
  status: 'pending',
  title: 'Bug React',
  techStack: 'React',
  description: 'Description courte',
  blockedSince: null,
  alreadyTried: null,
  expectedBehavior: null,
  observedBehavior: null,
  codeSnippet: null,
  codeLanguage: null,
  isPublic: true,
  isTargeted: false,
  compatibilityScore: 72,
  junior: { id: 2, username: 'junior1' },
} as unknown as MentoringRequest

function neverResolves() {
  return new Promise(() => {})
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('MentorRightPanel', () => {
  it("affiche le pseudo du junior, la tech stack et le score de compatibilité", async () => {
    mockedGetMentorRequestDetail.mockResolvedValue({
      description: 'Description détaillée',
      alreadyTried: null,
      expectedBehavior: null,
      observedBehavior: null,
    })
    render(<MentorRightPanel request={request} />)

    expect(screen.getByText('junior1')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('compatibility-score')).toHaveTextContent('72'))
  })

  it('affiche des skeletons pendant le chargement des détails', () => {
    mockedGetMentorRequestDetail.mockReturnValue(neverResolves() as ReturnType<typeof getMentorRequestDetail>)
    const { container } = render(<MentorRightPanel request={request} />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it("affiche la description résumée du store en attendant le détail", () => {
    mockedGetMentorRequestDetail.mockReturnValue(neverResolves() as ReturnType<typeof getMentorRequestDetail>)
    render(<MentorRightPanel request={{ ...request, descriptionExcerpt: 'Résumé court' }} />)
    expect(screen.getByText('Résumé court')).toBeInTheDocument()
  })

  it('affiche la description détaillée une fois chargée', async () => {
    mockedGetMentorRequestDetail.mockResolvedValue({
      description: 'Description détaillée du problème',
      alreadyTried: null,
      expectedBehavior: null,
      observedBehavior: null,
    })
    render(<MentorRightPanel request={request} />)

    expect(await screen.findByText('Description détaillée du problème')).toBeInTheDocument()
  })

  it('affiche les sections déjà essayé / comportement attendu / observé quand présentes', async () => {
    mockedGetMentorRequestDetail.mockResolvedValue({
      description: 'desc',
      alreadyTried: 'Redémarrer le serveur',
      expectedBehavior: 'Aucune erreur',
      observedBehavior: 'Erreur 500',
    })
    render(<MentorRightPanel request={request} />)

    expect(await screen.findByText('Redémarrer le serveur')).toBeInTheDocument()
    expect(screen.getByText('Aucune erreur')).toBeInTheDocument()
    expect(screen.getByText('Erreur 500')).toBeInTheDocument()
  })

  it("affiche l'extrait de code avec son langage quand présent", async () => {
    mockedGetMentorRequestDetail.mockResolvedValue({
      description: 'desc',
      alreadyTried: null,
      expectedBehavior: null,
      observedBehavior: null,
    })
    render(
      <MentorRightPanel
        request={{ ...request, codeSnippet: 'const x = 1', codeLanguage: 'javascript' }}
      />
    )

    expect(await screen.findByText('const x = 1')).toBeInTheDocument()
    expect(screen.getByText('javascript')).toBeInTheDocument()
  })

  it("affiche un message d'erreur quand le chargement du détail échoue", async () => {
    mockedGetMentorRequestDetail.mockRejectedValue(new Error('boom'))
    render(<MentorRightPanel request={request} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de charger les détails de la demande.')
  })

  it("affiche un message quand aucune session précédente n'existe", async () => {
    mockedGetMentorRequestDetail.mockResolvedValue({
      description: 'desc',
      alreadyTried: null,
      expectedBehavior: null,
      observedBehavior: null,
      juniorContext: { previousSessions: [] },
    })
    render(<MentorRightPanel request={request} />)

    expect(await screen.findByText('Aucune session précédente avec ce junior.')).toBeInTheDocument()
  })

  it('affiche les sessions précédentes avec leur statut, date et durée', async () => {
    mockedGetMentorRequestDetail.mockResolvedValue({
      description: 'desc',
      alreadyTried: null,
      expectedBehavior: null,
      observedBehavior: null,
      juniorContext: {
        previousSessions: [
          {
            id: 1,
            status: 'in_progress',
            format: 'text',
            startedAt: '2026-01-01T10:00:00Z',
            completedAt: '2026-01-01T11:30:00Z',
          },
        ],
      },
    })
    render(<MentorRightPanel request={request} />)

    expect(await screen.findByText('Sessions précédentes')).toBeInTheDocument()
    expect(screen.getByText('in progress')).toBeInTheDocument()
    expect(screen.getByText('1h 30min')).toBeInTheDocument()
  })

  it('recharge le détail quand la demande sélectionnée change', async () => {
    mockedGetMentorRequestDetail.mockResolvedValue({
      description: 'desc',
      alreadyTried: null,
      expectedBehavior: null,
      observedBehavior: null,
    })
    const { rerender } = render(<MentorRightPanel request={request} />)
    await waitFor(() => expect(mockedGetMentorRequestDetail).toHaveBeenCalledWith(1))

    rerender(<MentorRightPanel request={{ ...request, id: 2 }} />)
    await waitFor(() => expect(mockedGetMentorRequestDetail).toHaveBeenCalledWith(2))
  })
})
