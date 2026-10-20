import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './supabase'
import type { Goal, Step, Task } from './types'
import { XP_PER_STEP } from './lib'

type StepRow = { id: string; title: string; done: boolean; position: number }
type TaskRow = {
  id: string
  title: string
  due_at: string | null
  goal_id: string | null
  steps: StepRow[]
}
type GoalRow = {
  id: string
  title: string
  why: string | null
  target_date: string | null
  achieved_at: string | null
}

type DataValue = {
  tasks: Task[]
  goals: Goal[]
  xp: number
  loading: boolean
  error: string
  dueTasks: Task[]
  permission: NotificationPermission
  addTask: (title: string, goalId?: string) => Promise<void>
  addStep: (taskId: string, title: string) => Promise<void>
  toggleStep: (taskId: string, stepId: string) => Promise<void>
  setDue: (taskId: string, value: string) => Promise<void>
  addGoal: (title: string, why: string, targetDate: string) => Promise<void>
  toggleGoalAchieved: (goalId: string) => Promise<void>
  deleteGoal: (goalId: string) => Promise<void>
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
  const [goals, setGoals] = useState<Goal[]>([])
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
      const [tasksRes, goalsRes, profileRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, due_at, goal_id, steps(id, title, done, position)')
          .order('created_at'),
        supabase
          .from('goals')
          .select('id, title, why, target_date, achieved_at')
          .order('created_at'),
        supabase.from('profiles').select('xp').maybeSingle(),
      ])
      const failure = tasksRes.error ?? goalsRes.error ?? profileRes.error
      if (failure) {
        setError(failure.message)
      } else {
        const taskRows = tasksRes.data as TaskRow[]
        setTasks(
          taskRows.map((t) => ({
            id: t.id,
            title: t.title,
            dueAt: t.due_at,
            goalId: t.goal_id,
            steps: [...t.steps]
              .sort((a, b) => a.position - b.position)
              .map((s) => ({ id: s.id, title: s.title, done: s.done })),
          }))
        )
        const goalRows = goalsRes.data as GoalRow[]
        setGoals(
          goalRows.map((g) => ({
            id: g.id,
            title: g.title,
            why: g.why,
            targetDate: g.target_date,
            achievedAt: g.achieved_at,
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

  async function addTask(title: string, goalId?: string) {
    const clean = title.trim()
    if (clean === '') return
    const { data, error: err } = await supabase
      .from('tasks')
      .insert({ title: clean, goal_id: goalId ?? null })
      .select('id, title, due_at, goal_id')
      .single()
    if (err) {
      setError(err.message)
      return
    }
    setTasks((prev) => [
      ...prev,
      {
        id: data.id,
        title: data.title,
        dueAt: data.due_at,
        goalId: data.goal_id,
        steps: [],
      },
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

  async function addGoal(title: string, why: string, targetDate: string) {
    const clean = title.trim()
    if (clean === '') return
    const { data, error: err } = await supabase
      .from('goals')
      .insert({
        title: clean,
        why: why.trim() === '' ? null : why.trim(),
        target_date: targetDate === '' ? null : targetDate,
      })
      .select('id, title, why, target_date, achieved_at')
      .single()
    if (err) {
      setError(err.message)
      return
    }
    setGoals((prev) => [
      ...prev,
      {
        id: data.id,
        title: data.title,
        why: data.why,
        targetDate: data.target_date,
        achievedAt: data.achieved_at,
      },
    ])
  }

  async function toggleGoalAchieved(goalId: string) {
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) return
    const value = goal.achievedAt ? null : new Date().toISOString()
    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, achievedAt: value } : g)))
    const { error: err } = await supabase
      .from('goals')
      .update({ achieved_at: value })
      .eq('id', goalId)
    if (err) setError(err.message)
  }

  async function deleteGoal(goalId: string) {
    const { error: err } = await supabase.from('goals').delete().eq('id', goalId)
    if (err) {
      setError(err.message)
      return
    }
    setGoals((prev) => prev.filter((g) => g.id !== goalId))
    setTasks((prev) => prev.filter((t) => t.goalId !== goalId))
  }

  return (
    <DataContext.Provider
      value={{
        tasks,
        goals,
        xp,
        loading,
        error,
        dueTasks,
        permission,
        addTask,
        addStep,
        toggleStep,
        setDue,
        addGoal,
        toggleGoalAchieved,
        deleteGoal,
        enableReminders,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}