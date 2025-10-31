'use client'

import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Navbar from '@/components/layout/Navbar'
import { usePathname } from 'next/navigation'
import { MessageFab } from '@/components/messaging/MessageFab'

// Fonts
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const queryClient = new QueryClient()

export default function RootLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname()

    // Masquer la navbar pour les routes /login et /register
    const hideNavbar = pathname === '/login' || pathname === '/register'

    return (
        <html lang="fr">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-black`}>
                <QueryClientProvider client={queryClient}>
                    <AuthProvider>
                        {!hideNavbar && <Navbar />}
                        {children}
                        {!hideNavbar && <MessageFab />}
                        <Toaster position="top-right" />
                    </AuthProvider>
                </QueryClientProvider>
            </body>
        </html>
    )
}
