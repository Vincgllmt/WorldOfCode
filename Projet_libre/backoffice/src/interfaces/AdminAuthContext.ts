import { AuthenticatedUser, LoginCredentials } from './Authentification'

export interface AdminAuthContextType {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}
