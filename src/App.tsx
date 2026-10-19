import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'
import Auth from './Auth'

type Step = { id: string; title: string; done: boolean }
type Task = { id: string; title: string; dueAt: string | null; steps: Step[] }

const XP_PER_STEP = 10
const XP_PER_LEVEL = 50
const FOCUS_SECONDS = 5 * 60


function formatTime(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDue(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function FocusView({
  task,
  onCompleteStep,
  onExit,
}: {
  task: Task
  onCompleteStep: (stepId: string) => void
  onExit: () => void
}) {
  const step = task.steps.find((s) => !s.done)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return
    const id = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000)
    return () => clearTimeout(id)
  }, [secondsLeft])

  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow">
      <p className="text-sm uppercase tracking-wide text-slate-400">{task.title}</p>

      {step ? (
        <>
          <h2 className="mt-4 text-2xl font-bold">{step.title}</h2>

          {secondsLeft === null ? (
            <button
              className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 text-lg text-white hover:bg-indigo-700"
              onClick={() => setSecondsLeft(FOCUS_SECONDS)}
            >
              Start 5 minutes
            </button>
          ) : secondsLeft > 0 ? (
            <p className="mt-6 font-mono text-5xl">{formatTime(secondsLeft)}</p>
          ) : (
            <p className="mt-6 text-lg text-emerald-600">
              5 minutes done! Nice work. 🎉
            </p>
          )}

          <div className="mt-6">
            <button
              className="rounded-xl bg-emerald-500 px-6 py-3 text-white hover:bg-emerald-600"
              onClick={() => onCompleteStep(step.id)}
            >
              Done (+{XP_PER_STEP} XP)
            </button>
          </div>
        </>
      ) : (
        <p className="mt-4 text-xl">All steps done 🎉</p>
      )}

      <button
        className="mt-6 text-sm text-slate-500 underline"
        onClick={onExit}
      >
        Back to all tasks
      </button>
    </div>
  )
}

