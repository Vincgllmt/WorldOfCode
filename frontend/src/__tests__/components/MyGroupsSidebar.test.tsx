import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import MyGroupsSidebar from '@/components/group/MyGroupsSidebar'

// Mock useAuth
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, username: 'testuser' } }),
}))

// Mock useUserGroups
const mockUseUserGroups = jest.fn()
jest.mock('@/hooks/useUsers', () => ({
  useUserGroups: (...args: unknown[]) => mockUseUserGroups(...args),
}))

// Mock getMyMentorProfile (hors périmètre de ces tests)
jest.mock('@/lib/api/mentoring/profile', () => ({
  getMyMentorProfile: jest.fn(() => Promise.resolve({ id: 1 })),
}))

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

beforeEach(() => {
  jest.clearAllMocks()
})

const createGroups = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Groupe ${String.fromCharCode(65 + i)}`,
  }))

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return render(ui, { wrapper })
}

describe('MyGroupsSidebar', () => {
  it('affiche le skeleton loader pendant le chargement', () => {
    mockUseUserGroups.mockReturnValue({ data: undefined, isLoading: true })

    renderWithClient(<MyGroupsSidebar />)
    expect(screen.getByText('Mes groupes')).toBeInTheDocument()
  })

  it('affiche un message si aucun groupe rejoint', () => {
    mockUseUserGroups.mockReturnValue({ data: [], isLoading: false })

    renderWithClient(<MyGroupsSidebar />)
    expect(screen.getByText(/aucun groupe/i)).toBeInTheDocument()
  })

  it('affiche la liste des groupes', () => {
    mockUseUserGroups.mockReturnValue({ data: createGroups(3), isLoading: false })

    renderWithClient(<MyGroupsSidebar />)
    expect(screen.getByText('Groupe A')).toBeInTheDocument()
    expect(screen.getByText('Groupe B')).toBeInTheDocument()
    expect(screen.getByText('Groupe C')).toBeInTheDocument()
  })

  it('affiche le compteur de groupes', () => {
    mockUseUserGroups.mockReturnValue({ data: createGroups(5), isLoading: false })

    renderWithClient(<MyGroupsSidebar />)
    expect(screen.getByText('(5)')).toBeInTheDocument()
  })

  it('affiche tous les groupes dans une liste scrollable', () => {
    mockUseUserGroups.mockReturnValue({ data: createGroups(12), isLoading: false })

    renderWithClient(<MyGroupsSidebar />)
    // La liste n'est plus plafonnée à 8, elle scrolle à la place
    expect(screen.getByText('Groupe A')).toBeInTheDocument()
    expect(screen.getByText('Groupe H')).toBeInTheDocument()
    expect(screen.getByText('Groupe I')).toBeInTheDocument()
    expect(screen.getByText('Groupe L')).toBeInTheDocument()
  })

  it('affiche la recherche quand plus de 3 groupes', () => {
    mockUseUserGroups.mockReturnValue({ data: createGroups(5), isLoading: false })

    renderWithClient(<MyGroupsSidebar />)
    expect(screen.getByPlaceholderText('Rechercher...')).toBeInTheDocument()
  })

  it('ne montre pas la recherche avec 3 groupes ou moins', () => {
    mockUseUserGroups.mockReturnValue({ data: createGroups(2), isLoading: false })

    renderWithClient(<MyGroupsSidebar />)
    expect(screen.queryByPlaceholderText('Rechercher...')).not.toBeInTheDocument()
  })

  it('filtre les groupes avec la recherche (startsWith)', () => {
    const groups = [
      { id: 1, name: 'Docker Club' },
      { id: 2, name: 'DevOps Team' },
      { id: 3, name: 'React Fans' },
      { id: 4, name: 'Rust Lovers' },
    ]
    mockUseUserGroups.mockReturnValue({ data: groups, isLoading: false })

    renderWithClient(<MyGroupsSidebar />)

    const searchInput = screen.getByPlaceholderText('Rechercher...')
    fireEvent.change(searchInput, { target: { value: 'd' } })

    expect(screen.getByText('Docker Club')).toBeInTheDocument()
    expect(screen.getByText('DevOps Team')).toBeInTheDocument()
    expect(screen.queryByText('React Fans')).not.toBeInTheDocument()
    expect(screen.queryByText('Rust Lovers')).not.toBeInTheDocument()
  })

  it('affiche un message quand la recherche ne trouve rien', () => {
    mockUseUserGroups.mockReturnValue({ data: createGroups(5), isLoading: false })

    renderWithClient(<MyGroupsSidebar />)

    const searchInput = screen.getByPlaceholderText('Rechercher...')
    fireEvent.change(searchInput, { target: { value: 'zzz' } })

    expect(screen.getByText(/aucun groupe trouvé/i)).toBeInTheDocument()
  })

  it('affiche le lien vers tous les groupes', () => {
    mockUseUserGroups.mockReturnValue({ data: createGroups(2), isLoading: false })

    renderWithClient(<MyGroupsSidebar />)
    const link = screen.getByText('Voir tous les groupes')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/group')
  })

  it('affiche l\'initiale du groupe en badge', () => {
    mockUseUserGroups.mockReturnValue({
      data: [{ id: 1, name: 'typescript' }],
      isLoading: false,
    })

    renderWithClient(<MyGroupsSidebar />)
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('crée des liens vers les pages de chaque groupe', () => {
    mockUseUserGroups.mockReturnValue({
      data: [{ id: 42, name: 'Mon Groupe' }],
      isLoading: false,
    })

    renderWithClient(<MyGroupsSidebar />)
    const link = screen.getByText('Mon Groupe').closest('a')
    expect(link).toHaveAttribute('href', '/group/42')
  })
})
