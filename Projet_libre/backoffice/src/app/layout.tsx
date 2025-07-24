import { AdminAuthProvider } from '@/contexts/AdminAuthContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-black antialiased">
          <AdminAuthProvider>
            {children}
          </AdminAuthProvider>
      </body>
    </html>
  )
}
