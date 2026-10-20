import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { useData } from '../DataContext'
import { XP_PER_STEP } from '../lib'

type View = 'week' | 'month' | 'year'

type Item = {
  id: string
  title: string
  taskTitle: string
  goalId: string | null
  doneAt: Date
  key: string
}

type TaskRef = { title: string; goal_id: string | null }
type Row = {
  id: string
  title: string
  done_at: string
  tasks: TaskRef | TaskRef[] | null
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function dayKey(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

function startOfWeek(d: Date) {
  const offset = (d.getDay() + 6) % 7
  return addDays(startOfDay(d), -offset)
}

function periodRange(view: View, anchor: Date): [Date, Date] {
  if (view === 'week') {
    const s = startOfWeek(anchor)
    return [s, addDays(s, 7)]
  }
  if (view === 'month') {
    return [
      new Date(anchor.getFullYear(), anchor.getMonth(), 1),
      new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
    ]
  }
  return [new Date(anchor.getFullYear(), 0, 1), new Date(anchor.getFullYear() + 1, 0, 1)]
}

function shiftAnchor(view: View, anchor: Date, delta: number) {
  if (view === 'week') return addDays(anchor, 7 * delta)
  if (view === 'month') return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1)
  return new Date(anchor.getFullYear() + delta, 0, 1)
}

function periodLabel(view: View, anchor: Date) {
  if (view === 'week') {
    const s = startOfWeek(anchor)
    const e = addDays(s, 6)
    const short = { day: 'numeric', month: 'short' } as const
    return `${s.toLocaleDateString([], short)} – ${e.toLocaleDateString([], { ...short, year: 'numeric' })}`
  }
  if (view === 'month') {
    return anchor.toLocaleDateString([], { month: 'long', year: 'numeric' })
  }
  return String(anchor.getFullYear())
}

function levelClass(n: number) {
  if (n === 0) return 'bg-track'
  if (n <= 2) return 'bg-emerald-500/30'
  if (n <= 5) return 'bg-emerald-500/55'
  if (n <= 9) return 'bg-emerald-500/80'
  return 'bg-emerald-500'
}

function DayDetails({
  date,
  list,
  goalTitle,
}: {
  date: Date
  list: Item[]
  goalTitle: (id: string | null) => string | undefined
}) {
  return (
    <div className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h3 className="font-semibold">
        {date.toLocaleDateString([], {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </h3>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing logged this day. Rest days count too.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((item) => {
            const goal = goalTitle(item.goalId)
            return (
              <li key={item.id} className="flex items-start gap-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-muted">
                  {item.doneAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
                <span>
                  ✓ {item.title}
                  <span className="block text-xs text-muted">
                    {item.taskTitle}
                    {goal ? ` · 🎯 ${goal}` : ''}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function Calendar() {
  const { goals } = useData()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('steps')
        .select('id, title, done_at, tasks(title, goal_id)')
        .eq('done', true)
        .not('done_at', 'is', null)
        .order('done_at')
      if (err) {
        setError(err.message)
      } else {
        const rows = (data ?? []) as unknown as Row[]
        setItems(
          rows.map((r) => {
            const t = Array.isArray(r.tasks) ? r.tasks[0] : r.tasks
            const doneAt = new Date(r.done_at)
            return {
              id: r.id,
              title: r.title,
              taskTitle: t?.title ?? '',
              goalId: t?.goal_id ?? null,
              doneAt,
              key: dayKey(doneAt),
            }
          })
        )
      }
      setLoading(false)
    }
    load()
  }, [])

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>()
    for (const item of items) {
      const list = map.get(item.key) ?? []
      list.push(item)
      map.set(item.key, list)
    }
    return map
  }, [items])

  const goalTitle = (id: string | null) => goals.find((g) => g.id === id)?.title

  function statsFor(range: [Date, Date]) {
    let steps = 0
    let activeDays = 0
    let best = 0
    let run = 0
    for (let d = range[0]; d < range[1]; d = addDays(d, 1)) {
      const n = byDay.get(dayKey(d))?.length ?? 0
      steps += n
      if (n > 0) {
        activeDays++
        run++
        best = Math.max(best, run)
      } else {
        run = 0
      }
    }
    return { steps, activeDays, best }
  }

  const range = periodRange(view, anchor)
  const prevRange = periodRange(view, shiftAnchor(view, anchor, -1))
  const stats = statsFor(range)
  const prevStats = statsFor(prevRange)
  const achieved = goals.filter((g) => {
    if (!g.achievedAt) return false
    const t = new Date(g.achievedAt)
    return t >= range[0] && t < range[1]
  })
  const periodWord = view

  const todayKey = dayKey(new Date())

  function changeView(v: View) {
    setView(v)
    setSelected(null)
  }

  function move(delta: number) {
    setAnchor(shiftAnchor(view, anchor, delta))
    setSelected(null)
  }

  function goToday() {
    setAnchor(new Date())
    setSelected(null)
  }

  if (loading) return <p className="text-muted">Loading your history…</p>

  const monthFirst = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const monthOffset = (monthFirst.getDay() + 6) % 7
  const monthDays = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
  const monthCells = Math.ceil((monthOffset + monthDays) / 7) * 7

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-track p-1">
          {(['week', 'month', 'year'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => changeView(v)}
              className={`rounded-md px-3 py-1 text-sm font-medium capitalize ${
                view === v ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous"
            onClick={() => move(-1)}
            className="rounded-lg border border-line px-3 py-1 text-muted hover:text-ink"
          >
            ‹
          </button>
          <span className="min-w-40 text-center text-sm font-semibold">
            {periodLabel(view, anchor)}
          </span>
          <button
            aria-label="Next"
            onClick={() => move(1)}
            className="rounded-lg border border-line px-3 py-1 text-muted hover:text-ink"
          >
            ›
          </button>
          <button
            onClick={goToday}
            className="rounded-lg border border-line px-3 py-1 text-sm text-muted hover:text-ink"
          >
            Today
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-danger-bg p-3 text-sm text-danger-ink">
          Something went wrong: {error}
        </p>
      )}

      <div className="mb-2 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Steps done', value: stats.steps },
          { label: 'XP earned', value: stats.steps * XP_PER_STEP },
          { label: 'Active days', value: stats.activeDays },
          { label: 'Longest run (days)', value: stats.best },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-card p-4 shadow-sm">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <p className="mb-6 text-sm text-muted">
        Last {periodWord}: {prevStats.steps} step{prevStats.steps === 1 ? '' : 's'} on{' '}
        {prevStats.activeDays} day{prevStats.activeDays === 1 ? '' : 's'}.
        {achieved.length > 0 && (
          <span className="ml-2">
            🏆 Goal{achieved.length === 1 ? '' : 's'} achieved: {achieved.map((g) => g.title).join(', ')}
          </span>
        )}
      </p>

      {view === 'week' && (
        <div className="grid gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(range[0], i)
            const key = dayKey(d)
            const list = byDay.get(key) ?? []
            return (
              <div
                key={key}
                className={`rounded-xl border bg-card p-3 shadow-sm ${
                  key === todayKey ? 'border-brand' : 'border-line'
                }`}
              >
                <p className="text-xs font-semibold uppercase text-muted">
                  {DAY_NAMES[i]} {d.getDate()}
                </p>
                <p className="mt-1 text-2xl font-bold">{list.length}</p>
                <ul className="mt-2 space-y-1">
                  {list.map((item) => (
                    <li key={item.id} className="text-xs text-muted" title={item.taskTitle}>
                      ✓ {item.title}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {view === 'month' && (
        <>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-muted">
            {DAY_NAMES.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: monthCells }, (_, i) => {
              const d = addDays(monthFirst, i - monthOffset)
              const inMonth = d.getMonth() === anchor.getMonth()
              const key = dayKey(d)
              const n = byDay.get(key)?.length ?? 0
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`h-16 rounded-lg p-1.5 text-left text-xs text-ink ${levelClass(n)} ${
                    inMonth ? '' : 'opacity-30'
                  } ${selected === key ? 'ring-2 ring-brand' : ''} ${
                    key === todayKey ? 'font-bold underline' : ''
                  }`}
                >
                  <span>{d.getDate()}</span>
                  {n > 0 && <span className="mt-1 block text-sm font-semibold">{n}</span>}
                </button>
              )
            })}
          </div>
        </>
      )}

      {view === 'year' && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 12 }, (_, m) => {
            const first = new Date(anchor.getFullYear(), m, 1)
            const offset = (first.getDay() + 6) % 7
            const days = new Date(anchor.getFullYear(), m + 1, 0).getDate()
            return (
              <div key={m} className="rounded-xl border border-line bg-card p-3 shadow-sm">
                <button
                  className="mb-2 text-sm font-semibold hover:underline"
                  onClick={() => {
                    setView('month')
                    setAnchor(first)
                    setSelected(null)
                  }}
                >
                  {first.toLocaleDateString([], { month: 'long' })}
                </button>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: offset }, (_, i) => (
                    <span key={`blank-${i}`} />
                  ))}
                  {Array.from({ length: days }, (_, i) => {
                    const d = new Date(anchor.getFullYear(), m, i + 1)
                    const key = dayKey(d)
                    const n = byDay.get(key)?.length ?? 0
                    return (
                      <button
                        key={key}
                        onClick={() => setSelected(key)}
                        title={`${d.toLocaleDateString()}: ${n} step${n === 1 ? '' : 's'}`}
                        aria-label={`${d.toLocaleDateString()}: ${n} steps`}
                        className={`h-5 rounded-sm ${levelClass(n)} ${
                          selected === key ? 'ring-2 ring-brand' : ''
                        }`}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view !== 'week' && selected && (
        <DayDetails
          date={parseKey(selected)}
          list={byDay.get(selected) ?? []}
          goalTitle={goalTitle}
        />
      )}
    </div>
  )
}