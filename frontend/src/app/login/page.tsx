'use client'

import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { LoginCredentials } from '@/interfaces/Authentification'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>()
  const { login, isLoading } = useAuth()

  const onSubmit = async (data: LoginCredentials) => {
    await login(data)
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-green-50 px-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="username">Nom utilisateur</Label>
              <Input
                id="username"
                type="text"
                placeholder="Ex: Prénom"
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

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          {/* Lien vers la création de compte */}
          <p className="text-sm text-center mt-4 text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Créer votre compte
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
