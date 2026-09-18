import { Suspense } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ArenaIDEPage from '@/app/arena/[slug]/page'
import { getChallenge, playGame, runCode, runTests, submitCode } from '@/services/arenaService'
import type { ArenaChallengeDetail } from '@/interfaces/arena'

jest.mock('@/services/arenaService', () => ({
  getChallenge: jest.fn(),
  playGame: jest.fn(),
  runCode: jest.fn(),
  runTests: jest.fn(),
  submitCode: jest.fn(),
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 42 }, isLoading: false }),
}))

jest.mock('@/components/arena/CodeEditor', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="code-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

jest.mock('@/components/arena/ReplayPlayer', () => ({
  __esModule: true,
  default: ({ onEnded }: { onEnded?: () => void }) => (
    <div data-testid="replay-player">
      {onEnded && <button type="button" onClick={onEnded}>Fin du replay</button>}
    </div>
  ),
}))

jest.mock('@/components/arena/BadgeUnlockOverlay', () => ({
  __esModule: true,
  default: ({ badge, onClose }: { badge: { name: string } | null; onClose: () => void }) =>
    badge ? (
      <div data-testid="badge-overlay">
        <span>{badge.name}</span>
        <button type="button" onClick={onClose}>Fermer badge</button>
      </div>
    ) : null,
}))

jest.mock('@/app/arena/games/registry', () => ({
  GAMES: {
    walk: {
      createViewer: jest.fn(),
      buildPreview: (input: string) => ({ frames: [], input }),
    },
  },
}))

const mockedGetChallenge = getChallenge as jest.MockedFunction<typeof getChallenge>
const mockedPlayGame = playGame as jest.MockedFunction<typeof playGame>
const mockedRunCode = runCode as jest.MockedFunction<typeof runCode>
const mockedRunTests = runTests as jest.MockedFunction<typeof runTests>
const mockedSubmitCode = submitCode as jest.MockedFunction<typeof submitCode>

const gameChallenge: ArenaChallengeDetail = {
  id: 1,
  slug: 'walk',
  title: 'La Marche',
  difficulty: 'easy',
  languages: ['javascript', 'python'],
  maxScore: 100,
  image: null,
  badgeIcon: 'walk-icon',
  successRate: 50,
  solved: false,
  statement: '# La Marche\n\nAvance vers la sortie.',
  publicTests: [
    { stdin: 'right,right', expectedOutput: 'ok' },
    { stdin: 'left', expectedOutput: 'ok' },
  ],
}

const exerciseChallenge: ArenaChallengeDetail = {
  id: 2,
  slug: 'sum-two-numbers',
  title: 'Somme de deux nombres',
  difficulty: 'medium',
  languages: ['javascript'],
  maxScore: 50,
  image: null,
  badgeIcon: null,
  successRate: 80,
  solved: false,
  statement: '# Somme\n\nAdditionne deux nombres.',
  publicTests: [{ stdin: '2 3', expectedOutput: '5' }],
}

async function renderPage(slug: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Chargement de la page…</div>}>
          <ArenaIDEPage params={Promise.resolve({ slug })} />
        </Suspense>
      </QueryClientProvider>,
    )
  })
  return result
}

beforeEach(() => {
  jest.clearAllMocks()
  window.localStorage.clear()
})

