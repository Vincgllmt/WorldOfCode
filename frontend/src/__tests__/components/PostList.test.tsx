import { render, screen } from '@testing-library/react'
import PostList from '@/components/post/PostList'
import { useInfinitePosts } from '@/hooks/useInfinitePosts'
import { useInfiniteFeed } from '@/hooks/useInfiniteFeed'
import { usePosts } from '@/hooks/usePosts'
import type { Post } from '@/interfaces/post'
import type { TechWatchItem } from '@/interfaces/techWatch'

jest.mock('@/hooks/useInfinitePosts', () => ({
  useInfinitePosts: jest.fn(),
}))
jest.mock('@/hooks/useInfiniteFeed', () => ({
  useInfiniteFeed: jest.fn(),
}))
jest.mock('@/hooks/usePosts', () => ({
  usePosts: jest.fn(),
}))
jest.mock('@/components/post/PostItem', () => ({
  __esModule: true,
  default: ({ post }: { post: Post }) => <div data-testid="post-item">{post.id}</div>,
}))
jest.mock('@/components/techwatch/TechWatchCard', () => ({
  __esModule: true,
  default: ({ item }: { item: TechWatchItem }) => <div data-testid="rss-item">{item.id}</div>,
}))

const mockedUseInfinitePosts = useInfinitePosts as jest.MockedFunction<typeof useInfinitePosts>
const mockedUseInfiniteFeed = useInfiniteFeed as jest.MockedFunction<typeof useInfiniteFeed>
const mockedUsePosts = usePosts as jest.MockedFunction<typeof usePosts>

const makePost = (id: number, createdAt: string): Post => ({
  id,
  content: `contenu ${id}`,
  createdAt,
  updatedAt: null,
  authorId: 1,
  authorUsername: 'alice',
  likesCount: 0,
  likedByUser: false,
  sharedCount: 0,
  commentsCount: 0,
})

const rssItem: TechWatchItem = {
  id: 99,
  title: 'Un article',
  description: null,
  url: 'https://example.com',
  imageUrl: null,
  publishedAt: null,
  fetchedAt: '2026-01-01T00:00:00Z',
  sourceName: 'Source',
}

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  callback: ObserverCallback
  observe = jest.fn()
  disconnect = jest.fn()
  unobserve = jest.fn()

  constructor(callback: ObserverCallback) {
    this.callback = callback
    FakeIntersectionObserver.instances.push(this)
  }
}

const defaultInfiniteResult = {
  data: undefined,
  isLoading: false,
  error: null,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
} as unknown as ReturnType<typeof useInfinitePosts>

const defaultFeedResult = {
  data: undefined,
  isLoading: false,
  error: null,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
} as unknown as ReturnType<typeof useInfiniteFeed>

