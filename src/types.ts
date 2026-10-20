export type Step = { id: string; title: string; done: boolean }
export type Task = {
  id: string
  title: string
  dueAt: string | null
  goalId: string | null
  steps: Step[]
}
export type Goal = {
  id: string
  title: string
  why: string | null
  targetDate: string | null
  achievedAt: string | null
}