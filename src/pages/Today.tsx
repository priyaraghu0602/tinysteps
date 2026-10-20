import { useState } from 'react'
import { useData } from '../DataContext'
import FocusView from '../components/FocusView'
import TaskCard from '../components/TaskCard'
import { formatDue } from '../lib'

export default function Today() {
  const { tasks, dueTasks, permission, addTask, addStep, toggleStep, setDue, enableReminders } =
    useData()
  const [text, setText] = useState('')
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const focusTask = tasks.find((t) => t.id === focusTaskId)

  function submitTask() {
    if (text.trim() === '') return
    addTask(text)
    setText('')
  }

  if (focusTask) {
    return (
      <FocusView
        key={focusTask.steps.find((s) => !s.done)?.id ?? 'all-done'}
        task={focusTask}
        onCompleteStep={(stepId) => toggleStep(focusTask.id, stepId)}
        onExit={() => setFocusTaskId(null)}
      />
    )
  }

  return (
    <>
      {permission === 'default' && (
        <button
          className="mb-4 w-full rounded-lg border border-line bg-card py-2 text-sm text-muted hover:text-ink"
          onClick={enableReminders}
        >
          🔔 Turn on reminders
        </button>
      )}

      {dueTasks.length > 0 && (
        <div className="mb-4 rounded-xl border border-warn-line bg-warn-bg p-4">
          <h2 className="mb-2 font-semibold text-warn-ink">Due now</h2>
          <ul className="space-y-2">
            {dueTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span>
                  {t.title}
                  {t.dueAt && (
                    <span className="block text-xs text-warn-ink">Due {formatDue(t.dueAt)}</span>
                  )}
                </span>
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
          className="flex-1 rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted"
          placeholder="What's on your mind?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitTask()}
        />
        <button
          className="rounded-lg bg-brand-solid px-4 py-2 text-white hover:opacity-90"
          onClick={submitTask}
        >
          Add
        </button>
      </div>

      <ul className="space-y-4">
        {tasks.filter((t) => !t.goalId).map((task) => (
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
  )
}