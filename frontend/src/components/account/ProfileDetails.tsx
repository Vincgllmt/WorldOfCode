'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateUser } from '@/hooks/useUsers'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export default function ProfileDetails() {
  const { user } = useAuth()
  const [username, setUsername] = useState(user?.username || '')
  const updateUser = useUpdateUser()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
      updateUser.mutate({
    id: user.id,
    username,
    role: user.role,
  })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="username">Nom</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <Button type="submit">Mettre à jour</Button>
    </form>
  )
}
