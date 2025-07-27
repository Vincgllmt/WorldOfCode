import { Providers } from '@/src/providers'
import { AdminAuthProvider } from '@/src/contexts/AdminAuthContext'
import { AdminLayoutShell } from '@/src/components/layout/AdminLayoutShell'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-black antialiased">
        <Providers>
          <AdminAuthProvider>
            <AdminLayoutShell>{children}</AdminLayoutShell>
          </AdminAuthProvider>
        </Providers>
      </body>
    </html>
  )
}
