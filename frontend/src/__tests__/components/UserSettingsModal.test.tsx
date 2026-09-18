import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserSettingsModal from '@/components/profile/UserSettingsModal'
import { useUser, useUpdateUser, useChangePassword, useDeleteUser } from '@/hooks/useUsers'
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications'
import type { User } from '@/interfaces/user'

jest.mock('@/hooks/useUsers', () => ({
  useUser: jest.fn(),
  useUpdateUser: jest.fn(),
  useChangePassword: jest.fn(),
  useDeleteUser: jest.fn(),
}))
jest.mock('@/hooks/useBrowserNotifications', () => ({
  useBrowserNotifications: jest.fn(),
}))

const mockLogout = jest.fn()
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ logout: mockLogout }),
}))

const mockedUseUser = useUser as jest.MockedFunction<typeof useUser>
const mockedUseUpdateUser = useUpdateUser as jest.MockedFunction<typeof useUpdateUser>
const mockedUseChangePassword = useChangePassword as jest.MockedFunction<typeof useChangePassword>
const mockedUseDeleteUser = useDeleteUser as jest.MockedFunction<typeof useDeleteUser>
const mockedUseBrowserNotifications = useBrowserNotifications as jest.MockedFunction<typeof useBrowserNotifications>

const mockUpdateMutate = jest.fn()
const mockChangePasswordMutate = jest.fn()
const mockDeleteMutate = jest.fn()

const baseUser: User = {
  id: 10,
  username: 'jdupont',
  role: 'ROLE_USER',
  email: 'j.dupont@example.com',
  firstname: 'Jean',
  lastname: 'Dupont',
  creationDate: '2026-01-01T00:00:00Z',
  updatedDate: '2026-01-01T00:00:00Z',
}

function mockHooks({
  user = baseUser,
  isLoading = false,
  notifState = {},
}: {
  user?: User | undefined
  isLoading?: boolean
  notifState?: Partial<ReturnType<typeof useBrowserNotifications>>
} = {}) {
  mockedUseUser.mockReturnValue({ data: user, isLoading } as any)
  mockedUseUpdateUser.mockReturnValue({ mutate: mockUpdateMutate, isPending: false } as any)
  mockedUseChangePassword.mockReturnValue({ mutate: mockChangePasswordMutate, isPending: false } as any)
  mockedUseDeleteUser.mockReturnValue({ mutate: mockDeleteMutate, isPending: false } as any)
  mockedUseBrowserNotifications.mockReturnValue({
    permission: 'default',
    enabled: false,
    isSupported: true,
    requestPermission: jest.fn(),
    disable: jest.fn(),
    showNotification: jest.fn(),
    ...notifState,
  } as any)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockHooks()
})

