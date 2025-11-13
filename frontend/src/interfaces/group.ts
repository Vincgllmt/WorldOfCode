
import { User } from "./user"

export interface Group {
  id: number
  name: string
  users?: User[]
  description: string
  createdAt: string
  joinedByUser?: boolean
}

export interface CreateGroupPayload {
  name: string
  description: string
}

export interface UpdateGroupPayload {
  id: number
  name: string
  description: string
}


export interface JoinGroupPayload {
  groupId: number
}
