import { useState } from 'react'

type Step = { id: string; title: string; done: boolean }
type Task = { id: string; title: string; steps: Step[] }

function TaskCard({
  task,
  onAddStep,
  onToggleStep,
}: {
  task: Task
  onAddStep: (title: string) => void
  onToggleStep: (stepId: string) => void
}) {
  const [stepText, setStepText] = useState('')
  const doneCount = task.steps.filter((s) => s.done).length
  const percent =
    task.steps.length === 0 ? 0 : Math.round((doneCount / task.steps.length) * 100)

  function submitStep() {
    onAddStep(stepText)
    setStepText('')
  }

  return (
    <li className="rounded-xl bg-white p-4 shadow">
      <h2 className="text-lg font-semibold">{task.title}</h2>

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

function App() {
  const [text, setText] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])

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
        <h1 className="mb-6 text-3xl font-bold text-indigo-600">TinySteps</h1>

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
            />
          ))}
        </ul>
      </div>
    </div>
  )
}

export default App