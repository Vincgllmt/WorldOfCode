import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModeToggle from '@/components/mentoring/cockpit/ModeToggle'
import { toggleAvailability } from '@/lib/api/mentoring/profile'

jest.mock('@/lib/api/mentoring/profile', () => ({
  toggleAvailability: jest.fn(),
}))

const mockedToggleAvailability = toggleAvailability as jest.MockedFunction<typeof toggleAvailability>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ModeToggle', () => {
  it('affiche "Disponible" avec aria-pressed=true quand isAvailable est vrai', () => {
    render(<ModeToggle isAvailable onToggle={jest.fn()} />)

    const button = screen.getByRole('button', { name: /Disponible/ })
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('affiche "Mode Invisible" avec aria-pressed=false quand isAvailable est faux', () => {
    render(<ModeToggle isAvailable={false} onToggle={jest.fn()} />)

    const button = screen.getByRole('button', { name: /Mode Invisible/ })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('bascule la disponibilité au clic et appelle onToggle avec le résultat', async () => {
    mockedToggleAvailability.mockResolvedValue({ isAvailable: true, mode: 'available' })
    const onToggle = jest.fn()
    const user = userEvent.setup()
    render(<ModeToggle isAvailable={false} onToggle={onToggle} />)

    await user.click(screen.getByRole('button'))

    expect(mockedToggleAvailability).toHaveBeenCalledWith(true)
    await waitFor(() => expect(onToggle).toHaveBeenCalledWith(true))
  })

  it('affiche un état de chargement et désactive le bouton pendant la requête', async () => {
    let resolvePromise: (value: { isAvailable: boolean; mode: string }) => void
    mockedToggleAvailability.mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve })
    )
    const user = userEvent.setup()
    render(<ModeToggle isAvailable={false} onToggle={jest.fn()} />)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(screen.getByText('Mise à jour...')).toBeInTheDocument()
    expect(button).toBeDisabled()

    resolvePromise!({ isAvailable: true, mode: 'available' })
    await waitFor(() => expect(button).not.toBeDisabled())
  })

  it("n'appelle pas onToggle et réactive le bouton en cas d'échec", async () => {
    mockedToggleAvailability.mockRejectedValue(new Error('boom'))
    const onToggle = jest.fn()
    const user = userEvent.setup()
    render(<ModeToggle isAvailable={false} onToggle={onToggle} />)

    const button = screen.getByRole('button')
    await user.click(button)

    await waitFor(() => expect(button).not.toBeDisabled())
    expect(onToggle).not.toHaveBeenCalled()
  })
})
