import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RatingModal from '@/components/mentoring/session/RatingModal'
import { submitRating } from '@/lib/api/mentoring/ratings'

jest.mock('@/lib/api/mentoring/ratings', () => ({
  submitRating: jest.fn(),
}))
const mockedSubmit = submitRating as jest.MockedFunction<typeof submitRating>

beforeEach(() => {
  jest.clearAllMocks()
})

async function rate5() {
  await userEvent.click(screen.getByRole('button', { name: '5 étoiles' }))
  await userEvent.click(screen.getByRole('button', { name: /Soumettre ma note/i }))
}

describe('RatingModal — étape don après la note', () => {
  it('propose de soutenir le mentor quand canDonate est vrai', async () => {
    mockedSubmit.mockResolvedValueOnce({})
    const onDonate = jest.fn()
    const onClose = jest.fn()

    render(
      <RatingModal
        sessionId={7}
        partnerUsername="Marc"
        onClose={onClose}
        onSubmitted={jest.fn()}
        canDonate
        onDonate={onDonate}
      />,
    )

    await rate5()

    const supportBtn = await screen.findByRole('button', { name: /Soutenir votre mentor/i })
    await userEvent.click(supportBtn)
    expect(onDonate).toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('sans canDonate, se ferme automatiquement après la note', async () => {
    jest.useFakeTimers()
    mockedSubmit.mockResolvedValueOnce({})
    const onClose = jest.fn()

    render(
      <RatingModal sessionId={7} partnerUsername="Marc" onClose={onClose} onSubmitted={jest.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '5 étoiles' }), { advanceTimers: jest.advanceTimersByTime })
    await userEvent.click(screen.getByRole('button', { name: /Soumettre ma note/i }), { advanceTimers: jest.advanceTimersByTime })

    await waitFor(() => expect(screen.getByText(/note a été enregistrée/i)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Soutenir votre mentor/i })).not.toBeInTheDocument()

    jest.advanceTimersByTime(2000)
    expect(onClose).toHaveBeenCalled()
    jest.useRealTimers()
  })
})
