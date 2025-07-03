
'use client'

import { useForm } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useRegister } from '@/hooks/useRegister'
import type { LoginCredentials } from '@/interfaces/Authentification'
import Link from 'next/link'

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>()
  const { mutate, isPending } = useRegister()

  const onSubmit = (data: LoginCredentials) => {
    mutate(data)
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-green-50 px-4">
      <div className="w-full max-w-md space-y-4">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Créer un compte</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="username">Nom utilisateur</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Ex: john_doe"
                  {...register('username', { required: 'Ce champ est requis' })}
                />
                {errors.username && <p className="text-sm text-red-500">{errors.username.message}</p>}
              </div>

              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  {...register('password', {
                    required: 'Mot de passe requis',
                    minLength: { value: 6, message: 'Minimum 6 caractères' }
                  })}
                />
                {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
              </div>

              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? 'Création...' : 'Créer le compte'}
              </Button>
            </form>
          {/* Lien retour au login */}
          <p className="text-sm text-center text-muted-foreground mt-4">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Se connecter
            </Link>
          </p>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
