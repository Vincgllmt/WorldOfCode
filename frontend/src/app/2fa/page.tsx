'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import LandingNavbar from '@/components/landing/LandingNavbar'

export default function TwoFactorPage() {
    const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isReady, setIsReady] = useState(false)
    const [maskedEmail, setMaskedEmail] = useState<string>('')
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])
    const router = useRouter()
    const { verify2FA } = useAuth()

    // Vérifier le tempToken et récupérer le maskedEmail
    useEffect(() => {
        const tempToken = sessionStorage.getItem('2fa_tempToken')
        if (!tempToken) {
            router.push('/login')
        } else {
            setMaskedEmail(sessionStorage.getItem('2fa_maskedEmail') || '')
            setIsReady(true)
        }
    }, [router])

    const handleChange = (index: number, value: string) => {
        if (!/^\d?$/.test(value)) return

        const newCode = [...code]
        newCode[index] = value
        setCode(newCode)

        // Auto-focus sur le champ suivant
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus()
        }

        // Auto-submit si tous les champs sont remplis
        if (value && index === 5) {
            const fullCode = [...newCode].join('')
            if (fullCode.length === 6) {
                handleVerify(fullCode)
            }
        }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        const newCode = [...code]
        for (let i = 0; i < 6; i++) {
            newCode[i] = pasted[i] || ''
        }
        setCode(newCode)

        const lastIndex = Math.min(pasted.length, 5)
        inputRefs.current[lastIndex]?.focus()

        // Auto-submit si 6 chiffres collés
        if (pasted.length === 6) {
            handleVerify(pasted)
        }
    }

    const handleVerify = async (fullCode: string) => {
        if (isSubmitting) return
        setIsSubmitting(true)
        try {
            await verify2FA(fullCode)
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Code invalide ou expiré'
            toast.error(message)
            setCode(['', '', '', '', '', ''])
            inputRefs.current[0]?.focus()
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const fullCode = code.join('')
        if (fullCode.length !== 6) {
            toast.error('Veuillez saisir les 6 chiffres')
            return
        }
        await handleVerify(fullCode)
    }

    // Loader pendant la vérification du tempToken
    if (!isReady) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-green-300 via-green-100 to-white flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-300 via-green-100 to-white flex flex-col">
            <LandingNavbar showLogin={false} />

            <div className="flex-1 flex justify-center items-center px-4">
                <Card className="w-full max-w-md shadow-md">
                    <CardHeader className="flex flex-col items-center space-y-2">
                        <CardTitle className="text-xl font-semibold text-gray-800">
                            Vérification en deux étapes
                        </CardTitle>
                        <p className="text-sm text-muted-foreground text-center">
                            Un code de vérification a été envoyé à{' '}
                            {maskedEmail ? (
                                <span className="font-medium text-foreground">{maskedEmail}</span>
                            ) : (
                                'votre adresse email'
                            )}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex justify-center gap-2" onPaste={handlePaste}>
                                {code.map((digit, index) => (
                                    <Input
                                        key={index}
                                        ref={(el) => { inputRefs.current[index] = el }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        className="w-12 h-14 text-center text-2xl font-bold"
                                        autoFocus={index === 0}
                                        disabled={isSubmitting}
                                    />
                                ))}
                            </div>

                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                {isSubmitting ? 'Vérification...' : 'Vérifier'}
                            </Button>
                        </form>

                        <p className="text-sm text-center mt-4 text-muted-foreground">
                            Vous n&apos;avez pas reçu le code ?{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    toast('Veuillez vous reconnecter pour recevoir un nouveau code.')
                                    sessionStorage.removeItem('2fa_tempToken')
                                    router.push('/login')
                                }}
                                className="text-primary hover:underline font-medium"
                            >
                                Renvoyer
                            </button>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
