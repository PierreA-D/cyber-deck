import { useState, useCallback, type ReactNode, useEffect } from 'react'
import { AuthContext, type User } from './AuthContextValue'
import { setUnauthorizedHandler } from '../lib/apiClient'
import { userSchema } from '../lib/schemas'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token')
  )
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user')
    if (!stored) return null
    try {
      const parsed = userSchema.safeParse(JSON.parse(stored))
      return parsed.success ? parsed.data : null
    } catch {
      return null
    }
  })

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
