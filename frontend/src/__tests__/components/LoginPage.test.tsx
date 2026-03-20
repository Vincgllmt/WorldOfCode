import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'

// Mock useAuth
const mockLogin = jest.fn()
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    isLoading: false,
  }),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }
})

// Mock LandingNavbar
jest.mock('@/components/landing/LandingNavbar', () => {
  return function MockNavbar() {
    return <nav data-testid="landing-navbar" />
  }
})

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}))

jest.mock('@/components/ui/input', () => {
  const React = require('react')
  return {
    Input: React.forwardRef((props: any, ref: any) => <input {...props} ref={ref} />),
  }
})

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

// Mock lucide icons
jest.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon" />,
  EyeOff: () => <span data-testid="eye-off-icon" />,
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('LoginPage', () => {
  it('affiche le titre Connexion', () => {
    render(<LoginPage />)
    expect(screen.getByText('Connexion')).toBeInTheDocument()
  })

  it('affiche les champs username et password', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText('Nom utilisateur')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
  })

  it('affiche le bouton Se connecter', () => {
    render(<LoginPage />)
    expect(screen.getByText('Se connecter')).toBeInTheDocument()
  })

  it('affiche le lien vers inscription', () => {
    render(<LoginPage />)
    const link = screen.getByText('Créer votre compte')
    expect(link.closest('a')).toHaveAttribute('href', '/register')
  })

  it('affiche le lien mot de passe oublie', () => {
    render(<LoginPage />)
    const link = screen.getByText('Mot de passe oublié ?')
    expect(link.closest('a')).toHaveAttribute('href', '/forgot-password')
  })

  it('affiche les erreurs de validation si champs vides', async () => {
    render(<LoginPage />)

    const submitButton = screen.getByText('Se connecter')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Champ requis')).toBeInTheDocument()
    })
  })

  it('appelle login avec les credentials saisis', async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText('Nom utilisateur'), { target: { value: 'V' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'NightCity2077!' } })

    const submitButton = screen.getByText('Se connecter')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'V',
        password: 'NightCity2077!',
      })
    })
  })

  it('toggle la visibilite du mot de passe', () => {
    render(<LoginPage />)

    const passwordInput = screen.getByLabelText('Mot de passe')
    expect(passwordInput).toHaveAttribute('type', 'password')

    const toggleButton = screen.getByLabelText('Afficher le mot de passe')
    fireEvent.click(toggleButton)

    expect(passwordInput).toHaveAttribute('type', 'text')
  })
})
