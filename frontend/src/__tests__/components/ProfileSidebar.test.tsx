import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileSidebar from '@/components/profile/ProfileSidebar'
import { useSettingsModal } from '@/contexts/SettingsModalContext'
import { useUpdateAvatar } from '@/hooks/useUsers'
import { useCreateConversation } from '@/hooks/useConversations'
import type { PublicUser } from '@/interfaces/user'
import type { Group } from '@/interfaces/group'

jest.mock('@/contexts/SettingsModalContext', () => ({
  useSettingsModal: jest.fn(),
}))
jest.mock('@/hooks/useUsers', () => ({
  useUpdateAvatar: jest.fn(),
}))
jest.mock('@/hooks/useConversations', () => ({
  useCreateConversation: jest.fn(),
}))
const mockSetUserAvatar = jest.fn()
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ setUserAvatar: mockSetUserAvatar }),
}))
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))
jest.mock('@/components/follow/FollowToggleButton', () => ({
  __esModule: true,
  default: ({ targetUserId }: { targetUserId: number }) => <button type="button">Suivre {targetUserId}</button>,
}))
jest.mock('@/components/account/UserFollowCounts', () => ({
  __esModule: true,
  default: () => <div data-testid="follow-counts" />,
}))
jest.mock('@/components/profile/EditLinksDialog', () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="edit-links-dialog" /> : null),
}))
jest.mock('@/components/register/AvatarPicker', () => ({
  __esModule: true,
  default: ({ onChange }: { onChange: (v: string) => void }) => (
    <button type="button" onClick={() => onChange('https://cdn.test/new-avatar.png')}>Choisir un nouvel avatar</button>
  ),
}))

const mockedUseSettingsModal = useSettingsModal as jest.MockedFunction<typeof useSettingsModal>
const mockedUseUpdateAvatar = useUpdateAvatar as jest.MockedFunction<typeof useUpdateAvatar>
const mockedUseCreateConversation = useCreateConversation as jest.MockedFunction<typeof useCreateConversation>

const mockOpenSettings = jest.fn()
const mockUpdateAvatarMutateAsync = jest.fn()
const mockCreateConversationMutate = jest.fn()

const baseUser: PublicUser = {
  id: 10,
  username: 'jdupont',
  role: 'ROLE_USER',
  email: 'j@example.com',
  firstname: 'Jean',
  lastname: 'Dupont',
  creationDate: '2026-01-01T00:00:00Z',
  updatedDate: '2026-01-01T00:00:00Z',
  avatarUrl: null,
  bio: null,
  location: null,
  availability: null,
  links: [],
}

const groups: Group[] = [
  { id: 1, name: 'React' } as Group,
  { id: 2, name: 'Symfony' } as Group,
]

function renderSidebar(overrides: Partial<React.ComponentProps<typeof ProfileSidebar>> = {}) {
  return render(
    <ProfileSidebar
      user={baseUser}
      viewerId={99}
      isOwnProfile={false}
      isFollowedByViewer={false}
      groups={[]}
      groupsLoading={false}
      groupsError={null}
      {...overrides}
    />,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedUseSettingsModal.mockReturnValue({ openSettings: mockOpenSettings, closeSettings: jest.fn() })
  mockedUseUpdateAvatar.mockReturnValue({ mutateAsync: mockUpdateAvatarMutateAsync, isPending: false } as any)
  mockedUseCreateConversation.mockReturnValue({ mutate: mockCreateConversationMutate, isPending: false } as any)
})

