'use client'

import { useForm } from 'react-hook-form'
import { useForgotPassword } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'

interface ForgotPasswordForm {
    email: string
}

export default function ForgotPasswordPage() {
    const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>()
    const { mutate, isPending } = useForgotPassword()

    const onSubmit = (data: ForgotPasswordForm) => {
        mutate(data.email)
    }

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
            <Card className="w-full max-w-md shadow-md">
                <CardHeader className="flex flex-col items-center space-y-2">
                    <CardTitle className="text-l font-semibold text-gray-800">
                        Mot de passe oublié
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <Label htmlFor="email">Adresse e-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="exemple@email.com"
                                {...register('email', { required: 'Email requis' })}
                            />
                            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                        </div>

                        <Button type="submit" disabled={isPending} className="w-full">
                            {isPending ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            </div>
        </div>
    )
}
