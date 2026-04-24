import { AuthenticatedUser, LoginCredentials } from './Authentification';

export interface AuthContextType {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  loginSilent: (credentials: LoginCredentials) => Promise<AuthenticatedUser>
  verify2FA: (code: string, rememberDevice?: boolean) => Promise<void>
  logout: () => void
  setUserTheme: (theme: string) => void
  setUserAvatar: (url: string | null) => void
}
