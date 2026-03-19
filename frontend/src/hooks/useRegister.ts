import { useMutation } from '@tanstack/react-query'
import { register } from '@/services/registerService'
import type { RegisterCredentials, RegisterResponse } from '@/interfaces/Authentification'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export const useRegister = () => {
    const router = useRouter()
    const { loginSilent } = useAuth()

    return useMutation<RegisterResponse, Error, RegisterCredentials>({
        mutationFn: register,
        onSuccess: async (_data, variables) => {
            try {
                await loginSilent({
                    username: variables.username,
                    password: variables.password,
                })
                router.push('/onboarding')
            } catch (error: unknown) {
                // Si c'est une redirection 2FA, ne pas afficher d'erreur
                if (error instanceof Error && error.message === '2FA required') {
                    // Marquer qu'on vient d'une inscription pour rediriger vers onboarding après 2FA
                    sessionStorage.setItem('2fa_redirect', '/onboarding')
                    return
                }
                toast.error('Compte créé. Veuillez vous connecter.')
                router.push('/login')
            }
        },
        onError: (error) => {
            toast.error(error.message)
        },
    })
}
