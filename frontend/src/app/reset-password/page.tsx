'use client'

import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useResetPassword } from '@/hooks/useAuth'
import { Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import { PasswordRules } from '@/components/register/PasswordRules' // ✅ réutilisé

interface ResetPasswordForm {
    password: string
}

export default function ResetPasswordPage() {
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

    //  même logique de validation que sur RegisterPage
    const isPasswordValid =
        passwordValue.length >= 12 &&
        /[A-Z]/.test(passwordValue) &&
        /[a-z]/.test(passwordValue) &&
        /[0-9]/.test(passwordValue) &&
        /[^A-Za-z0-9]/.test(passwordValue)

    return (
        <div className="flex justify-center items-center min-h-screen bg-green-50 px-4">
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
                    <CardTitle className="text-l font-semibold text-gray-800">
                        Mot de passe oublié
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

                            {/* ✅ affiche les règles dynamiquement */}
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
        </div>
    )
}
