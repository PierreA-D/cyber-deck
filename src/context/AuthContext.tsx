import { useState, useCallback, type ReactNode, useEffect } from 'react'
import { AuthContext, type User } from './AuthContextValue'
import { setUnauthorizedHandler } from '../lib/apiClient'
import { userSchema } from '../lib/schemas'

const MAX_TIMEOUT = 2 ** 31 - 1

function getTokenExpiry(token: string): number | null {
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const data = JSON.parse(json)
    return typeof data.exp === 'number' ? data.exp * 1000 : null
  } catch {
    return null
  }
}

function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token)
  return expiry !== null && Date.now() >= expiry
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem('token')
    if (stored && isTokenExpired(stored)) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return null
    }
    return stored
  })
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

  useEffect(() => {
    if (!token) return
    const expiry = getTokenExpiry(token)
    if (expiry === null) return
    const delay = expiry - Date.now()
    if (delay <= 0) {
      logout()
      return
    }
    if (delay > MAX_TIMEOUT) return
    const id = setTimeout(logout, delay)
    return () => clearTimeout(id)
  }, [token, logout])

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
