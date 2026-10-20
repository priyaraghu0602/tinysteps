import { useState } from 'react'
import { useData } from '../DataContext'
import FocusView from '../components/FocusView'
import TaskCard from '../components/TaskCard'
import type { Goal } from '../types'

function daysLeft(targetDate: string) {
  const target = new Date(targetDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function GoalCard({ goal, onFocus }: { goal: Goal; onFocus: (taskId: string) => void }) {
  const { tasks, addTask, addStep, toggleStep, setDue, toggleGoalAchieved, deleteGoal } =
    useData()
  const [milestoneText, setMilestoneText] = useState('')

  const milestones = tasks.filter((t) => t.goalId === goal.id)
  const totalSteps = milestones.reduce((n, t) => n + t.steps.length, 0)
  const doneSteps = milestones.reduce((n, t) => n + t.steps.filter((s) => s.done).length, 0)
  const percent = totalSteps === 0 ? 0 : Math.round((doneSteps / totalSteps) * 100)
  const left = goal.targetDate ? daysLeft(goal.targetDate) : null

  function submitMilestone() {
    if (milestoneText.trim() === '') return
    addTask(milestoneText, goal.id)
    setMilestoneText('')
  }

  function handleDelete() {
    if (window.confirm(`Delete "${goal.title}" and all its milestones and steps?`)) {
      deleteGoal(goal.id)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">
            {goal.achievedAt && '🏆 '}
            {goal.title}
          </h2>
          {goal.why && <p className="mt-1 text-sm italic text-muted">Why: {goal.why}</p>}
        </div>
        <button className="text-xs text-muted underline" onClick={handleDelete}>
          Delete
        </button>
      </div>

      <div className="mt-3 h-3 rounded-full bg-track">
        <div
          className="h-3 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-sm text-muted">
        <span>
          {doneSteps} of {totalSteps} steps · {percent}%
        </span>
        {left !== null && !goal.achievedAt && (
          <span>
            {left > 0
              ? `${left} day${left === 1 ? '' : 's'} left`
              : left === 0
                ? 'Target is today'
                : `${-left} day${left === -1 ? '' : 's'} past target`}
          </span>
        )}
      </div>

      <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-muted">
        Milestones
      </h3>
      {milestones.length === 0 && (
        <p className="mb-3 text-sm text-muted">
          Break the goal into a few chunks. What is the first milestone?
        </p>
      )}
      <ul className="space-y-3">
        {milestones.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onAddStep={(title) => addStep(task.id, title)}
            onToggleStep={(stepId) => toggleStep(task.id, stepId)}
            onFocus={() => onFocus(task.id)}
            onSetDue={(value) => setDue(task.id, value)}
          />
        ))}
      </ul>

      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-muted"
          placeholder="Add a milestone"
          value={milestoneText}
          onChange={(e) => setMilestoneText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitMilestone()}
        />
        <button
          className="rounded-lg bg-brand-solid px-4 py-2 text-sm text-white hover:opacity-90"
          onClick={submitMilestone}
        >
          Add
        </button>
      </div>

      {totalSteps > 0 && percent === 100 && !goal.achievedAt && (
        <button
          className="mt-4 w-full rounded-lg bg-amber-500 py-2 text-white hover:bg-amber-600"
          onClick={() => toggleGoalAchieved(goal.id)}
        >
          🎉 Mark goal as achieved
        </button>
      )}
      {goal.achievedAt && (
        <button
          className="mt-4 text-xs text-muted underline"
          onClick={() => toggleGoalAchieved(goal.id)}
        >
          Undo achieved
        </button>
      )}
    </section>
  )
}

export default function Goals() {
  const { tasks, goals, addGoal, toggleStep } = useData()
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const focusTask = tasks.find((t) => t.id === focusTaskId)

  function submitGoal() {
    if (title.trim() === '') return
    addGoal(title, why, targetDate)
    setTitle('')
    setWhy('')
    setTargetDate('')
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
      <div className="mb-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">New goal</h2>
        <input
          className="mb-2 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted"
          placeholder="What do you want to achieve?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="mb-2 w-full rounded-lg border border-line bg-card px-3 py-2 text-ink placeholder:text-muted"
          placeholder="Why does it matter to you? (optional)"
          value={why}
          onChange={(e) => setWhy(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <label htmlFor="goal-target" className="text-sm text-muted">
            Target date:
          </label>
          <input
            id="goal-target"
            type="date"
            className="rounded-lg border border-line bg-card px-2 py-1 text-ink"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
          <button
            className="ml-auto rounded-lg bg-brand-solid px-4 py-2 text-white hover:opacity-90"
            onClick={submitGoal}
          >
            Add goal
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {goals.length === 0 && (
          <p className="text-center text-muted">No goals yet. Start with one big thing. 🌱</p>
        )}
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onFocus={setFocusTaskId} />
        ))}
      </div>
    </>
  )
}