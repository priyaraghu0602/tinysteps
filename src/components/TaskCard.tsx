import { useState } from 'react'
import type { Task } from '../types'
import { toLocalInput } from '../lib'

export default function TaskCard({
  task,
  onAddStep,
  onToggleStep,
  onFocus,
  onSetDue,
  onDeleteTask,
  onRenameTask,
  onDeleteStep,
  onRenameStep,
}: {
  task: Task
  onAddStep: (title: string) => void
  onToggleStep: (stepId: string) => void
  onFocus: () => void
  onSetDue: (value: string) => void
  onDeleteTask: () => void
  onRenameTask: (title: string) => void
  onDeleteStep: (stepId: string) => void
  onRenameStep: (stepId: string, title: string) => void
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

  function rename() {
    const title = window.prompt('Rename task', task.title)
    if (title !== null) onRenameTask(title)
  }

  function remove() {
    if (window.confirm(`Delete "${task.title}" and all its steps?`)) onDeleteTask()
  }

  return (
    <li className="rounded-xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold">{task.title}</h2>
        <div className="flex shrink-0 items-center gap-1">
          {hasOpenStep && (
            <button
              className="rounded-lg bg-brand-soft px-3 py-1 text-sm text-brand-ink hover:opacity-80"
              onClick={onFocus}
            >
              Focus
            </button>
          )}
          <button
            className="rounded-lg px-2 py-1 text-sm text-muted hover:text-ink"
            onClick={rename}
            aria-label="Rename task"
            title="Rename"
          >
            ✏️
          </button>
          <button
            className="rounded-lg px-2 py-1 text-sm text-muted hover:text-ink"
            onClick={remove}
            aria-label="Delete task"
            title="Delete"
          >
            🗑️
          </button>
        </div>
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
          <li key={step.id} className="flex items-center justify-between gap-2">
            <label className="flex min-w-0 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={step.done}
                onChange={() => onToggleStep(step.id)}
              />
              <span className={step.done ? 'text-muted line-through' : ''}>{step.title}</span>
            </label>
            <span className="flex shrink-0 gap-1 text-xs">
              <button
                className="px-1 text-muted hover:text-ink"
                aria-label="Rename step"
                title="Rename"
                onClick={() => {
                  const title = window.prompt('Rename step', step.title)
                  if (title !== null) onRenameStep(step.id, title)
                }}
              >
                ✏️
              </button>
              <button
                className="px-1 text-muted hover:text-ink"
                aria-label="Delete step"
                title="Delete"
                onClick={() => onDeleteStep(step.id)}
              >
                ✕
              </button>
            </span>
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