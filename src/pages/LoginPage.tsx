import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useAuth } from '../context/useAuth'
import { apiFetch } from '../lib/apiClient'
import { userSchema, loginResponseSchema } from '../lib/schemas'

export function LoginPage() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const { token } = await apiFetch('/api/auth/login', loginResponseSchema, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })

      const user = await apiFetch('/api/auth/me', userSchema, { token })

      login(token, user)
      navigate({ to: '/dashboard' })
    } catch (err) {
      if (err instanceof Error && err.message === 'Non autorisé') {
        setError('Invalid credentials.')
      } else {
        setError('Connection error. Is the server running?')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(0,229,255,0.16),_transparent_38%),linear-gradient(180deg,#050508_0%,#090916_100%)] px-6 font-mono text-cyan-200">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-cyan-400/40 bg-slate-950/70 p-8 shadow-[0_0_60px_rgba(0,229,255,0.12)] backdrop-blur-xl md:p-12">
        <div className="mb-2 text-[10px] tracking-[0.32em] text-rose-400">
          AUTHENTICATION REQUIRED
        </div>
        <h2 className="mb-8 text-3xl font-normal tracking-[0.3em] text-cyan-100">
          LOGIN
        </h2>

        {error && (
          <div className="mb-5 rounded-md border border-rose-500/70 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="mb-4">
          <div className="mb-2 text-[11px] tracking-[0.22em] text-slate-500">USERNAME</div>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-cyan-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          />
        </div>

        <div className="mb-8">
          <div className="mb-2 text-[11px] tracking-[0.22em] text-slate-500">PASSWORD</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-cyan-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mb-5 w-full rounded-md border border-cyan-400/80 bg-transparent px-4 py-4 text-sm tracking-[0.25em] text-cyan-200 transition duration-200 hover:bg-cyan-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/70 disabled:text-slate-500 disabled:hover:bg-slate-800/70 disabled:hover:text-slate-500"
        >
          {loading ? 'CONNECTING...' : 'ACCESS SYSTEM'}
        </button>

        <div className="text-center text-sm text-slate-500">
          No account?{' '}
          <Link to='/register' className="text-rose-400 transition hover:text-rose-300 hover:underline">
            REGISTER
          </Link>
        </div>
      </div>
    </div>
  )
}