import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LandingPage from '@/app/page'

beforeEach(() => {
  jest.useFakeTimers({ advanceTimers: true })
})

afterEach(() => {
  jest.useRealTimers()
})

describe('LandingPage', () => {
  it('affiche le hero avec le premier rôle et le lien d\'inscription', () => {
    render(<LandingPage />)

    expect(screen.getByText('développeurs')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Rejoindre la communauté/i })).toHaveAttribute('href', '/register')
  })

  it('affiche la première slide du carrousel de fonctionnalités', () => {
    render(<LandingPage />)

    expect(screen.getByText("Fil d'actualité")).toBeInTheDocument()
    expect(screen.getByText(/Partagez vos connaissances/)).toBeInTheDocument()
  })

  it('passe à la slide suivante au clic sur la flèche', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<LandingPage />)

    await user.click(screen.getByRole('button', { name: 'Slide suivante' }))

    expect(screen.getByText('Groupes technologiques')).toBeInTheDocument()
  })

  it('revient à la dernière slide au clic sur précédent depuis la première', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<LandingPage />)

    await user.click(screen.getByRole('button', { name: 'Slide précédente' }))

    expect(screen.getByText("Appels vidéo & partage d'écran")).toBeInTheDocument()
  })

  it('saute directement à une slide via les puces de navigation', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<LandingPage />)

    await user.click(screen.getByRole('button', { name: 'Aller au slide 3' }))

    expect(screen.getByText('Messagerie temps réel')).toBeInTheDocument()
  })

  it('avance automatiquement le carrousel après 5 secondes', () => {
    render(<LandingPage />)

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(screen.getByText('Groupes technologiques')).toBeInTheDocument()
  })

  it('fait tourner le rôle affiché dans le titre au fil du temps', () => {
    render(<LandingPage />)
    expect(screen.getByText('développeurs')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(2500 + 300)
    })

    expect(screen.getByText('devops')).toBeInTheDocument()
  })
})
