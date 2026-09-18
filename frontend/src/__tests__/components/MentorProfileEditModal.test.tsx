import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MentorProfileEditModal from '@/components/mentoring/cockpit/MentorProfileEditModal'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { updateMentorProfile } from '@/lib/api/mentoring/profile'
import { startStripeOnboarding } from '@/lib/api/stripe'
import type { MentorProfile } from '@/types/mentoring'

jest.mock('@/lib/fetchWithAuth', () => ({
  fetchWithAuth: jest.fn(),
}))
jest.mock('@/lib/api/mentoring/profile', () => ({
  updateMentorProfile: jest.fn(),
}))
jest.mock('@/lib/api/stripe', () => ({
  startStripeOnboarding: jest.fn(),
}))

const mockedFetchWithAuth = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>
const mockedUpdateProfile = updateMentorProfile as jest.MockedFunction<typeof updateMentorProfile>
const mockedStartStripe = startStripeOnboarding as jest.MockedFunction<typeof startStripeOnboarding>

const groups = [
  { id: 1, name: 'React' },
  { id: 2, name: 'Symfony' },
  { id: 3, name: 'Docker' },
]

const baseProfile: MentorProfile = {
  id: 1,
  isAvailable: true,
  teachingStyle: null,
  maxActiveMentees: 3,
  mentorBio: null,
  specialties: [],
  averageRating: null,
  reliabilityRate: null,
  totalSessions: 0,
  createdAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedFetchWithAuth.mockResolvedValue({ json: () => Promise.resolve(groups) } as any)
})

async function openModal() {
  const user = userEvent.setup()
  render(<MentorProfileEditModal profile={baseProfile} onSaved={jest.fn()} />)
  await user.click(screen.getByRole('button', { name: /Modifier mon profil/i }))
  await screen.findByText('+ React')
  return user
}

describe('MentorProfileEditModal', () => {
  it('ne montre que le bouton avant ouverture', () => {
    render(<MentorProfileEditModal profile={baseProfile} onSaved={jest.fn()} />)
    expect(screen.queryByText('Modifier mon profil mentor')).not.toBeInTheDocument()
  })

  it('ouvre la modale, charge les groupes et pré-remplit le profil existant', async () => {
    const user = userEvent.setup()
    render(
      <MentorProfileEditModal
        profile={{ ...baseProfile, teachingStyle: 'direct', maxActiveMentees: 5, mentorBio: 'Bio existante', specialties: [{ id: 1, name: 'React' }] }}
        onSaved={jest.fn()}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Modifier mon profil/i }))

    expect(await screen.findByDisplayValue('Bio existante')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Explications directes et réponses' })).toHaveClass('border-primary')
    expect(screen.getByRole('slider')).toHaveValue('5')
    // Le groupe présélectionné apparaît comme tag (span), pas comme suggestion (+ React).
    expect(screen.getByText('React', { selector: 'span' })).toBeInTheDocument()
    expect(screen.queryByText('+ React')).not.toBeInTheDocument()
    expect(mockedFetchWithAuth).toHaveBeenCalledWith('/group')
  })

  it('ajoute et retire une spécialité', async () => {
    const user = await openModal()

    await user.click(screen.getByText('+ React'))
    expect(screen.getByText('React', { selector: 'span' })).toBeInTheDocument()
    expect(screen.queryByText('+ React')).not.toBeInTheDocument()

    await user.click(screen.getByText('React', { selector: 'span' }))
    expect(screen.getByText('+ React')).toBeInTheDocument()
  })

  it('filtre les suggestions de groupes via la recherche', async () => {
    const user = await openModal()

    await user.type(screen.getByPlaceholderText('Rechercher un groupe…'), 'dock')

    expect(screen.getByText('+ Docker')).toBeInTheDocument()
    expect(screen.queryByText('+ React')).not.toBeInTheDocument()
  })

  it("affiche une erreur si on sauvegarde sans spécialité sélectionnée", async () => {
    const user = await openModal()

    await user.click(screen.getByRole('button', { name: 'Sauvegarder' }))

    expect(await screen.findByText('Sélectionne au moins une spécialité.')).toBeInTheDocument()
    expect(mockedUpdateProfile).not.toHaveBeenCalled()
  })

  it('sauvegarde le profil avec succès et ferme la modale', async () => {
    const updated = { ...baseProfile, specialties: [{ id: 1, name: 'React' }] }
    mockedUpdateProfile.mockResolvedValueOnce(updated)
    const onSaved = jest.fn()
    const user = userEvent.setup()
    render(<MentorProfileEditModal profile={baseProfile} onSaved={onSaved} />)
    await user.click(screen.getByRole('button', { name: /Modifier mon profil/i }))
    await screen.findByText('+ React')

    await user.click(screen.getByText('+ React'))
    await user.type(screen.getByPlaceholderText(/Décris ton expérience/i), 'Ma bio')
    await user.click(screen.getByRole('button', { name: 'Sauvegarder' }))

    await waitFor(() => expect(mockedUpdateProfile).toHaveBeenCalledWith({
      specialties: [1],
      teachingStyle: undefined,
      maxActiveMentees: 3,
      mentorBio: 'Ma bio',
    }))
    expect(onSaved).toHaveBeenCalledWith(updated)
    expect(screen.queryByText('Modifier mon profil mentor')).not.toBeInTheDocument()
  })

  it('affiche une erreur si la sauvegarde échoue', async () => {
    mockedUpdateProfile.mockRejectedValueOnce(new Error('Erreur serveur'))
    const user = await openModal()

    await user.click(screen.getByText('+ React'))
    await user.click(screen.getByRole('button', { name: 'Sauvegarder' }))

    expect(await screen.findByText('Erreur serveur')).toBeInTheDocument()
    expect(screen.getByText('Modifier mon profil mentor')).toBeInTheDocument()
  })

  it('ferme la modale sans sauvegarder au clic sur Annuler', async () => {
    const user = await openModal()
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByText('Modifier mon profil mentor')).not.toBeInTheDocument()
    expect(mockedUpdateProfile).not.toHaveBeenCalled()
  })

  it.each([
    [undefined, 'Non configuré — vous ne pouvez pas recevoir de dons'],
    [{ onboarded: true, transfersEnabled: false }, 'Vérification Stripe en cours'],
    [{ onboarded: true, transfersEnabled: true }, 'Paiements actifs'],
  ])('affiche le bon statut de dons pour stripe=%p', async (stripe, expected) => {
    const user = userEvent.setup()
    render(<MentorProfileEditModal profile={{ ...baseProfile, stripe }} onSaved={jest.fn()} />)
    await user.click(screen.getByRole('button', { name: /Modifier mon profil/i }))

    expect(await screen.findByText(expected)).toBeInTheDocument()
  })

  it('lance l\'onboarding Stripe au clic sur le bouton dédié', async () => {
    mockedStartStripe.mockImplementation(() => new Promise(() => {}))
    const user = await openModal()

    await user.click(screen.getByRole('button', { name: /Configurer mes paiements/i }))

    expect(mockedStartStripe).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: /Redirection/i })).toBeDisabled()
  })

  it("affiche une erreur si l'onboarding Stripe échoue", async () => {
    mockedStartStripe.mockRejectedValueOnce(new Error('Stripe indisponible'))
    const user = await openModal()

    await user.click(screen.getByRole('button', { name: /Configurer mes paiements/i }))

    expect(await screen.findByText('Stripe indisponible')).toBeInTheDocument()
  })
})
