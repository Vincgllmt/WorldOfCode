import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import toast from 'react-hot-toast'
import ReportPostDialog from '@/components/post/ReportPostDialog'
import { useReportPost } from '@/hooks/useReport'

jest.mock('@/hooks/useReport', () => ({
  useReportPost: jest.fn(),
}))
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}))

const mockedUseReportPost = useReportPost as jest.MockedFunction<typeof useReportPost>
const mockMutate = jest.fn()

function mockHook({ isPending = false }: { isPending?: boolean } = {}) {
  mockedUseReportPost.mockReturnValue({ mutate: mockMutate, isPending } as any)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockHook()
  // Radix Select s'appuie sur ces API absentes de jsdom pour gérer le focus/scroll.
  Element.prototype.hasPointerCapture ??= jest.fn()
  Element.prototype.scrollIntoView ??= jest.fn()
})

async function openReasonSelect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox'))
}

describe('ReportPostDialog', () => {
  it("n'affiche rien quand open est faux", () => {
    render(<ReportPostDialog postId={1} open={false} onOpenChange={jest.fn()} />)
    expect(screen.queryByText('Signaler cette publication')).not.toBeInTheDocument()
  })

  it('affiche le titre, la description et les champs du formulaire', () => {
    render(<ReportPostDialog postId={1} open onOpenChange={jest.fn()} />)

    expect(screen.getByText('Signaler cette publication')).toBeInTheDocument()
    expect(screen.getByText(/reste anonyme pour l'auteur/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Apportez des précisions si besoin...')).toBeInTheDocument()
    expect(screen.getByText('0/500')).toBeInTheDocument()
  })

  it('le bouton d\'envoi est désactivé tant qu\'aucun motif n\'est choisi', () => {
    render(<ReportPostDialog postId={1} open onOpenChange={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Envoyer le signalement' })).toBeDisabled()
  })

  it('affiche une erreur si on envoie sans motif sélectionné', async () => {
    const user = userEvent.setup()
    render(<ReportPostDialog postId={1} open onOpenChange={jest.fn()} />)

    const submit = screen.getByRole('button', { name: 'Envoyer le signalement' })
    expect(submit).toBeDisabled()

    // Le bouton étant désactivé, on s'assure que la mutation n'est jamais appelée.
    await user.click(submit)
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('met à jour le compteur de caractères des détails', async () => {
    const user = userEvent.setup()
    render(<ReportPostDialog postId={1} open onOpenChange={jest.fn()} />)

    await user.type(screen.getByPlaceholderText('Apportez des précisions si besoin...'), 'Bonjour')
    expect(screen.getByText('7/500')).toBeInTheDocument()
  })

  it('sélectionne un motif puis envoie le signalement avec les détails', async () => {
    const user = userEvent.setup()
    render(<ReportPostDialog postId={1} open onOpenChange={jest.fn()} />)

    await openReasonSelect(user)
    await user.click(await screen.findByText('Spam ou publicité indésirable'))

    await user.type(screen.getByPlaceholderText('Apportez des précisions si besoin...'), 'Trop de pub')
    await user.click(screen.getByRole('button', { name: 'Envoyer le signalement' }))

    expect(mockMutate).toHaveBeenCalledWith(
      { postId: 1, reason: 'Spam ou publicité indésirable — Trop de pub' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
  })

  it('envoie le motif seul quand les détails sont vides', async () => {
    const user = userEvent.setup()
    render(<ReportPostDialog postId={1} open onOpenChange={jest.fn()} />)

    await openReasonSelect(user)
    await user.click(await screen.findByText('Autre'))
    await user.click(screen.getByRole('button', { name: 'Envoyer le signalement' }))

    expect(mockMutate).toHaveBeenCalledWith(
      { postId: 1, reason: 'Autre' },
      expect.anything(),
    )
  })

  it('affiche un toast de succès, réinitialise le formulaire et ferme la modale', async () => {
    mockMutate.mockImplementation((_payload, { onSuccess }) => onSuccess())
    const onOpenChange = jest.fn()
    const user = userEvent.setup()
    render(<ReportPostDialog postId={1} open onOpenChange={onOpenChange} />)

    await openReasonSelect(user)
    await user.click(await screen.findByText('Autre'))
    await user.click(screen.getByRole('button', { name: 'Envoyer le signalement' }))

    expect(toast.success).toHaveBeenCalledWith('Signalement envoyé. Merci de contribuer à la modération.')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('affiche un toast d\'erreur venant de la mutation', async () => {
    mockMutate.mockImplementation((_payload, { onError }) => onError(new Error('Erreur serveur')))
    const user = userEvent.setup()
    render(<ReportPostDialog postId={1} open onOpenChange={jest.fn()} />)

    await openReasonSelect(user)
    await user.click(await screen.findByText('Autre'))
    await user.click(screen.getByRole('button', { name: 'Envoyer le signalement' }))

    expect(toast.error).toHaveBeenCalledWith('Erreur serveur')
  })

  it('désactive les champs et le bouton annuler pendant l\'envoi', () => {
    mockHook({ isPending: true })
    render(<ReportPostDialog postId={1} open onOpenChange={jest.fn()} />)

    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(screen.getByPlaceholderText('Apportez des précisions si besoin...')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Envoi...' })).toBeDisabled()
  })

  it('n\'appelle pas onOpenChange si on ferme pendant l\'envoi', async () => {
    mockHook({ isPending: true })
    const onOpenChange = jest.fn()
    const user = userEvent.setup()
    render(<ReportPostDialog postId={1} open onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('réinitialise le formulaire et ferme via le bouton Annuler', async () => {
    const onOpenChange = jest.fn()
    const user = userEvent.setup()
    render(<ReportPostDialog postId={1} open onOpenChange={onOpenChange} />)

    await user.type(screen.getByPlaceholderText('Apportez des précisions si besoin...'), 'test')
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
