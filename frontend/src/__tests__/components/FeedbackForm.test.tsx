import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import toast from 'react-hot-toast'
import FeedbackForm from '@/components/feedback/FeedbackForm'
import { useSubmitFeedback, useHasExistingFeedback } from '@/hooks/useFeedback'

jest.mock('@/hooks/useFeedback', () => ({
  useSubmitFeedback: jest.fn(),
  useHasExistingFeedback: jest.fn(),
}))
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}))

const mockedUseSubmitFeedback = useSubmitFeedback as jest.MockedFunction<typeof useSubmitFeedback>
const mockedUseHasExistingFeedback = useHasExistingFeedback as jest.MockedFunction<typeof useHasExistingFeedback>
const mockMutate = jest.fn()

function mockHooks({ hasExisting = false, isPending = false }: { hasExisting?: boolean; isPending?: boolean } = {}) {
  mockedUseSubmitFeedback.mockReturnValue({ mutate: mockMutate, isPending } as any)
  mockedUseHasExistingFeedback.mockReturnValue({ data: { hasExisting } } as any)
}

async function rateField(label: string, value: number) {
  const user = userEvent.setup()
  // Les champs requis affichent un astérisque accolé au libellé (pas de séparateur
  // de texte), d'où le match partiel plutôt qu'une égalité stricte.
  const heading = screen.getByText(label, { exact: false })
  const track = heading.closest('div.space-y-2\\.5')!
  const buttons = track.querySelectorAll('button')
  await user.click(buttons[value - 1])
}

beforeEach(() => {
  jest.clearAllMocks()
  mockHooks()
})

describe('FeedbackForm', () => {
  it('désactive le bouton d\'envoi tant que les champs requis ne sont pas notés', () => {
    render(<FeedbackForm />)
    expect(screen.getByRole('button', { name: /Envoyer mon avis/i })).toBeDisabled()
  })

  it("affiche un message quand l'utilisateur a déjà donné son avis", () => {
    mockHooks({ hasExisting: true })
    render(<FeedbackForm />)
    expect(screen.getByText(/Vous avez déjà donné votre avis/)).toBeInTheDocument()
  })

  it('active le bouton une fois les champs requis notés et affiche le score choisi', async () => {
    const user = userEvent.setup()
    render(<FeedbackForm />)

    await rateField('Satisfaction globale', 4)
    await rateField("Facilité d'utilisation", 3)
    await rateField('Qualité du contenu', 5)
    await user.click(screen.getByRole('button', { name: '7' }))

    expect(screen.getByText('4/5 — Bien')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Envoyer mon avis/i })).toBeEnabled()
  })

  it('soumet le formulaire avec les notes optionnelles à null si non renseignées', async () => {
    const user = userEvent.setup()
    render(<FeedbackForm />)

    await rateField('Satisfaction globale', 4)
    await rateField("Facilité d'utilisation", 3)
    await rateField('Qualité du contenu', 5)
    await user.click(screen.getByRole('button', { name: '8' }))
    await user.type(screen.getByPlaceholderText(/Partagez vos suggestions/i), 'Très bonne plateforme')
    await user.click(screen.getByRole('button', { name: /Envoyer mon avis/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      {
        overallSatisfaction: 4,
        easeOfUse: 3,
        contentQuality: 5,
        messagingRating: null,
        groupsRating: null,
        mentoringRating: null,
        npsScore: 8,
        comment: 'Très bonne plateforme',
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
  })

  it('inclut les notes optionnelles renseignées', async () => {
    const user = userEvent.setup()
    render(<FeedbackForm />)

    await rateField('Satisfaction globale', 4)
    await rateField("Facilité d'utilisation", 3)
    await rateField('Qualité du contenu', 5)
    await rateField('Messagerie', 2)
    await user.click(screen.getByRole('button', { name: '6' }))
    await user.click(screen.getByRole('button', { name: /Envoyer mon avis/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ messagingRating: 2, groupsRating: null, mentoringRating: null }),
      expect.anything(),
    )
  })

  it('affiche un message de succès après une soumission réussie', async () => {
    mockMutate.mockImplementation((_payload, { onSuccess }) => onSuccess())
    const user = userEvent.setup()
    render(<FeedbackForm />)

    await rateField('Satisfaction globale', 4)
    await rateField("Facilité d'utilisation", 3)
    await rateField('Qualité du contenu', 5)
    await user.click(screen.getByRole('button', { name: '9' }))
    await user.click(screen.getByRole('button', { name: /Envoyer mon avis/i }))

    expect(await screen.findByText('Merci pour votre retour !')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Retour au fil/i })).toHaveAttribute('href', '/home')
  })

  it("affiche un toast d'erreur si la soumission échoue", async () => {
    mockMutate.mockImplementation((_payload, { onError }) => onError(new Error('Erreur serveur')))
    const user = userEvent.setup()
    render(<FeedbackForm />)

    await rateField('Satisfaction globale', 4)
    await rateField("Facilité d'utilisation", 3)
    await rateField('Qualité du contenu', 5)
    await user.click(screen.getByRole('button', { name: '5' }))
    await user.click(screen.getByRole('button', { name: /Envoyer mon avis/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erreur serveur'))
    expect(screen.queryByText('Merci pour votre retour !')).not.toBeInTheDocument()
  })

  it('affiche "Envoi en cours..." pendant la soumission', () => {
    mockHooks({ isPending: true })
    render(<FeedbackForm />)
    expect(screen.getByRole('button', { name: /Envoi en cours/i })).toBeDisabled()
  })
})
