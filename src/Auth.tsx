import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setMessage('')
    const { error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else if (mode === 'signup')
      setMessage('Account created! If asked, check your email to confirm, then sign in.')
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-page p-8 text-ink">
      <div className="mx-auto max-w-sm rounded-2xl border border-line bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-3xl font-bold text-brand">TinySteps</h1>
        <p className="mb-6 text-sm text-muted">
          {mode === 'signin' ? 'Welcome back.' : 'Create your account.'}
        </p>

        <input
          className="mb-3 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="mb-3 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted"
          type="password"
          placeholder="Password (6+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />

        <button
          className="w-full rounded-lg bg-brand-solid py-2 text-white hover:opacity-90 disabled:opacity-50"
          onClick={submit}
          disabled={busy}
        >
          {mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>

        {message && <p className="mt-3 text-sm text-danger-ink">{message}</p>}

        <button
          className="mt-4 text-sm text-muted underline"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setMessage('')
          }}
        >
          {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}