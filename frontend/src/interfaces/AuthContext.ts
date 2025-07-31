// frontend/src/interfaces/AuthContext.ts
import { AuthenticatedUser, LoginCredentials } from './Authentification';

export interface AuthContextType {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}
