import { useMutation } from '@tanstack/react-query'
import { register } from '@/services/registerService'
import type { LoginCredentials, RegisterResponse } from '@/interfaces/Authentification'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export const useRegister = () => {
  const Router = useRouter();

  return useMutation<RegisterResponse, Error, LoginCredentials>({
    mutationFn: register,
    onSuccess: (data) => {
      toast.success(`Bienvenue ${data.username} 🎉`)
      Router.push('/login')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
