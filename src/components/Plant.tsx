import { useState } from 'react'
import { XP_PER_STEP } from '../lib'

const STAGES = [
  { name: 'Seed', min: 0, message: 'Every plant starts as a seed. Finish one tiny step to wake it up.' },
  { name: 'Sprout', min: 10, message: 'A sprout! You started, and that is the hardest part.' },
  { name: 'Seedling', min: 50, message: 'Growing steadily, one tiny step at a time.' },
  { name: 'Young plant', min: 120, message: 'Look at those leaves. Your effort is adding up.' },
  { name: 'Budding', min: 250, message: 'A bud is forming. Something good is on the way.' },
  { name: 'In bloom', min: 400, message: 'In full bloom! Look how far you have come. 🌸' },
]

const HEIGHTS = [0, 22, 48, 74, 88, 96]
const PAIRS = [0, 1, 2, 3, 3, 3]
const GROUND = 144

function getInfo(xp: number) {
  let stage = 0
  STAGES.forEach((s, i) => {
    if (xp >= s.min) stage = i
  })
  const current = STAGES[stage]
  const next = STAGES[stage + 1]
  const percent = next ? ((xp - current.min) / (next.min - current.min)) * 100 : 100
  const stepsToNext = next ? Math.ceil((next.min - xp) / XP_PER_STEP) : 0
  return { stage, current, next, percent, stepsToNext }
}

function PlantDrawing({ stage, className }: { stage: number; className: string }) {
  const h = HEIGHTS[stage]
  const topY = GROUND - h
  const pairs = PAIRS[stage]
  const leafSize = 9 + stage * 1.5

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={`Your plant: ${STAGES[stage].name}`}
    >
      {h > 0 && (
        <line
          x1="100"
          y1={GROUND}
          x2="100"
          y2={topY}
          stroke="#16a34a"
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}

      {Array.from({ length: pairs }, (_, k) => {
        const y = topY + 4 + (k * (h - 10)) / pairs
        return (
          <g key={k}>
            <ellipse
              cx={100 - leafSize}
              cy={y}
              rx={leafSize}
              ry={leafSize * 0.5}
              transform={`rotate(-25 ${100 - leafSize} ${y})`}
              fill="#4ade80"
            />
            <ellipse
              cx={100 + leafSize}
              cy={y}
              rx={leafSize}
              ry={leafSize * 0.5}
              transform={`rotate(25 ${100 + leafSize} ${y})`}
              fill="#22c55e"
            />
          </g>
        )
      })}

      {stage === 0 && <ellipse cx="100" cy="141" rx="5" ry="3.5" fill="#a16207" />}

      {stage === 4 && <ellipse cx="100" cy={topY - 7} rx="6" ry="9" fill="#f472b6" />}

      {stage === 5 && (
        <g>
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <circle
              key={angle}
              cx={100 + 12 * Math.cos((angle * Math.PI) / 180)}
              cy={topY - 8 + 12 * Math.sin((angle * Math.PI) / 180)}
              r="8"
              fill="#f472b6"
            />
          ))}
          <circle cx="100" cy={topY - 8} r="7" fill="#fbbf24" />
        </g>
      )}

      <ellipse cx="100" cy="146" rx="32" ry="5" fill="#5b3a29" />
      <path d="M68 146 h64 l-8 42 h-48 z" fill="#c2764a" />
      <rect x="62" y="142" width="76" height="10" rx="3" fill="#a85f3a" />
    </svg>
  )
}

export default function Plant({ xp }: { xp: number }) {
  const { stage, current, next, percent, stepsToNext } = getInfo(xp)

  return (
    <div className="rounded-2xl border border-line bg-card p-5 text-center shadow-sm">
      <PlantDrawing
        key={stage}
        stage={stage}
        className="mx-auto h-44 w-44 animate-[pop_0.6s_ease-out]"
      />
      <p className="mt-1 font-semibold">{current.name}</p>
      <p className="mt-1 text-sm text-muted">{current.message}</p>
      {next ? (
        <>
          <div className="mt-3 h-2 rounded-full bg-track">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            {stepsToNext} more step{stepsToNext === 1 ? '' : 's'} until {next.name}
          </p>
        </>
      ) : (
        <p className="mt-3 text-xs text-muted">Fully grown. Keep it blooming!</p>
      )}
    </div>
  )
}

export function PlantFloating({ xp }: { xp: number }) {
  const [open, setOpen] = useState(false)
  const { stage } = getInfo(xp)

  return (
    <div className="fixed bottom-4 right-4 z-20 lg:hidden">
      {open && (
        <div className="mb-3 w-64">
          <Plant xp={xp} />
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Hide plant' : 'Show plant'}
        className="ml-auto block rounded-full border border-line bg-card p-1 shadow-lg"
      >
        <PlantDrawing key={stage} stage={stage} className="h-16 w-16 animate-[pop_0.6s_ease-out]" />
      </button>
    </div>
  )
}