describe('ProfileSidebar', () => {
  it("affiche le nom, prénom/nom et les initiales de l'utilisateur", () => {
    renderSidebar()
    expect(screen.getByRole('heading', { name: 'jdupont' })).toBeInTheDocument()
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
  })

  it('affiche la localisation et la bio quand renseignées', () => {
    renderSidebar({ user: { ...baseUser, location: 'Paris', bio: 'Développeur passionné' } })
    expect(screen.getByText('Paris')).toBeInTheDocument()
    expect(screen.getByText('Développeur passionné')).toBeInTheDocument()
  })

  it('affiche le bouton "Modifier le profil" sur son propre profil', async () => {
    const user = userEvent.setup()
    renderSidebar({ isOwnProfile: true })

    await user.click(screen.getByRole('button', { name: /Modifier le profil/i }))
    expect(mockOpenSettings).toHaveBeenCalledWith('profile')
  })

  it('affiche suivre + message sur le profil de quelqu\'un d\'autre', () => {
    renderSidebar({ isOwnProfile: false })
    expect(screen.getByText('Suivre 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Message/i })).toBeInTheDocument()
  })

  it('démarre une conversation et navigue au clic sur Message', async () => {
    mockCreateConversationMutate.mockImplementation((_payload, { onSuccess }) => onSuccess({ id: 'conv-1' }))
    const user = userEvent.setup()
    renderSidebar({ isOwnProfile: false })

    await user.click(screen.getByRole('button', { name: /Message/i }))

    expect(mockCreateConversationMutate).toHaveBeenCalledWith(
      { targetUserId: 10, type: 'direct' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(mockPush).toHaveBeenCalledWith('/message/conv-1')
  })

  it("masque la section liens pour un autre profil sans lien renseigné", () => {
    renderSidebar({ isOwnProfile: false, user: { ...baseUser, links: [] } })
    expect(screen.queryByText('Liens')).not.toBeInTheDocument()
  })

  it('affiche la section liens en lecture seule pour un autre profil avec des liens', () => {
    renderSidebar({
      isOwnProfile: false,
      user: { ...baseUser, links: [{ id: 1, type: 'github', url: 'https://github.com/jdupont' }] as any },
    })
    expect(screen.getByText('Liens')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Modifier les liens/i })).not.toBeInTheDocument()
  })

  it("affiche la section liens éditable sur son propre profil même sans lien", () => {
    renderSidebar({ isOwnProfile: true })
    expect(screen.getByText('Liens')).toBeInTheDocument()
    expect(screen.getByText('Aucun lien renseigné.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Modifier les liens/i })).toBeInTheDocument()
  })

  it('ouvre la modale de modification des liens', async () => {
    const user = userEvent.setup()
    renderSidebar({ isOwnProfile: true })

    await user.click(screen.getByRole('button', { name: /Modifier les liens/i }))
    expect(screen.getByTestId('edit-links-dialog')).toBeInTheDocument()
  })

  it('affiche un état de chargement des groupes', () => {
    const { container } = renderSidebar({ groupsLoading: true })
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0)
  })

  it('affiche une erreur de chargement des groupes', () => {
    renderSidebar({ groupsError: new Error('boom') })
    expect(screen.getByText('Impossible de récupérer les groupes.')).toBeInTheDocument()
  })

  it("affiche l'état vide des groupes", () => {
    renderSidebar({ groups: [] })
    expect(screen.getByText('Aucun groupe rejoint.')).toBeInTheDocument()
  })

  it('affiche les groupes rejoints avec des liens', () => {
    renderSidebar({ groups })
    expect(screen.getByRole('link', { name: 'React' })).toHaveAttribute('href', '/group/1')
    expect(screen.getByRole('link', { name: 'Symfony' })).toHaveAttribute('href', '/group/2')
  })

  it("ouvre le sélecteur d'avatar et enregistre le nouvel avatar", async () => {
    mockUpdateAvatarMutateAsync.mockResolvedValueOnce({})
    const user = userEvent.setup()
    renderSidebar({ isOwnProfile: true })

    await user.click(screen.getByRole('button', { name: /Modifier la photo de profil/i }))
    await user.click(screen.getByRole('button', { name: 'Choisir un nouvel avatar' }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(mockUpdateAvatarMutateAsync).toHaveBeenCalledWith({
      userId: 10,
      avatarUrl: 'https://cdn.test/new-avatar.png',
    }))
    expect(mockSetUserAvatar).toHaveBeenCalledWith('https://cdn.test/new-avatar.png')
  })

  it("annule le changement d'avatar", async () => {
    const user = userEvent.setup()
    renderSidebar({ isOwnProfile: true })

    await user.click(screen.getByRole('button', { name: /Modifier la photo de profil/i }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByText('Modifier la photo de profil')).not.toBeInTheDocument()
    expect(mockUpdateAvatarMutateAsync).not.toHaveBeenCalled()
  })
})
