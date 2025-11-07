export interface User {
  id: number
  username: string
  role: 'ROLE_USER' | 'ROLE_ADMIN'
  email: string
  firstname: string | null
  lastname: string | null
  creationDate: string
  updatedDate: string
  avatarUrl?: string | null
}

export interface UpdateUserPayload {
  id: number
  username: string
  role: 'ROLE_USER' | 'ROLE_ADMIN'
  email: string
  firstname: string | null
  lastname: string | null
}

export interface UserGroup {
  id: number
  name: string
  description: string
  creatorId: number
  createdAt: string
}

export interface ChangePasswordPayload {
  id: number
  currentPassword: string
  newPassword: string
}

export type PublicUser = User
