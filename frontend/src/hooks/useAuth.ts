import { useContext } from 'react'
import { AuthContext } from '@/contexts/AuthContext'
import { useMutation } from '@tanstack/react-query'
import { requestPasswordReset } from '@/services/authService'
import toast from 'react-hot-toast'
import { resetPassword } from '@/services/authService'
import { useRouter } from 'next/navigation'

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export const useForgotPassword = () => {
    return useMutation<void, Error, string>({
        mutationFn: requestPasswordReset,
        onSuccess: () => {
            toast.success('Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.')
        },
        onError: (error) => {
            toast.error(error.message || ' Erreur lors de l’envoi du lien.')
        },
    })
}

export const useResetPassword = () => {
    const router = useRouter()

    return useMutation<void, Error, { token: string; password: string }>({
        mutationFn: ({ token, password }) => resetPassword(token, password),
        onSuccess: () => {
            toast.success('Mot de passe réinitialisé avec succès. Vous pouvez vous reconnecter.')
            router.push('/login')
        },
        onError: (error) => {
            toast.error(error.message || 'Le lien est invalide ou expiré.')
        },
    })
}
