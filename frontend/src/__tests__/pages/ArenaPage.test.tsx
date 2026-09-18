import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ArenaPage from '@/app/arena/page'
import { useArenaChallenges, useArenaLeaderboard, useUserBadges } from '@/hooks/useArenaChallenges'
import type { ArenaBadge, ArenaChallenge, LeaderboardEntry } from '@/interfaces/arena'

jest.mock('@/hooks/useArenaChallenges', () => ({
  useArenaChallenges: jest.fn(),
  useArenaLeaderboard: jest.fn(),
  useUserBadges: jest.fn(),
}))
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 5 } }),
}))

const mockedUseChallenges = useArenaChallenges as jest.MockedFunction<typeof useArenaChallenges>
const mockedUseLeaderboard = useArenaLeaderboard as jest.MockedFunction<typeof useArenaLeaderboard>
const mockedUseBadges = useUserBadges as jest.MockedFunction<typeof useUserBadges>

function challenge(overrides: Partial<ArenaChallenge>): ArenaChallenge {
  return {
    id: 1,
    slug: 'walk',
    title: 'La Marche',
    difficulty: 'easy',
    languages: ['javascript'],
    maxScore: 100,
    image: null,
    badgeIcon: null,
    successRate: 50,
    solved: false,
    ...overrides,
  }
}

function leader(overrides: Partial<LeaderboardEntry>): LeaderboardEntry {
  return {
    rank: 1,
    userId: 1,
    username: 'alice',
    totalScore: 1000,
    badgesCount: 2,
    isCurrentUser: false,
    ...overrides,
  }
}