describe('UserSettingsModal', () => {
  it('affiche un état de chargement', () => {
    mockHooks({ isLoading: true })
    render(<UserSettingsModal userId={10} open onOpenChange={jest.fn()} />)
    // Le Dialog est monté dans un portail (document.body), hors du container de render.
    expect(document.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0)
  })

  it("pré-remplit le formulaire de profil avec les données de l'utilisateur", () => {
    render(<UserSettingsModal userId={10} open onOpenChange={jest.fn()} />)

    expect(screen.getByLabelText('Nom d’utilisateur')).toHaveValue('jdupont')
    expect(screen.getByLabelText('Prénom')).toHaveValue('Jean')
    expect(screen.getByLabelText('Nom')).toHaveValue('Dupont')
    expect(screen.getByLabelText('Email')).toHaveValue('j.dupont@example.com')
  })

  it('ouvre directement l\'onglet indiqué par initialTab', () => {
    render(<UserSettingsModal userId={10} open onOpenChange={jest.fn()} initialTab="password" />)
    expect(screen.getByLabelText('Mot de passe actuel')).toBeInTheDocument()
  })

  it('affiche une erreur de validation sur un nom d\'utilisateur trop court', async () => {
    const user = userEvent.setup()
    render(<UserSettingsModal userId={10} open onOpenChange={jest.fn()} />)

    const usernameInput = screen.getByLabelText('Nom d’utilisateur')
    await user.clear(usernameInput)
    await user.type(usernameInput, 'ab')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(await screen.findByText('Le nom d’utilisateur doit contenir au moins 3 caractères')).toBeInTheDocument()
    expect(mockUpdateMutate).not.toHaveBeenCalled()
  })

  it('soumet le profil après confirmation puis déconnecte', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    mockUpdateMutate.mockImplementation((_payload, { onSuccess }) => onSuccess())
    const onOpenChange = jest.fn()
    const user = userEvent.setup()
    render(<UserSettingsModal userId={10} open onOpenChange={onOpenChange} />)

    const usernameInput = screen.getByLabelText('Nom d’utilisateur')
    await user.clear(usernameInput)
    await user.type(usernameInput, 'nouveaupseudo')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10, username: 'nouveaupseudo', role: 'ROLE_USER' }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    ))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mockLogout).toHaveBeenCalled()
  })

  it('annule la soumission du profil si la confirmation est refusée', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<UserSettingsModal userId={10} open onOpenChange={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(mockUpdateMutate).not.toHaveBeenCalled()
  })

  it('affiche une erreur si le nouveau mot de passe ne respecte pas la complexité requise', async () => {
    const user = userEvent.setup()
    render(<UserSettingsModal userId={10} open onOpenChange={jest.fn()} initialTab="password" />)

    await user.type(screen.getByLabelText('Mot de passe actuel'), 'ancienMDP123!')
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'trop-simple')
    await user.type(screen.getByLabelText('Confirmation'), 'trop-simple')
    await user.click(screen.getByRole('button', { name: 'Modifier le mot de passe' }))

    expect(await screen.findByText(/doit contenir au moins 12 caractères/)).toBeInTheDocument()
    expect(mockChangePasswordMutate).not.toHaveBeenCalled()
  })

  it('affiche une erreur si la confirmation ne correspond pas au nouveau mot de passe', async () => {
    const user = userEvent.setup()
    render(<UserSettingsModal userId={10} open onOpenChange={jest.fn()} initialTab="password" />)

    await user.type(screen.getByLabelText('Mot de passe actuel'), 'ancienMDP123!')
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'NouveauMDP123!')
    await user.type(screen.getByLabelText('Confirmation'), 'AutreChose123!')
    await user.click(screen.getByRole('button', { name: 'Modifier le mot de passe' }))

    expect(await screen.findByText('La confirmation doit correspondre au nouveau mot de passe.')).toBeInTheDocument()
  })

  it('change le mot de passe avec des valeurs valides', async () => {
    mockChangePasswordMutate.mockImplementation((_payload, { onSuccess }) => onSuccess())
    const onOpenChange = jest.fn()
    const user = userEvent.setup()
    render(<UserSettingsModal userId={10} open onOpenChange={onOpenChange} initialTab="password" />)

    await user.type(screen.getByLabelText('Mot de passe actuel'), 'ancienMDP123!')
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'NouveauMDP123!')
    await user.type(screen.getByLabelText('Confirmation'), 'NouveauMDP123!')
    await user.click(screen.getByRole('button', { name: 'Modifier le mot de passe' }))

    await waitFor(() => expect(mockChangePasswordMutate).toHaveBeenCalledWith(
      { id: 10, currentPassword: 'ancienMDP123!', newPassword: 'NouveauMDP123!' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    ))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('affiche un message quand les notifications ne sont pas supportées', () => {
    mockHooks({ notifState: { isSupported: false } })
    render(<UserSettingsModal userId={10} open onOpenChange={jest.fn()} initialTab="notifications" />)
    expect(screen.getByText('Votre navigateur ne supporte pas les notifications.')).toBeInTheDocument()
  })

  it('affiche un message quand les notifications sont bloquées', () => {
    mockHooks({ notifState: { permission: 'denied' } })
    render(<UserSettingsModal userId={10} open onOpenChange={jest.fn()} initialTab="notifications" />)
    expect(screen.getByText(/Les notifications sont bloquées/)).toBeInTheDocument()
  })

  it('active les notifications au clic', async () => {
    const requestPermission = jest.fn().mockResolvedValue(true)
    mockHooks({ notifState: { requestPermission } })
    const user = userEvent.setup()
    render(<UserSettingsModal userId={10} open onOpenChange={jest.fn()} initialTab="notifications" />)

    await user.click(screen.getByRole('button', { name: /Activer les notifications/i }))
    expect(requestPermission).toHaveBeenCalled()
  })

  it('désactive les notifications au clic quand elles sont actives', async () => {
    const disable = jest.fn()
    mockHooks({ notifState: { enabled: true, permission: 'granted', disable } })
    const user = userEvent.setup()
    render(<UserSettingsModal userId={10} open onOpenChange={jest.fn()} initialTab="notifications" />)

    expect(screen.getByText('Notifications activées')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Désactiver/i }))
    expect(disable).toHaveBeenCalled()
  })

  it('supprime le compte après confirmation dans la boîte de dialogue', async () => {
    mockDeleteMutate.mockImplementation((_id, { onSuccess }) => onSuccess())
    const onOpenChange = jest.fn()
    const user = userEvent.setup()
    render(<UserSettingsModal userId={10} open onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('button', { name: 'Supprimer mon compte' }))
    expect(await screen.findByText('Supprimer votre compte ?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmer la suppression' }))

    await waitFor(() => expect(mockDeleteMutate).toHaveBeenCalledWith(10, expect.objectContaining({ onSuccess: expect.any(Function) })))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mockLogout).toHaveBeenCalled()
  })

  it('annule la suppression du compte', async () => {
    const user = userEvent.setup()
    render(<UserSettingsModal userId={10} open onOpenChange={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Supprimer mon compte' }))
    await user.click(await screen.findByRole('button', { name: 'Annuler' }))

    expect(mockDeleteMutate).not.toHaveBeenCalled()
    expect(screen.queryByText('Supprimer votre compte ?')).not.toBeInTheDocument()
  })
})
