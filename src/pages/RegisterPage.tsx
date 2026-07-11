import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { apiFetch } from '../lib/apiClient'
import { userSchema } from '../lib/schemas'

export function RegisterPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      await apiFetch('/api/auth/register', userSchema, {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      })
      navigate({ to: '/login' })
    } catch {
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,0,96,0.14),_transparent_35%),linear-gradient(180deg,#050508_0%,#090916_100%)] px-6 font-mono text-cyan-200">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-950/70 p-8 shadow-[0_0_60px_rgba(255,0,96,0.12)] backdrop-blur-xl md:p-12">
        <div className="mb-2 text-[10px] tracking-[0.32em] text-rose-400">
          CREATE NEW IDENTITY
        </div>
        <h2 className="mb-8 text-3xl font-normal tracking-[0.3em] text-cyan-100">
          REGISTER
        </h2>

        {error && (
          <div className="mb-5 rounded-md border border-rose-500/70 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}

        {[
          { label: 'USERNAME', value: username, set: setUsername, type: 'text' },
          { label: 'EMAIL',    value: email,    set: setEmail,    type: 'email' },
          { label: 'PASSWORD', value: password, set: setPassword, type: 'password' },
        ].map(({ label, value, set, type }) => (
          <div key={label} className="mb-4">
            <div className="mb-2 text-[11px] tracking-[0.22em] text-slate-500">
              {label}
            </div>
            <input
              type={type}
              value={value}
              onChange={e => set(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-cyan-100 outline-none transition placeholder:text-slate-600 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/30"
            />
          </div>
        ))}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mb-5 mt-4 w-full rounded-md border border-rose-500/80 bg-transparent px-4 py-4 text-sm tracking-[0.25em] text-rose-300 transition duration-200 hover:bg-rose-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/70 disabled:text-slate-500 disabled:hover:bg-slate-800/70 disabled:hover:text-slate-500"
        >
          {loading ? 'CREATING...' : 'CREATE IDENTITY'}
        </button>

        <div className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to='/login' className="text-cyan-300 transition hover:text-cyan-200 hover:underline">
            LOGIN
          </Link>
        </div>
      </div>
    </div>
  )
}