import { render, screen } from '@testing-library/react'
import PostHeader from '@/components/post/PostHeader'
import FollowToggleButton from '@/components/follow/FollowToggleButton'

jest.mock('@/components/follow/FollowToggleButton', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="follow-toggle-button" />),
}))

const mockedFollowToggleButton = FollowToggleButton as jest.MockedFunction<typeof FollowToggleButton>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PostHeader', () => {
  it("affiche le pseudo de l'auteur en lien vers son profil", () => {
    render(<PostHeader currentUserId={1} authorId={2} authorUsername="alice" />)

    const link = screen.getByRole('link', { name: 'alice' })
    expect(link).toHaveAttribute('href', '/user/2')
  })

  it('affiche les initiales en avatar par défaut quand aucune image n\'est fournie', () => {
    render(<PostHeader currentUserId={1} authorId={2} authorUsername="alice" />)
    expect(screen.getByText('AL')).toBeInTheDocument()
  })

  it('affiche "?" comme initiale pour un pseudo vide', () => {
    render(<PostHeader currentUserId={1} authorId={2} authorUsername="   " />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it("affiche l'avatar image quand authorAvatarUrl est fourni", () => {
    render(
      <PostHeader
        currentUserId={1}
        authorId={2}
        authorUsername="alice"
        authorAvatarUrl="https://cdn.test/avatar.png"
      />
    )

    const img = screen.getByAltText('Avatar de alice')
    expect(img).toHaveAttribute('src', 'https://cdn.test/avatar.png')
    expect(screen.queryByText('AL')).not.toBeInTheDocument()
  })

  it("n'affiche pas de date quand createdAt est absent", () => {
    render(<PostHeader currentUserId={1} authorId={2} authorUsername="alice" />)
    expect(screen.queryByRole('time')).not.toBeInTheDocument()
  })

  it('affiche une date relative en minutes', () => {
    const now = new Date('2026-01-01T12:00:00Z')
    jest.useFakeTimers().setSystemTime(now)

    const createdAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    render(<PostHeader currentUserId={1} authorId={2} authorUsername="alice" createdAt={createdAt} />)

    expect(screen.getByText('il y a 5 min')).toBeInTheDocument()
    jest.useRealTimers()
  })

  it('affiche "à l’instant" pour une publication très récente', () => {
    const now = new Date('2026-01-01T12:00:00Z')
    jest.useFakeTimers().setSystemTime(now)

    const createdAt = new Date(now.getTime() - 10 * 1000).toISOString()
    render(<PostHeader currentUserId={1} authorId={2} authorUsername="alice" createdAt={createdAt} />)

    expect(screen.getByText('à l’instant')).toBeInTheDocument()
    jest.useRealTimers()
  })

  it('affiche une date relative en heures', () => {
    const now = new Date('2026-01-01T12:00:00Z')
    jest.useFakeTimers().setSystemTime(now)

    const createdAt = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
    render(<PostHeader currentUserId={1} authorId={2} authorUsername="alice" createdAt={createdAt} />)

    expect(screen.getByText('il y a 3 h')).toBeInTheDocument()
    jest.useRealTimers()
  })

  it('affiche une date relative en jours', () => {
    const now = new Date('2026-01-10T12:00:00Z')
    jest.useFakeTimers().setSystemTime(now)

    const createdAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    render(<PostHeader currentUserId={1} authorId={2} authorUsername="alice" createdAt={createdAt} />)

    expect(screen.getByText('il y a 2 j')).toBeInTheDocument()
    jest.useRealTimers()
  })

  it('affiche la date complète en tooltip via l\'attribut title', () => {
    const { container } = render(
      <PostHeader currentUserId={1} authorId={2} authorUsername="alice" createdAt="2026-01-15T10:30:00Z" />
    )

    const time = container.querySelector('time')
    expect(time).toHaveAttribute('dateTime', '2026-01-15T10:30:00Z')
    expect(time).toHaveAttribute('title', '15 janvier 2026 à 10:30')
  })

  it("affiche le bouton de suivi quand l'auteur n'est pas l'utilisateur courant", () => {
    render(<PostHeader currentUserId={1} authorId={2} authorUsername="alice" isAuthorFollowedByMe />)

    expect(screen.getByTestId('follow-toggle-button')).toBeInTheDocument()
    expect(mockedFollowToggleButton).toHaveBeenCalledWith(
      expect.objectContaining({
        currentUserId: 1,
        targetUserId: 2,
        initialIsFollowing: true,
        size: 'sm',
      }),
      undefined,
    )
  })

  it("n'affiche pas le bouton de suivi pour ses propres posts", () => {
    render(<PostHeader currentUserId={1} authorId={1} authorUsername="alice" />)
    expect(screen.queryByTestId('follow-toggle-button')).not.toBeInTheDocument()
  })

  it('applique la className fournie au conteneur racine', () => {
    const { container } = render(
      <PostHeader currentUserId={1} authorId={2} authorUsername="alice" className="custom-class" />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
