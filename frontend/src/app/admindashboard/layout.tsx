import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import * as authService from '@/services/authService'
import { AuthenticatedUser } from '@/interfaces/Authentification'
import { ReactNode } from 'react'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value


  if (!token) {
    return redirect('/login')
  }

  let user: AuthenticatedUser | null = null

  try {
    user = await authService.getMe(token)
  } catch (error) {
    console.error('Erreur récupération user', error)
    return redirect('/login')
  }

  if (user.role !== 'ROLE_ADMIN') {
    return redirect('/unauthorized')
  }

  return <>{children}</>
}
