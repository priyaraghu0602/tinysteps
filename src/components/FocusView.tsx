import { useEffect, useState } from 'react'
import type { Task } from '../types'
import { FOCUS_SECONDS, XP_PER_STEP, formatTime } from '../lib'

export default function FocusView({
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
    <div className="rounded-2xl border border-line bg-card p-8 text-center shadow-sm">
      <p className="text-sm uppercase tracking-wide text-muted">{task.title}</p>

      {step ? (
        <>
          <h2 className="mt-4 text-2xl font-bold">{step.title}</h2>

          {secondsLeft === null ? (
            <button
              className="mt-6 rounded-xl bg-brand-solid px-6 py-3 text-lg text-white hover:opacity-90"
              onClick={() => setSecondsLeft(FOCUS_SECONDS)}
            >
              Start 5 minutes
            </button>
          ) : secondsLeft > 0 ? (
            <p className="mt-6 font-mono text-5xl">{formatTime(secondsLeft)}</p>
          ) : (
            <p className="mt-6 text-lg text-emerald-500">5 minutes done! Nice work. 🎉</p>
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

      <button className="mt-6 text-sm text-muted underline" onClick={onExit}>
        Back to all tasks
      </button>
    </div>
  )
}