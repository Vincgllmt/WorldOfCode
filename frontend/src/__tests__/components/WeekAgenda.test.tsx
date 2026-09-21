import { render, screen } from '@testing-library/react'
import WeekAgenda from '@/components/mentoring/cockpit/WeekAgenda'
import type { MentoringSession } from '@/types/mentoring'

const baseSession: MentoringSession = {
  id: 1,
  status: 'accepted',
  format: 'text',
  scheduledAt: null,
  startedAt: null,
  completedAt: null,
  conversationId: null,
  mentor: { id: 1, username: 'mentor1' },
  junior: { id: 2, username: 'junior1' },
  createdAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-01-15T10:00:00'))
})

afterEach(() => {
  jest.useRealTimers()
})

describe('WeekAgenda', () => {
  it("affiche un message quand aucun rendez-vous n'est planifié", () => {
    render(<WeekAgenda sessions={[]} />)
    expect(screen.getByText('Aucun rendez-vous planifié')).toBeInTheDocument()
  })

  it('ignore les sessions sans date planifiée', () => {
    render(<WeekAgenda sessions={[{ ...baseSession, scheduledAt: null }]} />)
    expect(screen.getByText('Aucun rendez-vous planifié')).toBeInTheDocument()
  })

  it("affiche une session future d'aujourd'hui avec le libellé Aujourd'hui", () => {
    render(<WeekAgenda sessions={[{ ...baseSession, scheduledAt: '2026-01-15T14:00:00' }]} />)
    expect(screen.getByText("Aujourd'hui")).toBeInTheDocument()
    expect(screen.getByText('junior1')).toBeInTheDocument()
  })

  it('affiche une session passée du jour même avec un style atténué', () => {
    const { container } = render(
      <WeekAgenda sessions={[{ ...baseSession, scheduledAt: '2026-01-15T08:00:00' }]} />
    )
    expect(screen.getByText("Aujourd'hui")).toBeInTheDocument()
    expect(container.querySelector('.opacity-60')).not.toBeNull()
  })

  it("n'affiche pas une session passée d'un autre jour", () => {
    render(<WeekAgenda sessions={[{ ...baseSession, scheduledAt: '2026-01-10T08:00:00' }]} />)
    expect(screen.getByText('Aucun rendez-vous planifié')).toBeInTheDocument()
  })

  it('affiche une session de demain avec le libellé Demain', () => {
    render(<WeekAgenda sessions={[{ ...baseSession, scheduledAt: '2026-01-16T09:00:00' }]} />)
    expect(screen.getByText('Demain')).toBeInTheDocument()
  })

  it('trie les sessions affichées par date croissante', () => {
    render(
      <WeekAgenda
        sessions={[
          { ...baseSession, id: 1, scheduledAt: '2026-01-16T09:00:00', junior: { id: 2, username: 'second' } },
          { ...baseSession, id: 2, scheduledAt: '2026-01-15T14:00:00', junior: { id: 3, username: 'first' } },
        ]}
      />
    )
    const names = screen.getAllByText(/first|second/).map((el) => el.textContent)
    expect(names).toEqual(['first', 'second'])
  })

  it('affiche le libellé et le point de couleur associés au format', () => {
    render(<WeekAgenda sessions={[{ ...baseSession, scheduledAt: '2026-01-15T14:00:00', format: 'video' }]} />)
    expect(screen.getByText('Vidéo')).toBeInTheDocument()
  })

  it('affiche un lien de chat quand un conversationId est présent', () => {
    render(
      <WeekAgenda
        sessions={[{ ...baseSession, scheduledAt: '2026-01-15T14:00:00', conversationId: 'conv-42' }]}
      />
    )
    const link = screen.getByRole('link', { name: 'Chat avec junior1' })
    expect(link).toHaveAttribute('href', '/message/conv-42')
  })

  it("n'affiche pas de lien de chat sans conversationId", () => {
    render(<WeekAgenda sessions={[{ ...baseSession, scheduledAt: '2026-01-15T14:00:00' }]} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
