export type Availability = 'open_to_work' | 'employed' | 'freelance' | 'student'

export type LinkType = 'github' | 'gitlab' | 'linkedin' | 'portfolio' | 'other'

export type SkillCategory =
  | 'language' | 'frontend' | 'backend' | 'mobile' | 'database'
  | 'devops' | 'cloud' | 'design' | 'tools' | 'testing'
  | 'security' | 'data' | 'other'

export interface Skill {
  id: number
  name: string
  category: SkillCategory
}

export interface UserLink {
  id: number
  type: LinkType
  url: string
}

export interface Experience {
  title: string
  company: string
  startDate: string
  endDate: string | null
  description: string
}

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
  theme?: string | null
  bio?: string | null
  location?: string | null
  availability?: Availability | null
  experiences?: Experience[] | null
  skills?: Skill[]
  links?: UserLink[]
}

export interface UpdateUserPayload {
  id: number
  username: string
  role: 'ROLE_USER' | 'ROLE_ADMIN'
  email: string
  firstname: string | null
  lastname: string | null
}

export interface UpdateProfilePayload {
  bio?: string | null
  location?: string | null
  availability?: string | null
  experiences?: Experience[] | null
  skillIds?: number[] | null
  avatarUrl?: string | null
}

export interface CreateLinkPayload {
  type: LinkType
  url: string
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
