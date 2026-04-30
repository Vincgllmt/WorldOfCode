import { render, screen, waitFor } from '@testing-library/react'
import MentorStatsCard from '@/components/mentoring/cockpit/MentorStatsCard'
import { getMentorStats } from '@/lib/api/mentoring/stats'

jest.mock('@/lib/api/mentoring/stats', () => ({
  getMentorStats: jest.fn(),
}))
const mockedGetStats = getMentorStats as jest.MockedFunction<typeof getMentorStats>

beforeEach(() => {
  jest.clearAllMocks()
})

const fakeStats = {
  totalSessions: 12,
  activeSessions: 3,
  averageRating: 4.0,
  totalMentees: 8,
  reliabilityRate: 0.92,
}

describe('MentorStatsCard', () => {
  it('affiche le skeleton de chargement en attente de la réponse', () => {
    mockedGetStats.mockReturnValue(new Promise(() => {}))
    render(<MentorStatsCard />)
    expect(screen.getByLabelText('Chargement des stats...')).toBeInTheDocument()
  })

  it('affiche les stats après chargement réussi', async () => {
    mockedGetStats.mockResolvedValueOnce(fakeStats)
    render(<MentorStatsCard />)

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument()
    })

    expect(screen.getByText('Sessions totales')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Sessions actives')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('Juniors aidés')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('Fiabilité')).toBeInTheDocument()
  })

  it('affiche la note moyenne formatée sur 1 décimale', async () => {
    mockedGetStats.mockResolvedValueOnce(fakeStats)
    render(<MentorStatsCard />)

    await waitFor(() => {
      expect(screen.getByLabelText('Note moyenne : 4.0 étoiles sur 5')).toBeInTheDocument()
    })
    expect(screen.getByText('4.0')).toBeInTheDocument()
  })

  it('affiche "—" quand la note moyenne est null', async () => {
    mockedGetStats.mockResolvedValueOnce({ ...fakeStats, averageRating: null })
    render(<MentorStatsCard />)

    await waitFor(() => {
      expect(screen.getByLabelText('Note moyenne : — étoiles sur 5')).toBeInTheDocument()
    })
  })

  it('affiche "—" pour le taux de fiabilité quand il est null', async () => {
    mockedGetStats.mockResolvedValueOnce({ ...fakeStats, reliabilityRate: null })
    render(<MentorStatsCard />)

    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })

  it('affiche un message d\'erreur si le chargement échoue', async () => {
    mockedGetStats.mockRejectedValueOnce(new Error('Réseau indisponible'))
    render(<MentorStatsCard />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/Impossible de charger les statistiques/)).toBeInTheDocument()
  })
})
