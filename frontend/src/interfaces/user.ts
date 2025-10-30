export interface User {
  id: number
  username: string
  role: 'ROLE_USER' | 'ROLE_ADMIN'
  creationDate: string
  updateDate: string
}

export interface UpdateUserPayload {
  id: number
  username: string
  role: 'ROLE_USER' | 'ROLE_ADMIN'
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

export type PublicUser = User & {
  email: string | null
  avatarUrl?: string | null
}
