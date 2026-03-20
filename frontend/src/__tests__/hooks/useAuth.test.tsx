import { renderHook } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'
import { AuthContext } from '@/contexts/AuthContext'
import type { AuthContextType } from '@/interfaces/AuthContext'
import type { ReactNode } from 'react'

const mockContext: AuthContextType = {
  user: { id: 1, username: 'testuser', token: 'jwt', role: 'ROLE_USER', creationDate: '', updatedDate: '' },
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  loginSilent: jest.fn(),
  verify2FA: jest.fn(),
  logout: jest.fn(),
  setUserTheme: jest.fn(),
  setUserAvatar: jest.fn(),
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthContext.Provider value={mockContext}>
    {children}
  </AuthContext.Provider>
)

describe('useAuth', () => {
  it('retourne le contexte quand utilisé dans un AuthProvider', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toEqual(mockContext.user)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(typeof result.current.login).toBe('function')
    expect(typeof result.current.logout).toBe('function')
    expect(typeof result.current.verify2FA).toBe('function')
  })

  it('lance une erreur si utilisé en dehors d\'un AuthProvider', () => {
    // Supprimer temporairement console.error pour éviter le bruit
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')

    spy.mockRestore()
  })
})
