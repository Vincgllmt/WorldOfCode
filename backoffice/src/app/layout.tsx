"use client"

import "./globals.css"
import { ReactNode, useMemo } from "react"
import { Toaster } from "react-hot-toast"
import { AdminAuthProvider } from "@/contexts/AdminAuthContext"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outfit, Fira_Code } from "next/font/google"
import { usePathname } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AdminSidebar, AdminSidebarInset } from "@/components/layout/Sidebar"
import { ThemeProvider } from "@/components/providers/ThemeProvider"

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
})

const firaCode = Fira_Code({
  variable: "--font-fira",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
})

const queryClient = new QueryClient()

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const hideSidebarOn = useMemo(() => ["/login"], [])
  const showSidebar = useMemo(
    () => !hideSidebarOn.some((r) => pathname === r || pathname?.startsWith(`${r}/`)),
    [pathname, hideSidebarOn]
  )

  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${outfit.variable} ${firaCode.variable} antialiased`}>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AdminAuthProvider>
              {showSidebar ? (
                <SidebarProvider defaultOpen>
                  <div className="flex min-h-screen w-full">
                    <AdminSidebar />
                    <AdminSidebarInset>
                      <div className="container mx-auto p-6 animate-fade-up">{children}</div>
                    </AdminSidebarInset>
                  </div>
                </SidebarProvider>
              ) : (
                <main>{children}</main>
              )}
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontSize: "0.875rem",
                  },
                }}
              />
            </AdminAuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
