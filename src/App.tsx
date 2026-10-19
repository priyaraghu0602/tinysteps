import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'
import Auth from './Auth'

type Step = { id: string; title: string; done: boolean }
type Task = { id: string; title: string; steps: Step[] }

const XP_PER_STEP = 10
const XP_PER_LEVEL = 50
const FOCUS_SECONDS = 5 * 60
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function formatTime(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
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
}: {
  task: Task
  onAddStep: (title: string) => void
  onToggleStep: (stepId: string) => void
  onFocus: () => void
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

function Tracker({ onSignOut }: { onSignOut: () => void }) {
  const [text, setText] = useState('')
  const [tasks, setTasks] = useState<Task[]>(() => load('tinysteps-tasks', []))
  const [xp, setXp] = useState<number>(() => load('tinysteps-xp', 0))
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  useEffect(() => {
  localStorage.setItem('tinysteps-tasks', JSON.stringify(tasks))
}, [tasks])

useEffect(() => {
  localStorage.setItem('tinysteps-xp', JSON.stringify(xp))
}, [xp])

  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const xpInLevel = xp % XP_PER_LEVEL
  const focusTask = tasks.find((t) => t.id === focusTaskId)

  function addTask() {
    if (text.trim() === '') return
    const newTask: Task = { id: crypto.randomUUID(), title: text.trim(), steps: [] }
    setTasks([...tasks, newTask])
    setText('')
  }

  function addStep(taskId: string, title: string) {
    if (title.trim() === '') return
    const newStep: Step = { id: crypto.randomUUID(), title: title.trim(), done: false }
    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, steps: [...t.steps, newStep] } : t))
    )
  }

  function toggleStep(taskId: string, stepId: string) {
    const step = tasks.find((t) => t.id === taskId)?.steps.find((s) => s.id === stepId)
    if (!step) return
    setXp(Math.max(0, xp + (step.done ? -XP_PER_STEP : XP_PER_STEP)))
    setTasks(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              steps: t.steps.map((s) =>
                s.id === stepId ? { ...s, done: !s.done } : s
              ),
            }
          : t
      )
    )
  }

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

        {focusTask ? (
          <FocusView
            key={focusTask.steps.find((s) => !s.done)?.id ?? 'all-done'}
            task={focusTask}
            onCompleteStep={(stepId) => toggleStep(focusTask.id, stepId)}
            onExit={() => setFocusTaskId(null)}
          />
        ) : (
          <>
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
  return <Tracker onSignOut={() => supabase.auth.signOut()} />
}

export default App