function mockHooks({
  challenges = [],
  isLoading = false,
  leaderboard = [],
  badges = [],
}: {
  challenges?: ArenaChallenge[]
  isLoading?: boolean
  leaderboard?: LeaderboardEntry[]
  badges?: ArenaBadge[]
}) {
  mockedUseChallenges.mockReturnValue({ challenges, isLoading, error: null } as any)
  mockedUseLeaderboard.mockReturnValue({ leaderboard, isLoading: false, error: null } as any)
  mockedUseBadges.mockReturnValue({ badges, isLoading: false, error: null } as any)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ArenaPage', () => {
  it('affiche des squelettes de chargement', () => {
    mockHooks({ isLoading: true })
    const { container } = render(<ArenaPage />)
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0)
  })

  it("affiche le niveau, l'XP et le nombre de défis résolus", () => {
    mockHooks({
      challenges: [challenge({ id: 1, slug: 'a', solved: true }), challenge({ id: 2, slug: 'b', solved: false })],
      leaderboard: [leader({ userId: 5, isCurrentUser: true, totalScore: 750 })],
    })
    render(<ArenaPage />)

    expect(screen.getByText('Niveau 2')).toBeInTheDocument()
    expect(screen.getByText(/1 défi résolu/)).toBeInTheDocument()
    expect(screen.getByText('750 XP')).toBeInTheDocument()
  })

  it("affiche l'état vide des badges quand il n'y a aucun défi", () => {
    mockHooks({ challenges: [] })
    render(<ArenaPage />)
    expect(screen.getByText("Aucun badge à débloquer pour l'instant.")).toBeInTheDocument()
    expect(screen.getByText('0 / 0 débloqués')).toBeInTheDocument()
  })

  it('affiche les badges débloqués et verrouillés', () => {
    mockHooks({
      challenges: [challenge({ id: 1, slug: 'walk', title: 'La Marche' }), challenge({ id: 2, slug: 'maze', title: 'Le Labyrinthe' })],
      badges: [
        { badgeId: 1, name: 'Champion de la marche', description: null, icon: '🏆', challengeSlug: 'walk', awardedAt: '2026-01-01T00:00:00Z' },
      ],
    })
    render(<ArenaPage />)

    expect(screen.getByText('1 / 2 débloqués')).toBeInTheDocument()
    expect(screen.getByText('Champion de la marche')).toBeInTheDocument()
    // Le titre du 2e défi apparaît une fois en badge verrouillé, une fois en carte de la grille.
    expect(screen.getAllByText('Le Labyrinthe')).toHaveLength(2)
  })

  it("affiche l'état vide du classement", () => {
    mockHooks({})
    render(<ArenaPage />)
    expect(screen.getByText("Aucun classement pour l'instant.")).toBeInTheDocument()
  })

  it('affiche le classement et met en avant l\'utilisateur courant', () => {
    mockHooks({
      leaderboard: [
        leader({ rank: 1, userId: 1, username: 'alice', totalScore: 2000 }),
        leader({ rank: 2, userId: 5, username: 'bob', totalScore: 1500, isCurrentUser: true }),
      ],
    })
    render(<ArenaPage />)

    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('Toi · bob')).toBeInTheDocument()
  })

  it('affiche le classement complet au clic sur le bouton dédié', async () => {
    const board = Array.from({ length: 8 }, (_, i) =>
      leader({ rank: i + 1, userId: i + 1, username: `user${i + 1}`, totalScore: 1000 - i }),
    )
    mockHooks({ leaderboard: board })
    const user = userEvent.setup()
    render(<ArenaPage />)

    expect(screen.queryByText('user8')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Voir le classement complet/i }))
    expect(screen.getByText('user8')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Réduire le classement/i }))
    expect(screen.queryByText('user8')).not.toBeInTheDocument()
  })

  it('affiche la grille de défis avec un lien vers chaque défi', () => {
    mockHooks({
      challenges: [
        challenge({ id: 1, slug: 'walk', title: 'La Marche', difficulty: 'easy' }),
        challenge({ id: 2, slug: 'maze', title: 'Le Labyrinthe', difficulty: 'hard' }),
      ],
    })
    render(<ArenaPage />)

    expect(screen.getByRole('link', { name: /La Marche/ })).toHaveAttribute('href', '/arena/walk')
    expect(screen.getByRole('link', { name: /Le Labyrinthe/ })).toHaveAttribute('href', '/arena/maze')
    expect(screen.getByText('2 disponibles')).toBeInTheDocument()
  })

  it('filtre les défis par difficulté', async () => {
    mockHooks({
      challenges: [
        challenge({ id: 1, slug: 'walk', title: 'La Marche', difficulty: 'easy' }),
        challenge({ id: 2, slug: 'maze', title: 'Le Labyrinthe', difficulty: 'hard' }),
      ],
    })
    const user = userEvent.setup()
    render(<ArenaPage />)

    await user.click(screen.getByRole('button', { name: 'Difficile' }))

    // Le titre en <h3> n'existe que sur la carte de la grille filtrée (le
    // bloc « Mes badges » liste toujours tous les défis, filtre ou non).
    expect(screen.queryByRole('heading', { name: 'La Marche' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Le Labyrinthe' })).toBeInTheDocument()
    expect(screen.getByText('1 disponible')).toBeInTheDocument()
  })

  it('filtre les défis par recherche texte', async () => {
    mockHooks({
      challenges: [
        challenge({ id: 1, slug: 'walk', title: 'La Marche' }),
        challenge({ id: 2, slug: 'maze', title: 'Le Labyrinthe' }),
      ],
    })
    const user = userEvent.setup()
    render(<ArenaPage />)

    await user.type(screen.getByPlaceholderText('Rechercher…'), 'laby')

    expect(screen.queryByRole('heading', { name: 'La Marche' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Le Labyrinthe' })).toBeInTheDocument()
  })

  it("affiche un message quand aucun défi ne correspond au filtre", async () => {
    mockHooks({ challenges: [challenge({ id: 1, slug: 'walk', title: 'La Marche' })] })
    const user = userEvent.setup()
    render(<ArenaPage />)

    await user.type(screen.getByPlaceholderText('Rechercher…'), 'inexistant')

    expect(screen.getByText('Aucun défi trouvé.')).toBeInTheDocument()
  })
})
