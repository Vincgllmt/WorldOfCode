import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Navbar from '@/components/layout/Navbar'
import { useConversations, useConversationRealtime } from '@/hooks/useConversations'
import { useNotificationRealtime } from '@/hooks/useNotifications'
import { getMyMentorProfile } from '@/lib/api/mentoring/profile'
import { getMentoringRequestsMine } from '@/lib/api/mentoring/requests'
import { updateUserTheme } from '@/services/userService'
import { useTheme } from 'next-themes'

jest.mock('@/hooks/useConversations', () => ({
  useConversations: jest.fn(),
  useConversationRealtime: jest.fn(),
}))
jest.mock('@/hooks/useNotifications', () => ({
  useNotificationRealtime: jest.fn(),
}))
jest.mock('@/lib/api/mentoring/profile', () => ({
  getMyMentorProfile: jest.fn(),
}))
jest.mock('@/lib/api/mentoring/requests', () => ({
  getMentoringRequestsMine: jest.fn(),
}))
jest.mock('@/services/userService', () => ({
  updateUserTheme: jest.fn(),
}))
jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}))
jest.mock('@/components/layout/NavbarSearch', () => ({
  __esModule: true,
  default: () => <div data-testid="navbar-search" />,
}))
jest.mock('@/components/layout/NotificationBell', () => ({
  __esModule: true,
  default: () => <div data-testid="notification-bell" />,
}))

const mockOpenSettings = jest.fn()
jest.mock('@/contexts/SettingsModalContext', () => ({
  useSettingsModal: () => ({ openSettings: mockOpenSettings, closeSettings: jest.fn() }),
}))

const mockLogout = jest.fn()
const mockSetUserTheme = jest.fn()
let mockUser: { id: number; username: string; avatarUrl?: string | null } | null = {
  id: 1, username: 'jdupont', avatarUrl: null,
}
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout, setUserTheme: mockSetUserTheme }),
}))

let mockPathname = '/home'
const mockSearchParams = new URLSearchParams()
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}))

const mockedUseConversations = useConversations as jest.MockedFunction<typeof useConversations>
const mockedUseConversationRealtime = useConversationRealtime as jest.MockedFunction<typeof useConversationRealtime>
const mockedUseNotificationRealtime = useNotificationRealtime as jest.MockedFunction<typeof useNotificationRealtime>
const mockedGetMentorProfile = getMyMentorProfile as jest.MockedFunction<typeof getMyMentorProfile>
const mockedGetRequestsMine = getMentoringRequestsMine as jest.MockedFunction<typeof getMentoringRequestsMine>
const mockedUpdateUserTheme = updateUserTheme as jest.MockedFunction<typeof updateUserTheme>
const mockSetTheme = jest.fn()
const mockedUseTheme = useTheme as jest.MockedFunction<typeof useTheme>

function mockHooks({
  conversations = [],
  mentorProfile,
  myRequests = [],
  theme = 'light',
}: {
  conversations?: any[]
  mentorProfile?: any
  myRequests?: any[]
  theme?: string
} = {}) {
  mockedUseConversationRealtime.mockReturnValue(undefined as any)
  mockedUseNotificationRealtime.mockReturnValue(undefined as any)
  mockedUseConversations.mockReturnValue({ data: conversations } as any)
  mockedGetMentorProfile.mockResolvedValue(mentorProfile)
  mockedGetRequestsMine.mockResolvedValue(myRequests)
  mockedUseTheme.mockReturnValue({ theme, setTheme: mockSetTheme, resolvedTheme: theme } as any)
  mockedUpdateUserTheme.mockResolvedValue(undefined as any)
}

function renderNavbar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <Navbar />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPathname = '/home'
  mockUser = { id: 1, username: 'jdupont', avatarUrl: null }
  mockHooks()
})

