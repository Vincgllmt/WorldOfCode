"use client"

import "./globals.css"
import { ReactNode, useMemo } from "react"
import { Toaster } from "react-hot-toast"
import { AdminAuthProvider } from "@/contexts/AdminAuthContext"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Geist, Geist_Mono } from "next/font/google"
import { usePathname } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AdminSidebar, AdminSidebarInset } from "@/components/layout/Sidebar"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const queryClient = new QueryClient()

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const hideSidebarOn = useMemo(() => ["/login"], [])
  const showSidebar = useMemo(
    () => !hideSidebarOn.some((r) => pathname === r || pathname?.startsWith(`${r}/`)),
    [pathname, hideSidebarOn]
  )

  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-gray-50 text-black antialiased`}>
        <QueryClientProvider client={queryClient}>
          <AdminAuthProvider>
            {showSidebar ? (
              <SidebarProvider defaultOpen>
                <div className="flex min-h-screen w-full">
                  <AdminSidebar />
                  <AdminSidebarInset>
                    <div className="container mx-auto p-6">{children}</div>
                  </AdminSidebarInset>
                </div>
              </SidebarProvider>
            ) : (
              <main className="min-h-screen">
                <div className="container mx-auto p-6">{children}</div>
              </main>
            )}
            <Toaster position="top-right" />
          </AdminAuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
