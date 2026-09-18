import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MentorOnboardingForm from '@/components/mentoring/MentorOnboardingForm'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { createMentorProfile } from '@/lib/api/mentoring/profile'
import { startStripeOnboarding } from '@/lib/api/stripe'

jest.mock('@/lib/fetchWithAuth', () => ({
  fetchWithAuth: jest.fn(),
}))
jest.mock('@/lib/api/mentoring/profile', () => ({
  createMentorProfile: jest.fn(),
}))
jest.mock('@/lib/api/stripe', () => ({
  startStripeOnboarding: jest.fn(),
}))

const mockedFetchWithAuth = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>
const mockedCreateProfile = createMentorProfile as jest.MockedFunction<typeof createMentorProfile>
const mockedStartStripe = startStripeOnboarding as jest.MockedFunction<typeof startStripeOnboarding>

const skills = [
  { id: 1, name: 'React' },
  { id: 2, name: 'Symfony' },
  { id: 3, name: 'Docker' },
]

beforeEach(() => {
  jest.clearAllMocks()
  mockedFetchWithAuth.mockResolvedValue({ json: () => Promise.resolve(skills) } as any)
  mockedCreateProfile.mockResolvedValue({} as any)
})

describe('MentorOnboardingForm', () => {
  it('affiche un état de chargement des compétences', () => {
    mockedFetchWithAuth.mockReturnValue(new Promise(() => {}))
    render(<MentorOnboardingForm onSuccess={jest.fn()} />)
    expect(screen.getByText('Chargement des compétences...')).toBeInTheDocument()
  })

  it('affiche une erreur si les compétences ne chargent pas', async () => {
    mockedFetchWithAuth.mockRejectedValue(new Error('boom'))
    render(<MentorOnboardingForm onSuccess={jest.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/Impossible de charger les compétences/)
  })

  it('affiche les suggestions de compétences puis en sélectionne une', async () => {
    const user = userEvent.setup()
    render(<MentorOnboardingForm onSuccess={jest.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'React' }))

    expect(screen.getByRole('button', { name: 'Retirer React' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'React' })).not.toBeInTheDocument()
  })

  it('retire une compétence sélectionnée', async () => {
    const user = userEvent.setup()
    render(<MentorOnboardingForm onSuccess={jest.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'React' }))
    await user.click(screen.getByRole('button', { name: 'Retirer React' }))

    expect(screen.getByRole('button', { name: 'React' })).toBeInTheDocument()
  })

  it('filtre les suggestions via la recherche', async () => {
    const user = userEvent.setup()
    render(<MentorOnboardingForm onSuccess={jest.fn()} />)
    await screen.findByRole('button', { name: 'React' })

    await user.type(screen.getByPlaceholderText('Rechercher une technologie...'), 'dock')

    expect(screen.getByRole('button', { name: 'Docker' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'React' })).not.toBeInTheDocument()
  })

  it('affiche une erreur de validation sans spécialité sélectionnée', async () => {
    const user = userEvent.setup()
    render(<MentorOnboardingForm onSuccess={jest.fn()} />)
    await screen.findByRole('button', { name: 'React' })

    await user.click(screen.getByRole('button', { name: 'Devenir Mentor' }))

    expect(await screen.findByText('Veuillez sélectionner au moins une spécialité.')).toBeInTheDocument()
    expect(mockedCreateProfile).not.toHaveBeenCalled()
  })

  it('crée le profil et appelle onSuccess directement sans souhait de dons', async () => {
    const onSuccess = jest.fn()
    const user = userEvent.setup()
    render(<MentorOnboardingForm onSuccess={onSuccess} />)

    await user.click(await screen.findByRole('button', { name: 'React' }))
    await user.selectOptions(screen.getByLabelText(/Style pédagogique/i), 'direct')
    await user.type(screen.getByLabelText(/Bio mentor/i), 'Ma bio')
    await user.click(screen.getByRole('button', { name: 'Devenir Mentor' }))

    await waitFor(() => expect(mockedCreateProfile).toHaveBeenCalledWith({
      specialties: [1],
      teachingStyle: 'direct',
      maxActiveMentees: 3,
      mentorBio: 'Ma bio',
    }))
    expect(mockedStartStripe).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('redirige vers Stripe quand la case dons est cochée', async () => {
    mockedStartStripe.mockImplementation(() => new Promise(() => {}))
    const onSuccess = jest.fn()
    const user = userEvent.setup()
    render(<MentorOnboardingForm onSuccess={onSuccess} />)

    await user.click(await screen.findByRole('button', { name: 'React' }))
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Devenir Mentor' }))

    await waitFor(() => expect(mockedStartStripe).toHaveBeenCalled())
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('appelle onSuccess si la redirection Stripe échoue', async () => {
    mockedStartStripe.mockRejectedValueOnce(new Error('stripe down'))
    const onSuccess = jest.fn()
    const user = userEvent.setup()
    render(<MentorOnboardingForm onSuccess={onSuccess} />)

    await user.click(await screen.findByRole('button', { name: 'React' }))
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Devenir Mentor' }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('traite un conflit 409 comme un succès (profil déjà existant)', async () => {
    mockedCreateProfile.mockRejectedValueOnce(Object.assign(new Error('conflict'), { status: 409 }))
    const onSuccess = jest.fn()
    const user = userEvent.setup()
    render(<MentorOnboardingForm onSuccess={onSuccess} />)

    await user.click(await screen.findByRole('button', { name: 'React' }))
    await user.click(screen.getByRole('button', { name: 'Devenir Mentor' }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('affiche une erreur si la création du profil échoue', async () => {
    mockedCreateProfile.mockRejectedValueOnce(new Error('Erreur serveur'))
    const onSuccess = jest.fn()
    const user = userEvent.setup()
    render(<MentorOnboardingForm onSuccess={onSuccess} />)

    await user.click(await screen.findByRole('button', { name: 'React' }))
    await user.click(screen.getByRole('button', { name: 'Devenir Mentor' }))

    expect(await screen.findByText('Erreur serveur')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
