import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DonationStatus from '@/components/mentoring/session/DonationStatus'
import { getSessionDonationStatus } from '@/lib/api/payment'

jest.mock('@/lib/api/payment', () => ({
  getSessionDonationStatus: jest.fn(),
}))
const mockedStatus = getSessionDonationStatus as jest.MockedFunction<typeof getSessionDonationStatus>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('DonationStatus', () => {
  it('n\'affiche rien si le mentor n\'accepte pas les dons', async () => {
    mockedStatus.mockResolvedValueOnce({ mentorReady: false, payment: null })
    const { container } = render(<DonationStatus sessionId={1} onDonate={jest.fn()} />)
    await waitFor(() => expect(mockedStatus).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('propose de soutenir le mentor quand il accepte les dons', async () => {
    mockedStatus.mockResolvedValueOnce({ mentorReady: true, payment: null })
    const onDonate = jest.fn()
    render(<DonationStatus sessionId={1} onDonate={onDonate} />)

    const btn = await screen.findByRole('button', { name: /soutenir votre mentor/i })
    await userEvent.click(btn)
    expect(onDonate).toHaveBeenCalled()
  })

  it('affiche un remerciement quand un don a déjà abouti', async () => {
    mockedStatus.mockResolvedValueOnce({
      mentorReady: true,
      payment: { status: 'succeeded', amount: 1000, currency: 'eur', createdAt: '2026-09-04T10:00:00Z' },
    })
    render(<DonationStatus sessionId={1} onDonate={jest.fn()} />)

    expect(await screen.findByText(/merci/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
