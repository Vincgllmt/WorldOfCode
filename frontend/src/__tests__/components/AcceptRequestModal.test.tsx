import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AcceptRequestModal from '@/components/mentoring/cockpit/AcceptRequestModal'
import { acceptRequest, createOrGetConversation } from '@/lib/api/mentoring/requests'
import type { MentoringSession } from '@/types/mentoring'

jest.mock('@/lib/api/mentoring/requests', () => ({
  acceptRequest: jest.fn(),
  createOrGetConversation: jest.fn(),
}))

const mockedAcceptRequest = acceptRequest as jest.MockedFunction<typeof acceptRequest>
const mockedCreateOrGetConversation = createOrGetConversation as jest.MockedFunction<typeof createOrGetConversation>

const session = { id: 1 } as unknown as MentoringSession

beforeEach(() => {
  jest.clearAllMocks()
})

describe('AcceptRequestModal', () => {
  it('affiche le titre de la demande et les options de format', () => {
    render(
      <AcceptRequestModal requestId={1} requestTitle="Bug React" juniorId={2} onClose={jest.fn()} onAccepted={jest.fn()} />
    )

    expect(screen.getByText('Accepter la demande')).toBeInTheDocument()
    expect(screen.getByText('Bug React')).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Format de session' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Texte/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Vidéo/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Hybride/ })).not.toBeChecked()
  })

  it('change le format sélectionné au clic', async () => {
    const user = userEvent.setup()
    render(
      <AcceptRequestModal requestId={1} requestTitle="Bug React" juniorId={2} onClose={jest.fn()} onAccepted={jest.fn()} />
    )

    await user.click(screen.getByRole('radio', { name: /Vidéo/ }))
    expect(screen.getByRole('radio', { name: /Vidéo/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Texte/ })).not.toBeChecked()
  })

  it('appelle onClose au clic sur Annuler', async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(
      <AcceptRequestModal requestId={1} requestTitle="Bug React" juniorId={2} onClose={onClose} onAccepted={jest.fn()} />
    )

    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("appelle onClose au clic sur l'overlay mais pas sur le contenu", async () => {
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(
      <AcceptRequestModal requestId={1} requestTitle="Bug React" juniorId={2} onClose={onClose} onAccepted={jest.fn()} />
    )

    await user.click(screen.getByText('Accepter la demande'))
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('crée la conversation, accepte la demande avec le format choisi puis notifie le parent', async () => {
    mockedCreateOrGetConversation.mockResolvedValue('conv-99')
    mockedAcceptRequest.mockResolvedValue(session)
    const onClose = jest.fn()
    const onAccepted = jest.fn()
    const user = userEvent.setup()
    render(
      <AcceptRequestModal requestId={7} requestTitle="Bug React" juniorId={2} onClose={onClose} onAccepted={onAccepted} />
    )

    await user.click(screen.getByRole('radio', { name: /Hybride/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmer' }))

    expect(mockedCreateOrGetConversation).toHaveBeenCalledWith(2)
    await waitFor(() =>
      expect(mockedAcceptRequest).toHaveBeenCalledWith(7, { format: 'hybrid', conversationId: 'conv-99' })
    )
    expect(onAccepted).toHaveBeenCalledWith(session)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("affiche un message spécifique quand la demande a déjà été acceptée", async () => {
    mockedCreateOrGetConversation.mockResolvedValue('conv-99')
    mockedAcceptRequest.mockRejectedValue(Object.assign(new Error('x'), { code: 'REQUEST_ALREADY_ACCEPTED' }))
    const onAccepted = jest.fn()
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(
      <AcceptRequestModal requestId={7} requestTitle="Bug React" juniorId={2} onClose={onClose} onAccepted={onAccepted} />
    )

    await user.click(screen.getByRole('button', { name: 'Confirmer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('déjà été acceptée par un autre mentor')
    expect(onAccepted).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it("affiche un message d'erreur générique pour toute autre erreur", async () => {
    mockedCreateOrGetConversation.mockRejectedValue(new Error('network down'))
    const user = userEvent.setup()
    render(
      <AcceptRequestModal requestId={7} requestTitle="Bug React" juniorId={2} onClose={jest.fn()} onAccepted={jest.fn()} />
    )

    await user.click(screen.getByRole('button', { name: 'Confirmer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Une erreur est survenue. Veuillez réessayer.')
  })

  it('désactive les boutons pendant la requête', async () => {
    let resolvePromise: (value: string) => void
    mockedCreateOrGetConversation.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve }))
    const user = userEvent.setup()
    render(
      <AcceptRequestModal requestId={7} requestTitle="Bug React" juniorId={2} onClose={jest.fn()} onAccepted={jest.fn()} />
    )

    await user.click(screen.getByRole('button', { name: 'Confirmer' }))

    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Acceptation...' })).toBeDisabled()

    resolvePromise!('conv-1')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Annuler' })).not.toBeDisabled())
  })
})
