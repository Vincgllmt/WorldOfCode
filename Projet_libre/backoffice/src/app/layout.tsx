'use client'

import './globals.css'
import { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import { AdminAuthProvider } from '@/contexts/AdminAuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Geist, Geist_Mono } from 'next/font/google'

// Fonts
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const queryClient = new QueryClient()

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-gray-50 text-black antialiased`}>
        <QueryClientProvider client={queryClient}>
          <AdminAuthProvider>
            {children}
            <Toaster position="top-right" />
          </AdminAuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