describe('PostList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    FakeIntersectionObserver.instances = []
    ;(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver

    mockedUseInfinitePosts.mockReturnValue(defaultInfiniteResult)
    mockedUseInfiniteFeed.mockReturnValue(defaultFeedResult)
    mockedUsePosts.mockReturnValue({ posts: undefined, isLoading: false, error: null } as unknown as ReturnType<
      typeof usePosts
    >)
  })

  it('affiche le squelette de chargement quand isLoading est vrai', () => {
    const { container } = render(<PostList posts={null} isLoading={true} />)
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)
  })

  it("affiche un message d'erreur quand isError est vrai", () => {
    render(<PostList posts={null} isError={true} />)
    expect(screen.getByText('Erreur lors du chargement des posts.')).toBeInTheDocument()
  })

  it('affiche le message vide personnalisé quand il n’y a aucun post', () => {
    render(<PostList posts={[]} emptyMessage="Rien à voir ici" />)
    expect(screen.getByText('Rien à voir ici')).toBeInTheDocument()
  })

  it('trie les posts fournis en props du plus récent au plus ancien', () => {
    const posts = [makePost(1, '2026-01-01T00:00:00Z'), makePost(2, '2026-03-01T00:00:00Z')]
    render(<PostList posts={posts} />)
    const items = screen.getAllByTestId('post-item')
    expect(items.map((el) => el.textContent)).toEqual(['2', '1'])
  })

  it('utilise usePosts quand useInfiniteScroll est désactivé et posts non fourni', () => {
    mockedUsePosts.mockReturnValue({
      posts: [makePost(5, '2026-01-01T00:00:00Z')],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof usePosts>)

    render(<PostList useInfiniteScroll={false} />)

    expect(mockedUsePosts).toHaveBeenCalledWith(true)
    expect(screen.getByTestId('post-item')).toHaveTextContent('5')
  })

  it('affiche les posts paginés issus de useInfinitePosts en mode chronologique', () => {
    mockedUseInfinitePosts.mockReturnValue({
      ...defaultInfiniteResult,
      data: {
        pages: [
          { items: [makePost(1, '2026-01-01T00:00:00Z')], page: 1, totalPages: 2, totalItems: 2, limit: 10 },
        ],
        pageParams: [1],
      },
      hasNextPage: true,
      isFetchingNextPage: true,
    } as unknown as ReturnType<typeof useInfinitePosts>)

    render(<PostList />)

    expect(screen.getByTestId('post-item')).toHaveTextContent('1')
    expect(screen.getByText('Chargement...')).toBeInTheDocument()
  })

  it('déclenche fetchNextPage quand le repère de chargement devient visible', () => {
    const fetchNextPage = jest.fn()
    mockedUseInfinitePosts.mockReturnValue({
      ...defaultInfiniteResult,
      data: { pages: [{ items: [makePost(1, '2026-01-01T00:00:00Z')], page: 1, totalPages: 2, totalItems: 2, limit: 10 }], pageParams: [1] },
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    } as unknown as ReturnType<typeof useInfinitePosts>)

    render(<PostList />)

    expect(FakeIntersectionObserver.instances).toHaveLength(1)
    const observer = FakeIntersectionObserver.instances[0]
    observer.callback([{ isIntersecting: true }])

    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it('ne déclenche pas fetchNextPage si une page est déjà en cours de chargement', () => {
    const fetchNextPage = jest.fn()
    mockedUseInfinitePosts.mockReturnValue({
      ...defaultInfiniteResult,
      data: { pages: [{ items: [makePost(1, '2026-01-01T00:00:00Z')], page: 1, totalPages: 2, totalItems: 2, limit: 10 }], pageParams: [1] },
      hasNextPage: true,
      isFetchingNextPage: true,
      fetchNextPage,
    } as unknown as ReturnType<typeof useInfinitePosts>)

    render(<PostList />)
    const observer = FakeIntersectionObserver.instances[0]
    observer.callback([{ isIntersecting: true }])

    expect(fetchNextPage).not.toHaveBeenCalled()
  })

  it('mélange posts et articles RSS en mode feed via useInfiniteFeed', () => {
    mockedUseInfiniteFeed.mockReturnValue({
      ...defaultFeedResult,
      data: {
        pages: [
          {
            items: [
              { type: 'post', post: makePost(7, '2026-01-01T00:00:00Z') },
              { type: 'rss_item', rssItem },
            ],
            page: 1,
            totalPages: 1,
            totalItems: 2,
            limit: 10,
          },
        ],
        pageParams: [1],
      },
    } as unknown as ReturnType<typeof useInfiniteFeed>)

    render(<PostList mode="feed" />)

    expect(screen.getByTestId('post-item')).toHaveTextContent('7')
    expect(screen.getByTestId('rss-item')).toHaveTextContent('99')
  })

  it('affiche le message vide en mode feed quand aucune entrée n’est disponible', () => {
    mockedUseInfiniteFeed.mockReturnValue({
      ...defaultFeedResult,
      data: { pages: [{ items: [], page: 1, totalPages: 1, totalItems: 0, limit: 10 }], pageParams: [1] },
    } as unknown as ReturnType<typeof useInfiniteFeed>)

    render(<PostList mode="feed" />)

    expect(screen.getByText('Aucun post pour le moment.')).toBeInTheDocument()
  })

  it("affiche l'erreur quand la requête infinie échoue", () => {
    mockedUseInfinitePosts.mockReturnValue({
      ...defaultInfiniteResult,
      error: new Error('boom'),
    } as unknown as ReturnType<typeof useInfinitePosts>)

    render(<PostList />)

    expect(screen.getByText('Erreur lors du chargement des posts.')).toBeInTheDocument()
  })
})
