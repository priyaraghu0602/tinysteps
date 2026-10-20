import { useState } from 'react'
import type { Task } from '../types'
import { toLocalInput } from '../lib'

export default function TaskCard({
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
    <li className="rounded-xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{task.title}</h2>
        {hasOpenStep && (
          <button
            className="rounded-lg bg-brand-soft px-3 py-1 text-sm text-brand-ink hover:opacity-80"
            onClick={onFocus}
          >
            Focus
          </button>
        )}
      </div>

      <div className="mt-2 h-2 rounded-full bg-track">
        <div
          className="h-2 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-sm text-muted">
        {doneCount} of {task.steps.length} steps done
      </p>

      <div className="mt-3 flex items-center gap-2 text-sm text-muted">
        <label htmlFor={`due-${task.id}`}>Due:</label>
        <input
          id={`due-${task.id}`}
          type="datetime-local"
          className="rounded-lg border border-line bg-card px-2 py-1 text-ink"
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
              <span className={step.done ? 'text-muted line-through' : ''}>
                {step.title}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-line bg-card px-3 py-1 text-sm text-ink placeholder:text-muted"
          placeholder="What's the tiniest next step?"
          value={stepText}
          onChange={(e) => setStepText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitStep()}
        />
        <button
          className="rounded-lg bg-ink px-3 py-1 text-sm text-page hover:opacity-80"
          onClick={submitStep}
        >
          Add step
        </button>
      </div>
    </li>
  )
}
