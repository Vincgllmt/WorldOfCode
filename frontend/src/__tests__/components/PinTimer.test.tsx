import { render, screen, act } from '@testing-library/react'
import PinTimer from '@/components/mentoring/cockpit/PinTimer'

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00Z'))
})

afterEach(() => {
  jest.useRealTimers()
})

describe('PinTimer', () => {
  it('affiche le compte à rebours initial au format HH:MM:SS', () => {
    const expiresAt = new Date('2026-01-01T12:01:05Z').toISOString()
    render(<PinTimer expiresAt={expiresAt} />)

    expect(screen.getByText('Expire dans 00:01:05')).toBeInTheDocument()
  })

  it('décrémente le compte à rebours chaque seconde', () => {
    const expiresAt = new Date('2026-01-01T12:00:10Z').toISOString()
    render(<PinTimer expiresAt={expiresAt} />)

    expect(screen.getByText('Expire dans 00:00:10')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(screen.getByText('Expire dans 00:00:07')).toBeInTheDocument()
  })

  it('affiche "Pin expiré" une fois le délai écoulé', () => {
    const expiresAt = new Date('2026-01-01T12:00:02Z').toISOString()
    render(<PinTimer expiresAt={expiresAt} />)

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(screen.getByText('Pin expiré')).toBeInTheDocument()
  })

  it('affiche directement "Pin expiré" quand expiresAt est déjà dans le passé', () => {
    const expiresAt = new Date('2026-01-01T11:00:00Z').toISOString()
    render(<PinTimer expiresAt={expiresAt} />)

    expect(screen.getByText('Pin expiré')).toBeInTheDocument()
  })

  it('appelle onExpired une seule fois quand le délai atteint zéro', () => {
    const onExpired = jest.fn()
    const expiresAt = new Date('2026-01-01T12:00:01Z').toISOString()
    render(<PinTimer expiresAt={expiresAt} onExpired={onExpired} />)

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(onExpired).toHaveBeenCalledTimes(1)

    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(onExpired).toHaveBeenCalledTimes(1)
  })

  it('redémarre le compte à rebours quand expiresAt change', () => {
    const { rerender } = render(<PinTimer expiresAt={new Date('2026-01-01T12:00:05Z').toISOString()} />)
    expect(screen.getByText('Expire dans 00:00:05')).toBeInTheDocument()

    rerender(<PinTimer expiresAt={new Date('2026-01-01T12:00:20Z').toISOString()} />)
    expect(screen.getByText('Expire dans 00:00:20')).toBeInTheDocument()
  })
})
