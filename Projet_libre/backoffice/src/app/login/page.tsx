'use client'

import { useForm } from 'react-hook-form'
import { useContext } from 'react'
import { AdminAuthContext } from '@/src/contexts/AdminAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Input } from '@/src/components/ui/input'
import { Label } from '@/src/components/ui/label'
import { Button } from '@/src/components/ui/button'
import type { LoginCredentials } from '@/src/interfaces/Authentification'

export default function AdminLoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>()
  const auth = useContext(AdminAuthContext)

  const onSubmit = async (data: LoginCredentials) => {
    await auth?.login(data)
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle>Connexion Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                {...register('username', { required: 'Champ requis' })}
              />
              {errors.username && <p className="text-sm text-red-500">{errors.username.message}</p>}
            </div>

            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                {...register('password', { required: 'Mot de passe requis' })}
              />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <Button type="submit" disabled={auth?.isLoading} className="w-full">
              {auth?.isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
