import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './supabase'
import type { Step, Task } from './types'
import { XP_PER_STEP } from './lib'

type StepRow = { id: string; title: string; done: boolean; position: number }
type TaskRow = { id: string; title: string; due_at: string | null; steps: StepRow[] }

type DataValue = {
  tasks: Task[]
  xp: number
  loading: boolean
  error: string
  dueTasks: Task[]
  permission: NotificationPermission
  addTask: (title: string) => Promise<void>
  addStep: (taskId: string, title: string) => Promise<void>
  toggleStep: (taskId: string, stepId: string) => Promise<void>
  setDue: (taskId: string, value: string) => Promise<void>
  enableReminders: () => Promise<void>
}

const DataContext = createContext<DataValue | null>(null)

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}

export function DataProvider({
  userId,
  children,
}: {
  userId: string
  children: ReactNode
}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [xp, setXp] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )
  const notified = useRef<Set<string>>(new Set())

  useEffect(() => {
    async function loadData() {
      const [tasksRes, profileRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, due_at, steps(id, title, done, position)')
          .order('created_at'),
        supabase.from('profiles').select('xp').maybeSingle(),
      ])
      const failure = tasksRes.error ?? profileRes.error
      if (failure) {
        setError(failure.message)
      } else {
        const rows = tasksRes.data as TaskRow[]
        setTasks(
          rows.map((t) => ({
            id: t.id,
            title: t.title,
            dueAt: t.due_at,
            steps: [...t.steps]
              .sort((a, b) => a.position - b.position)
              .map((s) => ({ id: s.id, title: s.title, done: s.done })),
          }))
        )
        setXp(profileRes.data?.xp ?? 0)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const dueTasks = tasks.filter(
    (t) =>
      t.dueAt &&
      new Date(t.dueAt).getTime() <= now &&
      (t.steps.length === 0 || t.steps.some((s) => !s.done))
  )

  useEffect(() => {
    if (permission !== 'granted') return
    for (const t of dueTasks) {
      if (notified.current.has(t.id + t.dueAt)) continue
      notified.current.add(t.id + t.dueAt)
      new Notification('TinySteps', { body: `Time to start: ${t.title}` })
    }
  })

  async function enableReminders() {
    if (!('Notification' in window)) return
    setPermission(await Notification.requestPermission())
  }

  async function addTask(title: string) {
    const clean = title.trim()
    if (clean === '') return
    const { data, error: err } = await supabase
      .from('tasks')
      .insert({ title: clean })
      .select('id, title, due_at')
      .single()
    if (err) {
      setError(err.message)
      return
    }
    setTasks((prev) => [
      ...prev,
      { id: data.id, title: data.title, dueAt: data.due_at, steps: [] },
    ])
  }

  async function addStep(taskId: string, title: string) {
    const clean = title.trim()
    if (clean === '') return
    const task = tasks.find((t) => t.id === taskId)
    const { data, error: err } = await supabase
      .from('steps')
      .insert({ task_id: taskId, title: clean, position: task?.steps.length ?? 0 })
      .select('id, title, done')
      .single()
    if (err) {
      setError(err.message)
      return
    }
    const newStep: Step = { id: data.id, title: data.title, done: data.done }
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, steps: [...t.steps, newStep] } : t))
    )
  }

  async function toggleStep(taskId: string, stepId: string) {
    const step = tasks.find((t) => t.id === taskId)?.steps.find((s) => s.id === stepId)
    if (!step) return
    const newDone = !step.done
    const newXp = Math.max(0, xp + (newDone ? XP_PER_STEP : -XP_PER_STEP))

    setXp(newXp)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              steps: t.steps.map((s) => (s.id === stepId ? { ...s, done: newDone } : s)),
            }
          : t
      )
    )

    const stepRes = await supabase
      .from('steps')
      .update({ done: newDone, done_at: newDone ? new Date().toISOString() : null })
      .eq('id', stepId)
    if (stepRes.error) setError(stepRes.error.message)
    const xpRes = await supabase.from('profiles').upsert({ user_id: userId, xp: newXp })
    if (xpRes.error) setError(xpRes.error.message)
  }

  async function setDue(taskId: string, value: string) {
    const iso = value ? new Date(value).toISOString() : null
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dueAt: iso } : t)))
    const { error: err } = await supabase.from('tasks').update({ due_at: iso }).eq('id', taskId)
    if (err) setError(err.message)
  }

  return (
    <DataContext.Provider
      value={{
        tasks,
        xp,
        loading,
        error,
        dueTasks,
        permission,
        addTask,
        addStep,
        toggleStep,
        setDue,
        enableReminders,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}