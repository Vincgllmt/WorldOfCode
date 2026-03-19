'use client'

import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { VideoCallProvider } from '@/contexts/VideoCallContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Navbar from '@/components/layout/Navbar'
import { usePathname } from 'next/navigation'
import { MessageFab } from '@/components/messaging/MessageFab'
import { VideoCallGlobal } from '@/components/video/VideoCallGlobal'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ThemeSyncer } from '@/components/providers/ThemeSyncer'

// Fonts
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const queryClient = new QueryClient()

export default function RootLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname()

    // Masquer la navbar pour les routes /login et /register
    const hideNavbar = pathname === '/' || pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === "/reset-password" || pathname === '/onboarding' || pathname === '/2fa'
    const hideMessageFab = hideNavbar || pathname.startsWith('/message')

    return (
        <html lang="fr" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ThemeProvider>
                    <QueryClientProvider client={queryClient}>
                        <AuthProvider>
                            <ThemeSyncer />
                            <VideoCallProvider>
                                {!hideNavbar && <Navbar />}
                                {children}
                                {!hideMessageFab && <MessageFab />}
                                <Toaster
                                    position="top-right"
                                    containerStyle={{ top: 80 }}
                                    toastOptions={{
                                        style: {
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            textAlign: 'center' as const,
                                        },
                                        success: {
                                            icon: null,
                                            style: {
                                                background: 'rgba(34, 197, 94, 0.55)',
                                                backdropFilter: 'blur(12px)',
                                                WebkitBackdropFilter: 'blur(12px)',
                                                color: '#ffffff',
                                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.15)',
                                            },
                                        },
                                        error: {
                                            icon: null,
                                            style: {
                                                background: 'rgba(239, 68, 68, 0.55)',
                                                backdropFilter: 'blur(12px)',
                                                WebkitBackdropFilter: 'blur(12px)',
                                                color: '#ffffff',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.15)',
                                            },
                                        },
                                    }}
                                />
                                {/* Composant d'appel vidéo global */}
                                <VideoCallGlobal />
                            </VideoCallProvider>
                        </AuthProvider>
                    </QueryClientProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}
