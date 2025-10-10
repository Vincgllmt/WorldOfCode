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
