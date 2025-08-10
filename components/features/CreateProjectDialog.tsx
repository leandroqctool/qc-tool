"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateProjectDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function createProject() {
    setLoading(true)
    setError(null)
    if (name.trim().length < 3) {
      setLoading(false)
      setError('Name must be at least 3 characters')
      return
    }
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to create project')
      return
    }
    setOpen(false)
    setName('')
    setDescription('')
    onCreated?.()
    router.refresh()
  }

  return (
    <div>
      <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-lg bg-[#0D99FF] text-white hover:bg-[#0B87E5] text-sm">New Project</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="w-full max-w-md rounded-2xl bg-white shadow p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Create Project</h3>
            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">{error}</div>}
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]" rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={createProject} disabled={loading} className="px-4 py-2 rounded-lg bg-[#0D99FF] text-white hover:bg-[#0B87E5] text-sm disabled:opacity-60">{loading ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


