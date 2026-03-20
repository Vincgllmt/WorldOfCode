import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RegisterPage from '@/app/register/page'

// Mock useRegister
const mockMutate = jest.fn()
jest.mock('@/hooks/useRegister', () => ({
  useRegister: () => ({
    mutate: mockMutate,
    isPending: false,
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

// Mock AvatarPicker
jest.mock('@/components/register/AvatarPicker', () => {
  return function MockAvatarPicker() {
    return <div data-testid="avatar-picker" />
  }
})

// Mock PasswordRules
jest.mock('@/components/register/PasswordRules', () => ({
  PasswordRules: () => <div data-testid="password-rules" />,
}))

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

beforeEach(() => {
  jest.clearAllMocks()
})

describe('RegisterPage', () => {
  it('affiche le titre Creer un compte', () => {
    render(<RegisterPage />)
    expect(screen.getByText('Créer un compte')).toBeInTheDocument()
  })

  it('affiche tous les champs du formulaire', () => {
    render(<RegisterPage />)
    expect(screen.getByLabelText('Nom')).toBeInTheDocument()
    expect(screen.getByLabelText('Prénom')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Nom utilisateur')).toBeInTheDocument()
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
  })

  it('affiche le composant AvatarPicker', () => {
    render(<RegisterPage />)
    expect(screen.getByTestId('avatar-picker')).toBeInTheDocument()
  })

  it('affiche le composant PasswordRules', () => {
    render(<RegisterPage />)
    expect(screen.getByTestId('password-rules')).toBeInTheDocument()
  })

  it('affiche le bouton Creer le compte', () => {
    render(<RegisterPage />)
    expect(screen.getByText('Créer le compte')).toBeInTheDocument()
  })

  it('le bouton est desactive si le mot de passe ne respecte pas les regles', () => {
    render(<RegisterPage />)
    const submitButton = screen.getByText('Créer le compte')
    expect(submitButton).toBeDisabled()
  })

  it('affiche le lien vers la connexion', () => {
    render(<RegisterPage />)
    const link = screen.getByText('Se connecter')
    expect(link.closest('a')).toHaveAttribute('href', '/login')
  })

  it('affiche les erreurs de validation quand les champs sont vides', async () => {
    render(<RegisterPage />)

    // Remplir un password valide pour activer le bouton
    const passwordInput = screen.getByLabelText('Mot de passe')
    fireEvent.change(passwordInput, { target: { value: 'StrongPass1234!' } })

    const submitButton = screen.getByText('Créer le compte')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Le nom est requis')).toBeInTheDocument()
    })
  })

  it('affiche les placeholders corrects', () => {
    render(<RegisterPage />)
    expect(screen.getByPlaceholderText('Dupont')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Jean')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('exemple@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ex: john_doe')).toBeInTheDocument()
  })
})
