'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useResetPassword } from '@/hooks/useAuth'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { PasswordRules } from '@/components/register/PasswordRules'

interface ResetPasswordForm {
    password: string
}

function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordForm>()
    const { mutate, isPending } = useResetPassword()
    const [showPassword, setShowPassword] = useState(false)

    const passwordValue = watch('password', '')

    const onSubmit = (data: ResetPasswordForm) => {
        if (!token) return
        mutate({ token, password: data.password })
    }

    const isPasswordValid =
        passwordValue.length >= 12 &&
        /[A-Z]/.test(passwordValue) &&
        /[a-z]/.test(passwordValue) &&
        /[0-9]/.test(passwordValue) &&
        /[^A-Za-z0-9]/.test(passwordValue)

    return (
        <Card className="w-full max-w-md shadow-md">
            <CardHeader className="flex flex-col items-center space-y-2">
                <CardTitle className="text-l font-semibold text-gray-800">
                    Réinitialiser le mot de passe
                </CardTitle>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="password">Nouveau mot de passe</Label>
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

                        <PasswordRules password={passwordValue} />

                        {errors.password && (
                            <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={isPending || !isPasswordValid}
                        className="w-full"
                    >
                        {isPending ? 'Réinitialisation...' : 'Changer le mot de passe'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-green-300 via-green-100 to-white flex flex-col">
            {/* Navbar Landing */}
            <nav className="bg-green-50/80 backdrop-blur-md border-b border-green-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/">
                        <Image
                            src="/logo2.png"
                            alt="World of Code"
                            width={160}
                            height={50}
                            className="h-12 w-auto"
                        />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link href="/login">
                            <Button variant="outline" size="sm">Se connecter</Button>
                        </Link>
                        <Link href="/register">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">S&apos;inscrire</Button>
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="flex-1 flex justify-center items-center px-4">
                <Suspense fallback={<div>Chargement...</div>}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    )
}
