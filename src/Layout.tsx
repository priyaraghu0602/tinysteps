import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useData } from './DataContext'
import { XP_PER_LEVEL } from './lib'
import Plant, { PlantFloating } from './components/Plant'

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('tinysteps-theme', next ? 'dark' : 'light')
    } catch {
      // storage unavailable: the theme just won't be remembered
    }
  }

  return { dark, toggle }
}

export default function Layout({ onSignOut }: { onSignOut: () => void }) {
  const { xp, loading, error } = useData()
  const { dark, toggle } = useTheme()

  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpInLevel = xp % XP_PER_LEVEL

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${
      isActive ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:text-ink'
    }`

  return (
    <div className="min-h-screen bg-page text-ink">
      <div className="mx-auto max-w-[1600px] p-6">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand">TinySteps</h1>
            <div className="mt-1 flex gap-3 text-xs text-muted">
              <button className="underline" onClick={toggle}>
                {dark ? '☀️ Light mode' : '🌙 Dark mode'}
              </button>
              <button className="underline" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          </div>
          <div className="w-32 text-right">
            <p className="text-sm font-semibold">Level {level}</p>
            <div className="mt-1 h-2 rounded-full bg-track">
              <div
                className="h-2 rounded-full bg-amber-400 transition-all"
                style={{ width: `${(xpInLevel / XP_PER_LEVEL) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">{xp} XP</p>
          </div>
        </header>

        <nav className="mb-6 flex gap-2">
          <NavLink to="/" end className={linkClass}>
            Today
          </NavLink>
          <NavLink to="/goals" className={linkClass}>
            Goals
          </NavLink>
          <NavLink to="/calendar" className={linkClass}>
            Calendar
          </NavLink>
        </nav>

        {error && (
          <p className="mb-4 rounded-lg bg-danger-bg p-3 text-sm text-danger-ink">
            Something went wrong: {error}
          </p>
        )}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
          <main>{loading ? <p className="text-muted">Loading your tasks…</p> : <Outlet />}</main>
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <Plant xp={xp} />
            </div>
          </aside>
        </div>
      </div>

      <PlantFloating xp={xp} />
    </div>
  )
}
