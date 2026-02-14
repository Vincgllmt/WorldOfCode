'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { LoginCredentials } from '@/interfaces/Authentification'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
    const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>()
    const { login, isLoading } = useAuth()
    const [showPassword, setShowPassword] = useState(false)

    const onSubmit = async (data: LoginCredentials) => {
        await login(data)
    }

    return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-green-400 via-green-200 to-white px-4">
            <Card className="w-full max-w-md shadow-md">
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
                        Connexion
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Nom d'utilisateur */}
                        <div>
                            <Label htmlFor="username">Nom utilisateur</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Ex: Prénom"
                                {...register('username', { required: 'Champ requis' })}
                            />
                            {errors.username && (
                                <p className="text-sm text-red-500">{errors.username.message}</p>
                            )}
                        </div>

                        {/* Mot de passe avec œil */}
                        <div>
                            <Label htmlFor="password">Mot de passe</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="********"
                                    {...register('password', { required: 'Mot de passe requis' })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Lien mot de passe oublié */}
                        <div className="flex justify-end mt-1">
                            <Link
                                href="/forgot-password"
                                className="text-sm text-primary hover:underline"
                            >
                                Mot de passe oublié ?
                            </Link>
                        </div>

                        {/* Bouton de connexion */}
                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading ? 'Connexion...' : 'Se connecter'}
                        </Button>
                    </form>

                    {/* Lien vers l'inscription */}
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
