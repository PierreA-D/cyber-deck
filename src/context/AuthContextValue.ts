import { createContext } from 'react'

export interface User {
  id: number
  email: string
  username: string
  totalWins: number
  winsStreak: number
}

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextType | null>(null)