function TaskCard({
  task,
  onAddStep,
  onToggleStep,
  onFocus,
  onSetDue,
}: {
  task: Task
  onAddStep: (title: string) => void
  onToggleStep: (stepId: string) => void
  onFocus: () => void
  onSetDue: (value: string) => void
}) {
  const [stepText, setStepText] = useState('')
  const doneCount = task.steps.filter((s) => s.done).length
  const percent =
    task.steps.length === 0 ? 0 : Math.round((doneCount / task.steps.length) * 100)
  const hasOpenStep = task.steps.some((s) => !s.done)
 
  function submitStep() {
    onAddStep(stepText)
    setStepText('')
  }

  return (
    <li className="rounded-xl bg-white p-4 shadow">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{task.title}</h2>
        {hasOpenStep && (
          <button
            className="rounded-lg bg-indigo-100 px-3 py-1 text-sm text-indigo-700 hover:bg-indigo-200"
            onClick={onFocus}
          >
            Focus
          </button>
        )}
      </div>

      <div className="mt-2 h-2 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {doneCount} of {task.steps.length} steps done
      </p>
      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
  <label htmlFor={`due-${task.id}`}>Due:</label>
  <input
    id={`due-${task.id}`}
    type="datetime-local"
    className="rounded-lg border border-slate-300 px-2 py-1"
    value={toLocalInput(task.dueAt)}
    onChange={(e) => onSetDue(e.target.value)}
  />
</div>

      <ul className="mt-3 space-y-1">
        {task.steps.map((step) => (
          <li key={step.id}>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={step.done}
                onChange={() => onToggleStep(step.id)}
              />
              <span className={step.done ? 'text-slate-400 line-through' : ''}>
                {step.title}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1 text-sm"
          placeholder="What's the tiniest next step?"
          value={stepText}
          onChange={(e) => setStepText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitStep()}
        />
        <button
          className="rounded-lg bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
          onClick={submitStep}
        >
          Add step
        </button>
      </div>
    </li>
  )
}

type StepRow = { id: string; title: string; done: boolean; position: number }
type TaskRow = { id: string; title: string; due_at: string | null; steps: StepRow[] }

function Tracker({ userId, onSignOut }: { userId: string; onSignOut: () => void }) {
  const [text, setText] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [xp, setXp] = useState(0)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const [now, setNow] = useState(() => Date.now())
const [permission, setPermission] = useState<NotificationPermission>(
  'Notification' in window ? Notification.permission : 'denied'
)
const notified = useRef<Set<string>>(new Set())

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
  setPermission(await Notification.requestPermission())
}

  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpInLevel = xp % XP_PER_LEVEL
  const focusTask = tasks.find((t) => t.id === focusTaskId)

  async function addTask() {
    const title = text.trim()
    if (title === '') return
    setText('')
    const { data, error } = await supabase
      .from('tasks')
      .insert({ title })
      .select('id, title, due_at')
      .single()
    if (error) {
      setError(error.message)
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
    const { data, error } = await supabase
      .from('steps')
      .insert({ task_id: taskId, title: clean, position: task?.steps.length ?? 0 })
      .select('id, title, done')
      .single()
    if (error) {
      setError(error.message)
      return
    }
    const newStep: Step = { id: data.id, title: data.title, done: data.done }
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, steps: [...t.steps, newStep] } : t))
    )
  }

  async function setDue(taskId: string, value: string) {
  const iso = value ? new Date(value).toISOString() : null
  setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dueAt: iso } : t)))
  const { error } = await supabase.from('tasks').update({ due_at: iso }).eq('id', taskId)
  if (error) setError(error.message)
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

    const stepRes = await supabase.from('steps').update({ done: newDone }).eq('id', stepId)
    if (stepRes.error) setError(stepRes.error.message)
    const xpRes = await supabase.from('profiles').upsert({ user_id: userId, xp: newXp })
    if (xpRes.error) setError(xpRes.error.message)
  }

  if (loading) return <p className="p-8 text-slate-500">Loading your tasks…</p>

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-indigo-600">TinySteps</h1>
            <button className="text-xs text-slate-500 underline" onClick={onSignOut}>
              Sign out
            </button>
          </div>
          <div className="w-32 text-right">
            <p className="text-sm font-semibold">Level {level}</p>
            <div className="mt-1 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-amber-400 transition-all"
                style={{ width: `${(xpInLevel / XP_PER_LEVEL) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">{xp} XP</p>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            Something went wrong: {error}
          </p>
        )}

        {focusTask ? (
          <FocusView
            key={focusTask.steps.find((s) => !s.done)?.id ?? 'all-done'}
            task={focusTask}
            onCompleteStep={(stepId) => toggleStep(focusTask.id, stepId)}
            onExit={() => setFocusTaskId(null)}
          />
        ) : (
          <>
            {permission === 'default' && (
              <button
                className="mb-4 w-full rounded-lg bg-slate-100 py-2 text-sm text-slate-700 hover:bg-slate-200"
                onClick={enableReminders}
              >
                🔔 Turn on reminders
              </button>
            )}

            {dueTasks.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                <h2 className="mb-2 font-semibold text-amber-800">Due now</h2>
                <ul className="space-y-2">
                  {dueTasks.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2">
                      <span>{t.title}</span>
                      <button
                        className="rounded-lg bg-amber-500 px-3 py-1 text-sm text-white hover:bg-amber-600"
                        onClick={() => setFocusTaskId(t.id)}
                      >
                        Start
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-4 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                placeholder="What's on your mind?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
              />
              <button
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                onClick={addTask}
              >
                Add
              </button>
            </div>

            <ul className="space-y-4">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onAddStep={(title) => addStep(task.id, title)}
                  onToggleStep={(stepId) => toggleStep(task.id, stepId)}
                  onFocus={() => setFocusTaskId(task.id)}
                  onSetDue={(value) => setDue(task.id, value)}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

function App() {
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

  if (loading) return <p className="p-8 text-slate-500">Loading…</p>
  if (!session) return <Auth />
return (
  <Tracker
    key={session.user.id}
    userId={session.user.id}
    onSignOut={() => supabase.auth.signOut()}
  />
)
}

export default App