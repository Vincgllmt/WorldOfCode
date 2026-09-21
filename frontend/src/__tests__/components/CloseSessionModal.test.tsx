import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CloseSessionModal from '@/components/mentoring/cockpit/CloseSessionModal'
import { completeSession } from '@/lib/api/mentoring/sessions'
import type { MentoringSession } from '@/types/mentoring'

jest.mock('@/lib/api/mentoring/sessions', () => ({
  completeSession: jest.fn(),
}))

const mockedCompleteSession = completeSession as jest.MockedFunction<typeof completeSession>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('CloseSessionModal', () => {
  it('affiche le titre, le pseudo du junior et les boutons', () => {
    render(<CloseSessionModal sessionId={1} juniorUsername="junior1" onClose={jest.fn()} onCompleted={jest.fn()} />)

    expect(screen.getByText('Clôturer la session')).toBeInTheDocument()
    expect(screen.getByText('junior1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmer la clôture/ })).toBeInTheDocument()
  })

  it('appelle onClose au clic sur Annuler', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(<CloseSessionModal sessionId={1} juniorUsername="junior1" onClose={onClose} onCompleted={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("appelle onClose au clic sur l'overlay", async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(<CloseSessionModal sessionId={1} juniorUsername="junior1" onClose={onClose} onCompleted={jest.fn()} />)

    await user.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("n'appelle pas onClose au clic à l'intérieur du contenu de la modale", async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(<CloseSessionModal sessionId={1} juniorUsername="junior1" onClose={onClose} onCompleted={jest.fn()} />)

    await user.click(screen.getByText('Clôturer la session'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('clôture la session avec succès puis appelle onCompleted et onClose', async () => {
    mockedCompleteSession.mockResolvedValue({} as MentoringSession)
    const onClose = jest.fn()
    const onCompleted = jest.fn()
    const user = userEvent.setup()
    render(<CloseSessionModal sessionId={7} juniorUsername="junior1" onClose={onClose} onCompleted={onCompleted} />)

    await user.click(screen.getByRole('button', { name: /Confirmer la clôture/ }))

    expect(mockedCompleteSession).toHaveBeenCalledWith(7)
    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("affiche un message d'erreur et ne ferme pas la modale en cas d'échec", async () => {
    mockedCompleteSession.mockRejectedValue(new Error('boom'))
    const onClose = jest.fn()
    const onCompleted = jest.fn()
    const user = userEvent.setup()
    render(<CloseSessionModal sessionId={7} juniorUsername="junior1" onClose={onClose} onCompleted={onCompleted} />)

    await user.click(screen.getByRole('button', { name: /Confirmer la clôture/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Une erreur est survenue lors de la clôture.')
    expect(onCompleted).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('désactive les boutons pendant la clôture en cours', async () => {
    let resolvePromise: (value: MentoringSession) => void
    mockedCompleteSession.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve }))
    const user = userEvent.setup()
    render(<CloseSessionModal sessionId={7} juniorUsername="junior1" onClose={jest.fn()} onCompleted={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: /Confirmer la clôture/ }))

    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clôture en cours...' })).toBeDisabled()

    resolvePromise!({} as MentoringSession)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Annuler' })).not.toBeDisabled())
  })
})
