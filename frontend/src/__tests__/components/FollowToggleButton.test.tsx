import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FollowToggleButton from '@/components/follow/FollowToggleButton'
import { useFollowUser, useUnfollowUser, useFollowing } from '@/hooks/useFollow'

jest.mock('@/hooks/useFollow', () => ({
  useFollowUser: jest.fn(),
  useUnfollowUser: jest.fn(),
  useFollowing: jest.fn(),
}))

const mockedUseFollowUser = useFollowUser as jest.Mock
const mockedUseUnfollowUser = useUnfollowUser as jest.Mock
const mockedUseFollowing = useFollowing as jest.Mock

const mockFollow = jest.fn()
const mockUnfollow = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockFollow.mockReset()
  mockUnfollow.mockReset()
  mockedUseFollowUser.mockReturnValue({ mutate: mockFollow, isPending: false })
  mockedUseUnfollowUser.mockReturnValue({ mutate: mockUnfollow, isPending: false })
  mockedUseFollowing.mockReturnValue({ following: [] })
})

describe('FollowToggleButton', () => {
  it('affiche "Suivre" avec aria-pressed=false quand l\'utilisateur n\'est pas suivi', () => {
    render(<FollowToggleButton currentUserId={1} targetUserId={2} initialIsFollowing={false} />)

    const button = screen.getByRole('button', { name: /Suivre/ })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveAttribute('title', 'Suivre cet utilisateur')
  })

  it('affiche "Suivi(e)" avec aria-pressed=true quand l\'utilisateur est déjà suivi', () => {
    render(<FollowToggleButton currentUserId={1} targetUserId={2} initialIsFollowing />)

    const button = screen.getByRole('button', { name: /Suivi\(e\)/ })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveAttribute('title', 'Ne plus suivre cet utilisateur')
  })

  it('n\'infère pas l\'état via useFollowing quand initialIsFollowing est fourni', () => {
    render(<FollowToggleButton currentUserId={1} targetUserId={2} initialIsFollowing={false} />)

    expect(mockedUseFollowing).toHaveBeenCalledWith(-1)
  })

  it('infère l\'état "suivi" depuis la liste following du user courant', () => {
    mockedUseFollowing.mockReturnValue({ following: [{ id: 3 }, { id: 2 }] })
    render(<FollowToggleButton currentUserId={1} targetUserId={2} />)

    expect(mockedUseFollowing).toHaveBeenCalledWith(1)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Suivi(e)')).toBeInTheDocument()
  })

  it('infère l\'état "non suivi" quand la cible est absente de la liste following', () => {
    mockedUseFollowing.mockReturnValue({ following: [{ id: 3 }] })
    render(<FollowToggleButton currentUserId={1} targetUserId={2} />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('suit l\'utilisateur au clic et appelle onChange(true) au succès', async () => {
    mockFollow.mockImplementation((_id, opts) => opts.onSuccess())
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(
      <FollowToggleButton currentUserId={1} targetUserId={2} initialIsFollowing={false} onChange={onChange} />
    )

    await user.click(screen.getByRole('button'))

    expect(mockFollow).toHaveBeenCalledWith(2, expect.any(Object))
    expect(mockUnfollow).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('ne suit plus l\'utilisateur au clic et appelle onChange(false) au succès', async () => {
    mockUnfollow.mockImplementation((_id, opts) => opts.onSuccess())
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(<FollowToggleButton currentUserId={1} targetUserId={2} initialIsFollowing onChange={onChange} />)

    await user.click(screen.getByRole('button'))

    expect(mockUnfollow).toHaveBeenCalledWith(2, expect.any(Object))
    expect(mockFollow).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith(false)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('ne change pas d\'état tant que la mutation n\'a pas réussi', async () => {
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(
      <FollowToggleButton currentUserId={1} targetUserId={2} initialIsFollowing={false} onChange={onChange} />
    )

    await user.click(screen.getByRole('button'))

    expect(mockFollow).toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('désactive le bouton quand l\'utilisateur cible est l\'utilisateur courant', () => {
    render(<FollowToggleButton currentUserId={1} targetUserId={1} initialIsFollowing={false} />)

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('désactive le bouton pendant une mutation en cours', () => {
    mockedUseFollowUser.mockReturnValue({ mutate: mockFollow, isPending: true })
    render(<FollowToggleButton currentUserId={1} targetUserId={2} initialIsFollowing={false} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('synchronise l\'état quand initialIsFollowing change', () => {
    const { rerender } = render(
      <FollowToggleButton currentUserId={1} targetUserId={2} initialIsFollowing={false} />
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')

    rerender(<FollowToggleButton currentUserId={1} targetUserId={2} initialIsFollowing />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('applique les classes de taille et de variante ghost', () => {
    render(
      <FollowToggleButton
        currentUserId={1}
        targetUserId={2}
        initialIsFollowing={false}
        variant="ghost"
        size="sm"
        className="custom-class"
      />
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-7', 'backdrop-blur-sm', 'bg-black/50', 'custom-class')
  })

  it('applique les classes de la variante solid en taille lg quand l\'utilisateur est suivi', () => {
    render(<FollowToggleButton currentUserId={1} targetUserId={2} initialIsFollowing size="lg" />)

    expect(screen.getByRole('button')).toHaveClass('h-10', 'bg-secondary')
  })
})
