import { useState } from 'react'

function App() {
  const [text, setText] = useState('')
  const [tasks, setTasks] = useState<string[]>([])

  function addTask() {
    if (text.trim() === '') return
    setTasks([...tasks, text])
    setText('')
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
          />
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            onClick={addTask}
          >
            Add
          </button>
        </div>

        <ul className="space-y-2">
          {tasks.map((task, i) => (
            <li key={i} className="rounded-lg bg-white p-3 shadow">
              {task}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default App