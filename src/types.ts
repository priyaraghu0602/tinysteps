export type Step = { id: string; title: string; done: boolean }
export type Task = { id: string; title: string; dueAt: string | null; steps: Step[] }