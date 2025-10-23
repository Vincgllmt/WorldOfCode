import { useMutation } from '@tanstack/react-query'
import { register } from '@/services/registerService'
import type { RegisterCredentials, RegisterResponse } from '@/interfaces/Authentification'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export const useRegister = () => {
    const router = useRouter()

    return useMutation<RegisterResponse, Error, RegisterCredentials>({
        mutationFn: register,
        onSuccess: (data) => {
            toast.success(`Bienvenue ${data.username} `)
            router.push('/login')
        },
        onError: (error) => {
            toast.error(error.message)
        },
    })
}
