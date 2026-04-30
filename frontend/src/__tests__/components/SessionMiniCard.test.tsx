import { render, screen, fireEvent } from '@testing-library/react'
import SessionMiniCard from '@/components/mentoring/cockpit/SessionMiniCard'
import type { MentoringSession } from '@/types/mentoring'

jest.mock('@/components/mentoring/cockpit/CloseSessionModal', () => {
  return function MockCloseModal({ juniorUsername }: { juniorUsername: string }) {
    return <div data-testid="close-modal">Clôturer avec {juniorUsername}</div>
  }
})

jest.mock('@/components/mentoring/cockpit/ProposeDateModal', () => {
  return function MockProposeDateModal() {
    return <div data-testid="propose-date-modal" />
  }
})

const buildSession = (overrides: Partial<MentoringSession> = {}): MentoringSession => ({
  id: 1,
  status: 'scheduled',
  format: 'text',
  scheduledAt: null,
  startedAt: null,
  completedAt: null,
  conversationId: null,
  mentor: { id: 10, username: 'MentorBob' },
  junior: { id: 20, username: 'AliceJunior' },
  createdAt: '2026-04-01T10:00:00Z',
  ...overrides,
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('SessionMiniCard', () => {
  it('affiche le nom du junior', () => {
    render(<SessionMiniCard session={buildSession()} />)
    expect(screen.getByText('AliceJunior')).toBeInTheDocument()
  })

  it('affiche la première lettre du username en avatar', () => {
    render(<SessionMiniCard session={buildSession()} />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('affiche le label "Planifiée" pour une session scheduled', () => {
    render(<SessionMiniCard session={buildSession({ status: 'scheduled' })} />)
    expect(screen.getByText('Planifiée')).toBeInTheDocument()
  })

  it('affiche le label "En cours" pour une session in_progress', () => {
    render(<SessionMiniCard session={buildSession({ status: 'in_progress' })} />)
    expect(screen.getByText('En cours')).toBeInTheDocument()
  })

  it('affiche le bouton Démarrer pour une session scheduled avec onStart', () => {
    const onStart = jest.fn()
    render(<SessionMiniCard session={buildSession()} onStart={onStart} />)
    expect(screen.getByLabelText('Démarrer la session avec AliceJunior')).toBeInTheDocument()
  })

  it('n\'affiche pas le bouton Démarrer sans la prop onStart', () => {
    render(<SessionMiniCard session={buildSession()} />)
    expect(screen.queryByLabelText('Démarrer la session avec AliceJunior')).not.toBeInTheDocument()
  })

  it('appelle onStart avec l\'id de la session au clic sur Démarrer', () => {
    const onStart = jest.fn()
    render(<SessionMiniCard session={buildSession({ id: 42 })} onStart={onStart} />)
    fireEvent.click(screen.getByLabelText('Démarrer la session avec AliceJunior'))
    expect(onStart).toHaveBeenCalledWith(42)
  })

  it('affiche les boutons Clôturer et Chat pour une session in_progress avec conversationId', () => {
    const onComplete = jest.fn()
    render(
      <SessionMiniCard
        session={buildSession({ status: 'in_progress', conversationId: 'conv-xyz' })}
        onComplete={onComplete}
      />,
    )
    expect(screen.getByLabelText('Clôturer la session avec AliceJunior')).toBeInTheDocument()
    expect(screen.getByLabelText('Ouvrir le chat avec AliceJunior')).toBeInTheDocument()
  })

  it('n\'affiche pas le bouton Clôturer sans la prop onComplete', () => {
    render(
      <SessionMiniCard
        session={buildSession({ status: 'in_progress', conversationId: 'conv-xyz' })}
      />,
    )
    expect(screen.queryByLabelText('Clôturer la session avec AliceJunior')).not.toBeInTheDocument()
  })

  it('affiche le modal de clôture au clic sur Clôturer', () => {
    const onComplete = jest.fn()
    render(
      <SessionMiniCard
        session={buildSession({ status: 'in_progress', conversationId: 'conv-xyz' })}
        onComplete={onComplete}
      />,
    )
    fireEvent.click(screen.getByLabelText('Clôturer la session avec AliceJunior'))
    expect(screen.getByTestId('close-modal')).toBeInTheDocument()
  })

  it('affiche le modal de planification au clic sur Planifier', () => {
    render(
      <SessionMiniCard
        session={buildSession({ status: 'in_progress', conversationId: 'conv-xyz' })}
      />,
    )
    fireEvent.click(screen.getByLabelText('Proposer une date à AliceJunior'))
    expect(screen.getByTestId('propose-date-modal')).toBeInTheDocument()
  })

  it('n\'affiche pas les boutons Chat/Planifier sans conversationId', () => {
    render(
      <SessionMiniCard
        session={buildSession({ status: 'in_progress', conversationId: null })}
        onComplete={jest.fn()}
      />,
    )
    expect(screen.queryByLabelText('Ouvrir le chat avec AliceJunior')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Proposer une date à AliceJunior')).not.toBeInTheDocument()
  })
})
