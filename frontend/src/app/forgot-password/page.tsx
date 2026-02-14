'use client'

import { useForm } from 'react-hook-form'
import { useForgotPassword } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
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
    )
}
