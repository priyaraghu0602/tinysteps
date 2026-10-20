import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { supabase } from './supabase'
import Auth from './Auth'
import { DataProvider } from './DataContext'
import Layout from './Layout'
import Today from './pages/Today'
import Goals from './pages/Goals'
import Calendar from './pages/Calendar'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return <p className="p-8 text-muted">Loading…</p>
  if (!session) return <Auth />

  return (
    <BrowserRouter>
      <DataProvider key={session.user.id} userId={session.user.id}>
        <Routes>
          <Route element={<Layout onSignOut={() => supabase.auth.signOut()} />}>
            <Route index element={<Today />} />
            <Route path="goals" element={<Goals />} />
            <Route path="calendar" element={<Calendar />} />
          </Route>
        </Routes>
      </DataProvider>
    </BrowserRouter>
  )
}