'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ReactNode } from 'react'

// Pour ajouter un thème : ajouter son nom dans le tableau themes ci-dessous
// puis définir ses variables CSS dans globals.css (ex: .theme-ocean { ... })
export function ThemeProvider({ children }: { children: ReactNode }) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
            themes={['light', 'dark']}
        >
            {children}
        </NextThemesProvider>
    )
}
