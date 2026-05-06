'use client'

import { useState, useContext, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { AdminAuthContext } from '@/contexts/AdminAuthContext'
import { Button } from '@/components/ui/button'
import type { LoginCredentials } from '@/interfaces/Authentification'
import { Eye, EyeOff } from 'lucide-react'
import LandingNavbar from '@/components/landing/LandingNavbar'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const {
    register: registerCreds,
    handleSubmit: handleCredSubmit,
    formState: { errors: credErrors },
  } = useForm<LoginCredentials>()

  const auth = useContext(AdminAuthContext)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)

  // 2FA — 6 cases séparées
  const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
  const [isSubmitting2FA, setIsSubmitting2FA] = useState(false)
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])

  const onSubmitCredentials = async (data: LoginCredentials) => {
    await auth?.login(data)
  }

  const handleVerify = async (fullCode: string) => {
    if (isSubmitting2FA) return
    setIsSubmitting2FA(true)
    try {
      await auth?.verify2FA(fullCode, rememberDevice)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Code invalide ou expiré'
      toast.error(message)
      setCode(['', '', '', '', '', ''])
      codeRefs.current[0]?.focus()
    } finally {
      setIsSubmitting2FA(false)
    }
  }

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...code]
    next[index] = value
    setCode(next)
    if (value && index < 5) codeRefs.current[index + 1]?.focus()
    if (value && index === 5) {
      const fullCode = next.join('')
      if (fullCode.length === 6) handleVerify(fullCode)
    }
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }
  }

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = [...code]
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || ''
    setCode(next)
    const lastIndex = Math.min(pasted.length, 5)
    codeRefs.current[lastIndex]?.focus()
    if (pasted.length === 6) handleVerify(pasted)
  }

  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      toast.error('Veuillez saisir les 6 chiffres')
      return
    }
    handleVerify(fullCode)
  }

  // ── Vue 2FA ────────────────────────────────────────────────────────────────
  if (auth?.twoFAPending) {
    return (
      <div
        className="force-light min-h-screen bg-gradient-to-b from-green-300 via-green-100 to-white flex flex-col"
        style={{ colorScheme: 'light' }}
      >
        <LandingNavbar />

        <div className="flex-1 flex justify-center items-center px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white text-gray-900 shadow-md">
            <div className="flex flex-col items-center space-y-2 p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo2.png"
                alt="World of Code"
                className="h-10 w-auto mb-2"
              />
              <h2 className="text-xl font-semibold text-gray-800">Vérification en deux étapes</h2>
              <p className="text-xs font-medium text-green-700 tracking-widest uppercase">
                Espace Administrateur
              </p>
            </div>
            <div className="px-6 pb-6">
              <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">
                Un code de vérification a été envoyé à{' '}
                <span className="font-semibold text-gray-900">{auth.twoFAPending.maskedEmail}</span>.
              </p>

              <form onSubmit={handle2FASubmit} className="space-y-6">
                <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { codeRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      autoFocus={index === 0}
                      disabled={isSubmitting2FA}
                      className="w-12 h-14 text-center text-2xl font-bold rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      style={{ colorScheme: 'light', backgroundColor: '#ffffff', color: '#111827' }}
                    />
                  ))}
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    disabled={isSubmitting2FA}
                    className="h-4 w-4 rounded border-gray-300 accent-green-600 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">Faire confiance à cet appareil pendant 90 jours</span>
                </label>

                <Button
                  type="submit"
                  disabled={isSubmitting2FA}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSubmitting2FA ? 'Vérification...' : 'Vérifier'}
                </Button>
              </form>

              <p className="text-sm text-center mt-4 text-gray-500">
                Vous n&apos;avez pas reçu le code ?{' '}
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="text-green-700 hover:underline font-medium"
                >
                  Renvoyer
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Vue principale ─────────────────────────────────────────────────────────
  return (
    <div
      className="force-light min-h-screen bg-gradient-to-b from-green-300 via-green-100 to-white flex flex-col"
      style={{ colorScheme: 'light' }}
    >
      <LandingNavbar />

      <div className="flex-1 flex justify-center items-center px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white text-gray-900 shadow-md">
          <div className="flex flex-col items-center space-y-2 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo2.png"
              alt="World of Code"
              className="h-10 w-auto mb-2"
            />
            <h2 className="text-xl font-semibold text-gray-800">Connexion</h2>
            <p className="text-xs font-medium text-green-700 tracking-widest uppercase">
              Espace Administrateur
            </p>
          </div>
          <div className="px-6 pb-6">
            <form onSubmit={handleCredSubmit(onSubmitCredentials)} className="space-y-4">
              {/* Identifiant */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nom utilisateur
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Ex: admin"
                  autoComplete="username"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  style={{ colorScheme: 'light', backgroundColor: '#ffffff', color: '#111827' }}
                  {...registerCreds('username', { required: 'Champ requis' })}
                />
                {credErrors.username && (
                  <p className="text-sm text-red-500 mt-1">{credErrors.username.message}</p>
                )}
              </div>

              {/* Mot de passe avec œil */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="********"
                    autoComplete="current-password"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    style={{ colorScheme: 'light', backgroundColor: '#ffffff', color: '#111827' }}
                    {...registerCreds('password', { required: 'Mot de passe requis' })}
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
                {credErrors.password && (
                  <p className="text-sm text-red-500 mt-1">{credErrors.password.message}</p>
                )}
              </div>

              {/* Bouton de connexion */}
              <Button
                type="submit"
                disabled={auth?.isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {auth?.isLoading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>

            <p className="text-sm text-center mt-4 text-gray-500">
              Accès réservé aux administrateurs
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
