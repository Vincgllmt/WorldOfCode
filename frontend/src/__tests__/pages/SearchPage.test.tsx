import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SearchPage from '@/app/search/page'
import { search } from '@/services/searchService'
import type { SearchResponse } from '@/interfaces/search'

jest.mock('@/services/searchService', () => ({
  search: jest.fn(),
}))

const mockPush = jest.fn()
let mockSearchParams = new URLSearchParams()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}))

const mockedSearch = search as jest.MockedFunction<typeof search>

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <SearchPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSearchParams = new URLSearchParams()
})

describe('SearchPage', () => {
  it("invite à taper un terme quand l'URL ne contient pas de requête", () => {
    renderPage()
    expect(screen.getByText(/Tapez un terme pour rechercher/i)).toBeInTheDocument()
    expect(mockedSearch).not.toHaveBeenCalled()
  })

  it('affiche les résultats groupés par catégorie avec leur nombre', async () => {
    mockSearchParams = new URLSearchParams('q=react')
    const response: SearchResponse = {
      users: [{ id: 1, username: 'alice', firstname: 'Alice', lastname: 'Martin', avatarUrl: null }],
      groups: [{ id: 2, name: 'Dev Team' }],
      posts: [{
        id: 3, authorId: 1, authorUsername: 'alice', groupId: null, groupName: 'Dev Team',
        snippet: 'Un article sur <mark>React</mark>', createdAt: '2026-01-01T00:00:00Z', score: 1,
      }],
    }
    mockedSearch.mockResolvedValueOnce(response)
    renderPage()

    expect(await screen.findByText('Utilisateurs (1)')).toBeInTheDocument()
    expect(screen.getByText('Groupes (1)')).toBeInTheDocument()
    expect(screen.getByText('Publications (1)')).toBeInTheDocument()
    expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    // "Dev Team" apparaît deux fois : la carte du groupe et le libellé du groupe sur la publication.
    expect(screen.getAllByText('Dev Team')).toHaveLength(2)
    expect(screen.getByText('3 resultats pour « react »')).toBeInTheDocument()
    expect(mockedSearch).toHaveBeenCalledWith({ q: 'react', limit: 20 })
  })

  it('affiche un message quand aucun résultat ne correspond', async () => {
    mockSearchParams = new URLSearchParams('q=zzz')
    mockedSearch.mockResolvedValueOnce({ users: [], groups: [], posts: [] })
    renderPage()

    expect(await screen.findByText('Aucun resultat pour « zzz »')).toBeInTheDocument()
  })

  it('affiche une erreur si la recherche échoue', async () => {
    mockSearchParams = new URLSearchParams('q=react')
    mockedSearch.mockRejectedValueOnce(new Error('boom'))
    renderPage()

    expect(await screen.findByText('Erreur lors de la recherche.')).toBeInTheDocument()
  })

  it('échappe le HTML du snippet en conservant les balises <mark>', async () => {
    mockSearchParams = new URLSearchParams('q=react')
    mockedSearch.mockResolvedValueOnce({
      users: [], groups: [],
      posts: [{
        id: 1, authorId: 1, authorUsername: 'alice', groupId: null, groupName: null,
        snippet: '<b>x</b> <mark>React</mark>', createdAt: null, score: 1,
      }],
    })
    renderPage()

    await screen.findByText('Publications (1)')
    expect(document.querySelector('mark')).toHaveTextContent('React')
    expect(document.querySelector('b')).not.toBeInTheDocument()
  })

  it('affiche les métadonnées de la publication (auteur, groupe, date)', async () => {
    mockSearchParams = new URLSearchParams('q=react')
    mockedSearch.mockResolvedValueOnce({
      users: [], groups: [],
      posts: [{
        id: 1, authorId: 1, authorUsername: 'alice', groupId: 2, groupName: 'Dev Team',
        snippet: 'contenu', createdAt: '2026-01-05T00:00:00Z', score: 1,
      }],
    })
    renderPage()

    expect(await screen.findByText('@alice')).toBeInTheDocument()
    expect(screen.getByText('Dev Team')).toBeInTheDocument()
    expect(screen.getByText('5 janv. 2026')).toBeInTheDocument()
  })

  it('navigue vers une nouvelle recherche à la soumission du formulaire', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText(/Rechercher utilisateur/i), 'symfony{Enter}')

    expect(mockPush).toHaveBeenCalledWith('/search?q=symfony')
  })

  it('affiche les liens corrects vers chaque type de résultat', async () => {
    mockSearchParams = new URLSearchParams('q=react')
    mockedSearch.mockResolvedValueOnce({
      users: [{ id: 1, username: 'alice', firstname: null, lastname: null, avatarUrl: null }],
      groups: [{ id: 2, name: 'Dev Team' }],
      posts: [{ id: 3, authorId: 1, authorUsername: 'alice', groupId: null, groupName: null, snippet: 'x', createdAt: null, score: 1 }],
    })
    renderPage()

    await screen.findByText('Utilisateurs (1)')
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(hrefs).toContain('/user/1')
    expect(hrefs).toContain('/group/2')
    expect(hrefs).toContain('/post/3')
  })
})
