'use client'

import { useEffect, useState } from 'react'

interface PasswordRulesProps {
    password: string
}

export function PasswordRules({ password }: PasswordRulesProps) {
    const [rules, setRules] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
    })

    useEffect(() => {
        setRules({
            length: password.length >= 12,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password),
        })
    }, [password])

    return (
        <ul className="text-sm space-y-1 mt-2">
            <li className={rules.length ? 'text-green-600' : 'text-red-500'}>
                {rules.length ? '✔️' : '❌'} Au moins 12 caractères
            </li>
            <li className={rules.uppercase ? 'text-green-600' : 'text-red-500'}>
                {rules.uppercase ? '✔️' : '❌'} Une majuscule
            </li>
            <li className={rules.lowercase ? 'text-green-600' : 'text-red-500'}>
                {rules.lowercase ? '✔️' : '❌'} Une minuscule
            </li>
            <li className={rules.number ? 'text-green-600' : 'text-red-500'}>
                {rules.number ? '✔️' : '❌'} Un chiffre
            </li>
            <li className={rules.special ? 'text-green-600' : 'text-red-500'}>
                {rules.special ? '✔️' : '❌'} Un caractère spécial
            </li>
        </ul>
    )
}
