import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NavbarSearch from '@/components/layout/NavbarSearch'
import { useNavbarSearch } from '@/hooks/useNavbarSearch'
import type { UserPreview, GroupPreview, PostPreview } from '@/interfaces/search'

jest.mock('@/hooks/useNavbarSearch', () => ({
  useNavbarSearch: jest.fn(),
}))

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockedUseNavbarSearch = useNavbarSearch as jest.MockedFunction<typeof useNavbarSearch>

const alice: UserPreview = { id: 1, username: 'alice', firstname: 'Alice', lastname: 'Martin', avatarUrl: null }
const devGroup: GroupPreview = { id: 2, name: 'Dev Team' }
const postPreview: PostPreview = {
  id: 3, authorId: 1, authorUsername: 'alice', groupId: null, groupName: null,
  snippet: 'Un <mark>super</mark> article', createdAt: '2026-01-01T00:00:00Z', score: 1,
}

function mockSearchState({
  users = [],
  groups = [],
  posts = [],
  isLoading = false,
  isFetching = false,
  error,
  debouncedQuery = '',
}: {
  users?: UserPreview[]
  groups?: GroupPreview[]
  posts?: PostPreview[]
  isLoading?: boolean
  isFetching?: boolean
  error?: Error
  debouncedQuery?: string
} = {}) {
  mockedUseNavbarSearch.mockReturnValue({ users, groups, posts, isLoading, isFetching, error, debouncedQuery })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSearchState()
})

describe('NavbarSearch', () => {
  it("n'affiche aucune suggestion tant que la recherche est vide", () => {
    render(<NavbarSearch />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('affiche les utilisateurs, groupes et publications trouvés', async () => {
    mockSearchState({ users: [alice], groups: [devGroup], posts: [postPreview], debouncedQuery: 'a' })
    const user = userEvent.setup()
    render(<NavbarSearch />)

    await user.type(screen.getByRole('combobox'), 'a')

    expect(await screen.findByRole('listbox')).toBeInTheDocument()
    expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    expect(screen.getByText('Dev Team')).toBeInTheDocument()
    expect(screen.getByText('Groupe')).toBeInTheDocument()
    // "@alice" apparaît deux fois : sous-titre de l'utilisateur ET libellé de la publication (auteur).
    expect(screen.getAllByText('@alice')).toHaveLength(2)
  })

  it('affiche un message "Aucun résultat" si la recherche ne trouve rien', async () => {
    mockSearchState({ debouncedQuery: 'zzz' })
    const user = userEvent.setup()
    render(<NavbarSearch />)

    await user.type(screen.getByRole('combobox'), 'zzz')

    expect(await screen.findByText('Aucun résultat')).toBeInTheDocument()
  })

  it('affiche un message d\'erreur si la recherche échoue', async () => {
    mockSearchState({ debouncedQuery: 'a', error: new Error('boom') })
    const user = userEvent.setup()
    render(<NavbarSearch />)

    await user.type(screen.getByRole('combobox'), 'a')

    expect(await screen.findByText('Erreur de recherche')).toBeInTheDocument()
  })

  it('sélectionne un résultat au clic et navigue vers son href', async () => {
    mockSearchState({ users: [alice], debouncedQuery: 'a' })
    const user = userEvent.setup()
    render(<NavbarSearch />)

    await user.type(screen.getByRole('combobox'), 'a')
    await user.click(await screen.findByText('Alice Martin'))

    expect(mockPush).toHaveBeenCalledWith('/user/1')
    expect(screen.getByRole('combobox')).toHaveValue('')
  })

  it('navigue au résultat surligné avec Entrée après une navigation au clavier', async () => {
    mockSearchState({ users: [alice], groups: [devGroup], debouncedQuery: 'a' })
    const user = userEvent.setup()
    render(<NavbarSearch />)

    const input = screen.getByRole('combobox')
    await user.type(input, 'a')
    await screen.findByRole('listbox')

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: /Alice Martin/ })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: /Dev Team/ })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Enter}')
    expect(mockPush).toHaveBeenCalledWith('/group/2')
  })

  it("navigue vers la page de recherche complète sur Entrée sans sélection", async () => {
    mockSearchState({ users: [alice], debouncedQuery: 'alice' })
    const user = userEvent.setup()
    render(<NavbarSearch />)

    await user.type(screen.getByRole('combobox'), 'alice{Enter}')

    expect(mockPush).toHaveBeenCalledWith('/search?q=alice')
  })

  it('ferme les suggestions avec Échap', async () => {
    mockSearchState({ users: [alice], debouncedQuery: 'a' })
    const user = userEvent.setup()
    render(<NavbarSearch />)

    await user.type(screen.getByRole('combobox'), 'a')
    await screen.findByRole('listbox')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('affiche le bouton "Voir tous les résultats" et navigue au clic', async () => {
    mockSearchState({ users: [alice], debouncedQuery: 'a' })
    const user = userEvent.setup()
    render(<NavbarSearch />)

    await user.type(screen.getByRole('combobox'), 'a')
    await user.click(await screen.findByRole('button', { name: /Voir tous les résultats/i }))

    expect(mockPush).toHaveBeenCalledWith('/search?q=a')
  })

  it('échappe le HTML du snippet tout en conservant les balises <mark>', async () => {
    mockSearchState({ posts: [{ ...postPreview, snippet: '<b>x</b> <mark>super</mark>' }], debouncedQuery: 'super' })
    const user = userEvent.setup()
    render(<NavbarSearch />)

    await user.type(screen.getByRole('combobox'), 'super')
    await screen.findByRole('listbox')

    expect(document.querySelector('mark')).toHaveTextContent('super')
    expect(document.querySelector('b')).not.toBeInTheDocument()
  })
})