describe('Navbar', () => {
  it('affiche le logo et les liens de navigation', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: /World of Code/i })).toHaveAttribute('href', '/home')
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/home')
    expect(screen.getByRole('link', { name: 'Groupes' })).toHaveAttribute('href', '/group')
  })

  it('ouvre Code Arena dans un nouvel onglet', () => {
    renderNavbar()
    const link = screen.getByRole('link', { name: 'Code Arena' })
    expect(link).toHaveAttribute('href', '/arena')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('met en avant le lien actif selon le chemin courant', () => {
    mockPathname = '/group'
    renderNavbar()
    expect(screen.getByRole('link', { name: 'Groupes' })).toHaveClass('text-primary')
    expect(screen.getByRole('link', { name: 'Accueil' })).not.toHaveClass('text-primary')
  })

  it("n'affiche pas la cloche de notifications ni le menu sans utilisateur connecté", () => {
    mockUser = null
    renderNavbar()
    expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument()
    expect(screen.queryByText('JD')).not.toBeInTheDocument()
  })

  it('affiche la cloche de notifications et le menu utilisateur une fois connecté', async () => {
    renderNavbar()
    expect(await screen.findByTestId('notification-bell')).toBeInTheDocument()
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('ouvre le menu utilisateur et affiche le nom, les paramètres et la déconnexion', async () => {
    const user = userEvent.setup()
    renderNavbar()

    await user.click(await screen.findByText('JD'))

    expect(screen.getByRole('menuitem', { name: /jdupont/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Paramètres/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Déconnexion/i })).toBeInTheDocument()
  })

  it('ouvre les paramètres au clic sur "Paramètres"', async () => {
    const user = userEvent.setup()
    renderNavbar()

    await user.click(await screen.findByText('JD'))
    await user.click(screen.getByRole('menuitem', { name: /Paramètres/i }))

    expect(mockOpenSettings).toHaveBeenCalledWith('profile')
  })

  it('déconnecte au clic sur "Déconnexion"', async () => {
    const user = userEvent.setup()
    renderNavbar()

    await user.click(await screen.findByText('JD'))
    await user.click(screen.getByRole('menuitem', { name: /Déconnexion/i }))

    expect(mockLogout).toHaveBeenCalled()
  })

  it('affiche "Mon espace mentor" seulement si un profil mentor existe', async () => {
    mockHooks({ mentorProfile: { id: 1 } })
    const user = userEvent.setup()
    renderNavbar()

    await user.click(await screen.findByText('JD'))

    expect(await screen.findByRole('menuitem', { name: /Mon espace mentor/i })).toBeInTheDocument()
  })

  it("n'affiche pas \"Mon espace mentor\" sans profil mentor", async () => {
    const user = userEvent.setup()
    renderNavbar()

    await user.click(await screen.findByText('JD'))

    expect(screen.queryByRole('menuitem', { name: /Mon espace mentor/i })).not.toBeInTheDocument()
  })

  it('affiche "Mes demandes de mentorat" seulement si des demandes existent', async () => {
    mockHooks({ myRequests: [{ id: 1 }] })
    const user = userEvent.setup()
    renderNavbar()

    await user.click(await screen.findByText('JD'))

    expect(await screen.findByRole('menuitem', { name: /Mes demandes de mentorat/i })).toBeInTheDocument()
  })

  it('change de thème via le sous-menu Apparence', async () => {
    const user = userEvent.setup()
    renderNavbar()

    await user.click(await screen.findByText('JD'))
    await user.click(screen.getByText('Apparence'))
    // La séquence pointerdown/pointerup complète de userEvent sur un item de
    // sous-menu Radix (imbriqué dans un second portail) ne déclenche pas le
    // onClick sous jsdom ; un simple évènement `click` reproduit fidèlement
    // ce qu'un vrai clic déclenche côté React (délégation par bulles).
    fireEvent.click(await screen.findByText('Sombre Vert'))

    expect(mockSetTheme).toHaveBeenCalledWith('dark')
    expect(mockSetUserTheme).toHaveBeenCalledWith('dark')
    await waitFor(() => expect(mockedUpdateUserTheme).toHaveBeenCalledWith(1, 'dark'))
  })

  it("affiche un indicateur de message non lu pour une conversation reçue non lue", async () => {
    mockHooks({
      conversations: [
        { id: 'c1', lastMessage: { read: false, sender: { id: 2 } } },
      ],
    })
    renderNavbar()
    await screen.findByTestId('notification-bell')
    const messageLink = document.querySelector('a[href="/message"]')!
    expect(messageLink.querySelector('.bg-red-500')).toBeInTheDocument()
  })

  it("n'affiche pas d'indicateur pour un message déjà lu", async () => {
    mockHooks({
      conversations: [
        { id: 'c1', lastMessage: { read: true, sender: { id: 2 } } },
      ],
    })
    renderNavbar()
    await screen.findByTestId('notification-bell')
    const messageLink = document.querySelector('a[href="/message"]')!
    expect(messageLink.querySelector('.bg-red-500')).not.toBeInTheDocument()
  })
})
