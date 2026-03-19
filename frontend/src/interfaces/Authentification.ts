export interface LoginCredentials {
    username: string
    password: string
}

export interface AuthenticatedUser {
    id: number
    username: string
    token: string
    role: 'ROLE_USER' | 'ROLE_ADMIN'
    creationDate: string
    updatedDate: string
    theme?: string | null
    avatarUrl?: string | null
}

export interface RegisterResponse {
    id: number
    username: string
    role: 'ROLE_USER' | 'ROLE_ADMIN'
    creationDate: string
    updatedDate: string
}


export interface TokenResponse {
    token: string
}

export interface RegisterCredentials {
    firstname: string
    lastname: string
    email: string
    username: string
    password: string
    avatarUrl?: string | null
}

export interface TwoFactorRequiredResponse {
    requires2FA: true
    tempToken: string
}

export type LoginResponse = TokenResponse | TwoFactorRequiredResponse