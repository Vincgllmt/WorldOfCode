'use client'

import { useState } from 'react'
import { useUpdateUser } from '@/hooks/useUsers'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AuthenticatedUser } from '@/interfaces/Authentification'

type Props = {
  user: AuthenticatedUser
}

export default function UpdateProfileForm({ user }: Props) {
  const [username, setUsername] = useState(user.username)
  const [password, setPassword] = useState('')
  const updateUser = useUpdateUser()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateUser.mutate({ id: user.id, username, password })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nom d'utilisateur"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Input
        label="Nouveau mot de passe"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit">Mettre à jour</Button>
    </form>
  )
}
