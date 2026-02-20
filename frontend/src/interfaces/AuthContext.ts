import { AuthenticatedUser, LoginCredentials } from './Authentification';

export interface AuthContextType {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  loginSilent: (credentials: LoginCredentials) => Promise<AuthenticatedUser>
  logout: () => void
  setUserTheme: (theme: string) => void
}
