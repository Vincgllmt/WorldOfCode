export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthenticatedUser {
  id: number
  username: string
  role: 'ROLE_USER' | 'ROLE_ADMIN'
  creationDate: string
  updatedDate: string
}

export interface TokenResponse {
  token: string
}

export interface TwoFAResponse {
  requires2FA: true
  tempToken: string
  maskedEmail: string
}

export interface Verify2FAPayload {
  tempToken: string
  code: string
  rememberDevice?: boolean
}

export type AuthenticateResponse = TwoFAResponse | TokenResponse
