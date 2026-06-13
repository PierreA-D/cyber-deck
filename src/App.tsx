import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { HomePage }      from './pages/HomePage'
import { LoginPage }     from './pages/LoginPage'
import { RegisterPage }  from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { GameBoard }     from './components/GameBoard'
import { DecksPage } from './pages/DecksPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"          element={<HomePage />} />
      <Route path="/login"     element={<LoginPage />} />
      <Route path="/register"  element={<RegisterPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/game"      element={<ProtectedRoute><GameBoard /></ProtectedRoute>} />
      <Route path="/decks" element={<ProtectedRoute><DecksPage /></ProtectedRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}