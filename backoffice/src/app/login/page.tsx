'use client'

import { useForm } from 'react-hook-form'
import { useContext } from 'react'
import { AdminAuthContext } from '@/contexts/AdminAuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { LoginCredentials } from '@/interfaces/Authentification'

export default function AdminLoginPage() {
  const { register: registerCreds, handleSubmit: handleCredSubmit, formState: { errors: credErrors } } = useForm<LoginCredentials>()
  const { register: register2FA, handleSubmit: handle2FASubmit, formState: { errors: errors2FA } } = useForm<{ code: string }>()
  const auth = useContext(AdminAuthContext)

  const onSubmitCredentials = async (data: LoginCredentials) => {
    await auth?.login(data)
  }

  const onSubmit2FA = async ({ code }: { code: string }) => {
    await auth?.verify2FA(code)
  }

  if (auth?.twoFAPending) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
        <Card className="w-full max-w-md shadow-md">
          <CardHeader>
            <CardTitle>Vérification en deux étapes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Un code a été envoyé à <strong>{auth.twoFAPending.maskedEmail}</strong>. Saisissez-le ci-dessous.
            </p>
            <form onSubmit={handle2FASubmit(onSubmit2FA)} className="space-y-4">
              <div>
                <Label htmlFor="code">Code de vérification</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  autoComplete="one-time-code"
                  maxLength={6}
                  {...register2FA('code', { required: 'Code requis' })}
                />
                {errors2FA.code && <p className="text-sm text-red-500">{errors2FA.code.message}</p>}
              </div>
              <Button type="submit" disabled={auth?.isLoading} className="w-full">
                {auth?.isLoading ? 'Vérification...' : 'Vérifier'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle>Connexion Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCredSubmit(onSubmitCredentials)} className="space-y-4">
            <div>
              <Label htmlFor="username">User Name</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                {...registerCreds('username', { required: 'Champ requis' })}
              />
              {credErrors.username && <p className="text-sm text-red-500">{credErrors.username.message}</p>}
            </div>

            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                {...registerCreds('password', { required: 'Mot de passe requis' })}
              />
              {credErrors.password && <p className="text-sm text-red-500">{credErrors.password.message}</p>}
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
