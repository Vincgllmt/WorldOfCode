'use client'

import { useForm } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PasswordRules } from '@/components/register/PasswordRules'
import { useRegister } from '@/hooks/useRegister'
import type { RegisterCredentials } from '@/interfaces/Authentification'
import Link from 'next/link'
import Image from 'next/image'

export default function RegisterPage() {
    const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterCredentials>()
    const { mutate, isPending } = useRegister()
    const passwordValue = watch('password', '')

    const onSubmit = (data: RegisterCredentials) => {
        mutate(data)
    }

    const isPasswordValid =
        passwordValue.length >= 12 &&
        /[A-Z]/.test(passwordValue) &&
        /[a-z]/.test(passwordValue) &&
        /[0-9]/.test(passwordValue) &&
        /[^A-Za-z0-9]/.test(passwordValue)

    return (
        <div className="flex justify-center items-center min-h-screen bg-green-50 px-4">
            <div className="w-full max-w-md space-y-4">
                <Card className="shadow-md">
                    <CardHeader className="flex flex-col items-center space-y-2">
                        <Image
                            src="/logo-woc.png"
                            alt="World of Code logo"
                            width={120}
                            height={120}
                            className="mb-2"
                            priority
                        />
                        <CardTitle className="text-xl font-semibold text-gray-800">
                            Créer un compte
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                            {/* Nom */}
                            <div>
                                <Label htmlFor="lastname">Nom</Label>
                                <Input
                                    id="lastname"
                                    type="text"
                                    placeholder="Dupont"
                                    {...register('lastname', { required: 'Le nom est requis' })}
                                />
                                {errors.lastname && (
                                    <p className="text-sm text-red-500">{errors.lastname.message}</p>
                                )}
                            </div>

                            {/* Prénom */}
                            <div>
                                <Label htmlFor="firstname">Prénom</Label>
                                <Input
                                    id="firstname"
                                    type="text"
                                    placeholder="Jean"
                                    {...register('firstname', { required: 'Le prénom est requis' })}
                                />
                                {errors.firstname && (
                                    <p className="text-sm text-red-500">{errors.firstname.message}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="exemple@email.com"
                                    {...register('email', {
                                        required: 'L’email est requis',
                                        pattern: {
                                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                            message: 'Email invalide',
                                        },
                                    })}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-500">{errors.email.message}</p>
                                )}
                            </div>

                            {/* Nom utilisateur */}
                            <div>
                                <Label htmlFor="username">Nom utilisateur</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="Ex: john_doe"
                                    {...register('username', { required: 'Le nom utilisateur est requis' })}
                                />
                                {errors.username && (
                                    <p className="text-sm text-red-500">{errors.username.message}</p>
                                )}
                            </div>

                            {/* Mot de passe */}
                            <div>
                                <Label htmlFor="password">Mot de passe</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="********"
                                    {...register('password', { required: 'Mot de passe requis' })}
                                />
                                <PasswordRules password={passwordValue} />
                                {errors.password && (
                                    <p className="text-sm text-red-500">{errors.password.message}</p>
                                )}
                            </div>

                            {/* Bouton */}
                            <Button
                                type="submit"
                                disabled={isPending || !isPasswordValid}
                                className="w-full"
                            >
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
