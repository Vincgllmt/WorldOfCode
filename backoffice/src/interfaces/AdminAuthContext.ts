import { AuthenticatedUser, LoginCredentials } from './Authentification'

export interface TwoFAPendingState {
  tempToken: string
  maskedEmail: string
}

export interface AdminAuthContextType {
  user: AuthenticatedUser | null
  isAuthenticated: boolean
  isLoading: boolean
  twoFAPending: TwoFAPendingState | null
  login: (credentials: LoginCredentials) => Promise<void>
  verify2FA: (code: string) => Promise<void>
  logout: () => void
}
