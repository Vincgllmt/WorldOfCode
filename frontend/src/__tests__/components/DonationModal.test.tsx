import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DonationModal from '@/components/mentoring/session/DonationModal'
import { createDonationIntent } from '@/lib/api/payment'

jest.mock('@/lib/api/payment', () => ({
  createDonationIntent: jest.fn(),
}))
const mockedIntent = createDonationIntent as jest.MockedFunction<typeof createDonationIntent>

const confirmPayment = jest.fn()

jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({})),
}))
jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmPayment }),
  useElements: () => ({}),
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('DonationModal', () => {
  it('demande un PaymentIntent avec le montant préréglé choisi puis passe au paiement', async () => {
    mockedIntent.mockResolvedValueOnce({
      client_secret: 'cs_test_123',
      payment_intent_id: 'pi_1',
      application_fee_cents: 160,
    })

    render(
      <DonationModal sessionId={7} mentorUsername="Marc" onClose={jest.fn()} onDonated={jest.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '10,00 €' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))

    await waitFor(() => expect(mockedIntent).toHaveBeenCalledWith(7, 1000))
    expect(await screen.findByTestId('payment-element')).toBeInTheDocument()
  })

  it('refuse un montant sous le minimum (0,50 €)', async () => {
    render(
      <DonationModal sessionId={7} mentorUsername="Marc" onClose={jest.fn()} onDonated={jest.fn()} />,
    )

    await userEvent.type(screen.getByLabelText(/Montant libre/i), '0,20')
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/minimum/i)
    expect(mockedIntent).not.toHaveBeenCalled()
  })

  it('confirme le paiement puis notifie le succès', async () => {
    mockedIntent.mockResolvedValueOnce({
      client_secret: 'cs_test_123',
      payment_intent_id: 'pi_1',
      application_fee_cents: 160,
    })
    confirmPayment.mockResolvedValueOnce({ paymentIntent: { status: 'succeeded' } })
    const onDonated = jest.fn()

    render(
      <DonationModal sessionId={7} mentorUsername="Marc" onClose={jest.fn()} onDonated={onDonated} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '5,00 €' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    await screen.findByTestId('payment-element')
    await userEvent.click(screen.getByRole('button', { name: 'Payer' }))

    expect(await screen.findByText(/Merci pour votre don/i)).toBeInTheDocument()
    await waitFor(() => expect(onDonated).toHaveBeenCalled(), { timeout: 3000 })
  })
})