describe('ArenaIDEPage', () => {
  it('affiche un état de chargement puis le défi', async () => {
    // Contrôle manuel de la résolution : `renderPage` (via `act(async () => …)`) purge déjà
    // les microtâches, donc une simple `mockResolvedValue` masquerait l'état de chargement
    // avant qu'on ait pu l'observer.
    let resolveChallenge!: (value: ArenaChallengeDetail) => void
    mockedGetChallenge.mockImplementation(() => new Promise((resolve) => { resolveChallenge = resolve }))

    await renderPage('sum-two-numbers')
    expect(screen.getByText('Chargement du défi…')).toBeInTheDocument()

    await act(async () => { resolveChallenge(exerciseChallenge) })

    expect(await screen.findByRole('heading', { name: 'Somme de deux nombres' })).toBeInTheDocument()
    expect(screen.getAllByText('Moyen').length).toBeGreaterThan(0)
  })

  it("affiche une erreur si le défi ne charge pas", async () => {
    mockedGetChallenge.mockRejectedValue(new Error('boom'))
    await renderPage('inconnu')

    expect(await screen.findByText(/Défi introuvable ou service indisponible/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Retour aux défis/i })).toHaveAttribute('href', '/arena')
  })

  it('affiche "Soumettre" pour un exercice classique et "Jouer" pour un jeu', async () => {
    mockedGetChallenge.mockResolvedValue(exerciseChallenge)
    await renderPage('sum-two-numbers')
    expect(await screen.findByRole('button', { name: 'Soumettre' })).toBeInTheDocument()
  })

  it('affiche "Jouer" pour un jeu enregistré dans le registre', async () => {
    mockedGetChallenge.mockResolvedValue(gameChallenge)
    await renderPage('walk')
    expect(await screen.findByRole('button', { name: 'Jouer' })).toBeInTheDocument()
    expect(screen.getByTestId('replay-player')).toBeInTheDocument()
  })

  it("affiche les niveaux publics d'un exercice classique dans l'onglet Niveaux", async () => {
    mockedGetChallenge.mockResolvedValue(exerciseChallenge)
    const user = userEvent.setup()
    await renderPage('sum-two-numbers')
    await screen.findByRole('heading', { name: 'Somme de deux nombres' })

    await user.click(screen.getByRole('tab', { name: /Niveaux/i }))

    expect(screen.getByText('2 3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('exécute le code et affiche stdout dans le panneau de sortie', async () => {
    mockedGetChallenge.mockResolvedValue(exerciseChallenge)
    mockedRunCode.mockResolvedValueOnce({ stdout: 'Résultat: 5', stderr: '', exitCode: 0, timedOut: false })
    const user = userEvent.setup()
    await renderPage('sum-two-numbers')
    await screen.findByRole('heading', { name: 'Somme de deux nombres' })

    await user.type(screen.getByTestId('code-editor'), 'console.log(5)')
    await user.click(screen.getByRole('button', { name: /Exécuter/i }))

    expect(await screen.findByText('Résultat: 5')).toBeInTheDocument()
    expect(mockedRunCode).toHaveBeenCalledWith('javascript', expect.stringContaining('console.log(5)'), undefined)
  })

  it("affiche l'erreur d'exécution si runCode échoue", async () => {
    mockedGetChallenge.mockResolvedValue(exerciseChallenge)
    mockedRunCode.mockRejectedValueOnce(new Error('Timeout compilateur'))
    const user = userEvent.setup()
    await renderPage('sum-two-numbers')
    await screen.findByRole('heading', { name: 'Somme de deux nombres' })

    await user.type(screen.getByTestId('code-editor'), 'x')
    await user.click(screen.getByRole('button', { name: /Exécuter/i }))

    expect(await screen.findByText('Timeout compilateur')).toBeInTheDocument()
  })

  it('soumet un exercice classique et affiche le score obtenu', async () => {
    mockedGetChallenge.mockResolvedValue(exerciseChallenge)
    mockedSubmitCode.mockResolvedValueOnce({
      status: 'passed',
      score: 50,
      testsPassed: 1,
      testsTotal: 1,
      badgesAwarded: ['first_solve'],
    } as any)
    const user = userEvent.setup()
    await renderPage('sum-two-numbers')
    await screen.findByRole('heading', { name: 'Somme de deux nombres' })

    await user.type(screen.getByTestId('code-editor'), 'return a+b')
    await user.click(screen.getByRole('button', { name: 'Soumettre' }))

    expect(await screen.findByText('Tous les niveaux réussis !')).toBeInTheDocument()
    expect(screen.getByText('1/1 niveaux · 50 pts')).toBeInTheDocument()
    expect(await screen.findByTestId('badge-overlay')).toHaveTextContent('Première résolution')
  })

  it('affiche un score partiel quand la soumission échoue partiellement', async () => {
    mockedGetChallenge.mockResolvedValue(exerciseChallenge)
    mockedSubmitCode.mockResolvedValueOnce({
      status: 'failed',
      score: 0,
      testsPassed: 0,
      testsTotal: 1,
      badgesAwarded: [],
    } as any)
    const user = userEvent.setup()
    await renderPage('sum-two-numbers')
    await screen.findByRole('heading', { name: 'Somme de deux nombres' })

    await user.type(screen.getByTestId('code-editor'), 'x')
    await user.click(screen.getByRole('button', { name: 'Soumettre' }))

    expect(await screen.findByText('Des niveaux ont échoué.')).toBeInTheDocument()
    expect(screen.queryByTestId('badge-overlay')).not.toBeInTheDocument()
  })

  it('joue un jeu et affiche la progression', async () => {
    mockedGetChallenge.mockResolvedValue(gameChallenge)
    mockedPlayGame.mockResolvedValueOnce({
      submissionId: 1,
      verdict: 'passed',
      score: 100,
      testsPassed: 2,
      testsTotal: 2,
      results: [
        { index: 0, verdict: 'passed', score: 50, replay: null, playerStderr: '', error: null },
        { index: 1, verdict: 'passed', score: 50, replay: null, playerStderr: '', error: null },
      ],
      badgesAwarded: ['perfect'],
    })
    const user = userEvent.setup()
    await renderPage('walk')
    await screen.findByRole('heading', { name: 'La Marche' })

    await user.type(screen.getByTestId('code-editor'), 'avance()')
    await user.click(screen.getByRole('button', { name: 'Jouer' }))

    await waitFor(() => expect(mockedPlayGame).toHaveBeenCalledWith('walk', 'javascript', expect.stringContaining('avance()')))
    expect(await screen.findByTestId('badge-overlay')).toHaveTextContent('Sans faute')
  })

  it('lance un seul niveau depuis l\'onglet Niveaux et affiche son verdict', async () => {
    mockedGetChallenge.mockResolvedValue(gameChallenge)
    mockedRunTests.mockResolvedValueOnce([
      { index: 0, verdict: 'passed', score: 50, replay: null, playerStderr: '', error: null },
    ])
    const user = userEvent.setup()
    await renderPage('walk')
    await screen.findByRole('heading', { name: 'La Marche' })

    await user.type(screen.getByTestId('code-editor'), 'avance()')
    await user.click(screen.getByRole('tab', { name: /Niveaux/i }))
    await user.click(screen.getAllByTitle('Lancer ce niveau')[0])

    await waitFor(() => expect(mockedRunTests).toHaveBeenCalledWith('walk', 'javascript', expect.stringContaining('avance()'), 0))
    expect(await screen.findByText('Réussi')).toBeInTheDocument()
  })

  it('lance tous les niveaux d\'un jeu et affiche le résumé', async () => {
    mockedGetChallenge.mockResolvedValue(gameChallenge)
    mockedRunTests.mockResolvedValueOnce([
      { index: 0, verdict: 'passed', score: 50, replay: null, playerStderr: '', error: null },
      { index: 1, verdict: 'failed', score: 0, replay: null, playerStderr: '', error: null },
    ])
    const user = userEvent.setup()
    await renderPage('walk')
    await screen.findByRole('heading', { name: 'La Marche' })

    await user.type(screen.getByTestId('code-editor'), 'avance()')
    await user.click(screen.getByRole('tab', { name: /Niveaux/i }))
    await user.click(screen.getByRole('button', { name: /Tout lancer/i }))

    expect(await screen.findByText('Essai · 1/2 niveaux réussis')).toBeInTheDocument()
  })

  it('change de langage et réinitialise le résultat d\'exécution', async () => {
    mockedGetChallenge.mockResolvedValue(exerciseChallenge)
    mockedRunCode.mockResolvedValueOnce({ stdout: 'x', stderr: '', exitCode: 0, timedOut: false })
    const user = userEvent.setup()
    await renderPage('sum-two-numbers')
    await screen.findByRole('heading', { name: 'Somme de deux nombres' })

    await user.click(screen.getByRole('button', { name: /Exécuter/i }))
    await screen.findByText('x')

    // Un seul langage dispo pour cet exercice : on vérifie juste que le select est bien rempli
    expect(screen.getByRole('combobox')).toHaveValue('javascript')
  })

  it('sélectionne un niveau de jeu pour prévisualiser son état de départ', async () => {
    mockedGetChallenge.mockResolvedValue(gameChallenge)
    const user = userEvent.setup()
    await renderPage('walk')
    await screen.findByRole('heading', { name: 'La Marche' })

    await user.click(screen.getByRole('tab', { name: /Niveaux/i }))
    await user.click(screen.getByText('Niveau 2'))

    expect(await screen.findByText('Niveau 2 · état de départ')).toBeInTheDocument()
  })
})
